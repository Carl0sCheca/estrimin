import fs from "fs";
import path from "path";
import { getDurationMP4, getDateFromFileName } from "@/lib/utils-server";
import { exec } from "child_process";
import { promisify } from "util";
import {
  deleteFile,
  downloadFile,
  listRecordingFilesS3,
  uploadFile,
} from "./services/s3.service";

import prisma from "@/lib/prisma";

const execAsync = promisify(exec);

interface ExecError extends Error {
  stderr?: string;
  stdout?: string;
  code?: number;
}

export const isStdError = (err: unknown): err is { stderr: ExecError } => {
  return (
    typeof err === "object" &&
    err !== null &&
    "stderr" in err &&
    typeof (err as Record<string, unknown>).stderr === "string"
  );
};

export interface VideoInfo {
  fileName: string;
  filePath: string;
  creationDate: Date;
  duration?: number;
}

export interface VideoMetadata {
  width: number;
  height: number;
  bitrate: number;
}

export const getSortedVideoFiles = async (
  directory: string,
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    fs.readdir(directory, (err, files) => {
      if (err) return reject(err);

      const mp4Files = files.filter((file) => file.endsWith(".mp4")).sort();

      resolve(mp4Files);
    });
  });
};

export const handleNewVideo = async (
  userId: string,
  segmentPath: string,
  thresholdMs: number,
  shouldMerge: boolean,
): Promise<void> => {
  try {
    const isUsingS3Bucket = segmentPath.startsWith("s3://");

    const recordingsDir = path.join(
      process.env.RECORDINGS_PATH || "",
      "recordings",
      userId,
    );

    const fullVideoPath = path.join(
      recordingsDir,
      segmentPath.replace(`s3://`, ""),
    );

    const fileName = fullVideoPath.split("/").pop() || "";

    if (isUsingS3Bucket) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    } else {
      if (!fs.existsSync(path.join(recordingsDir))) {
        throw new Error(`No recording directory: ${recordingsDir}`);
      }
    }

    let allVideoFiles;
    let currentIndex: number;

    if (!isUsingS3Bucket) {
      allVideoFiles = await getSortedVideoFiles(recordingsDir);
      currentIndex = allVideoFiles.indexOf(fileName);
    } else {
      allVideoFiles = (await listRecordingFilesS3(userId))
        .map((e) => e.Key)
        .filter((e) => e?.endsWith(".mp4"));

      currentIndex = allVideoFiles
        .map((files) => files?.split("/").pop())
        .indexOf(fileName);
    }

    if (currentIndex === -1) {
      throw new Error(`The file ${fileName} is not in the directory`);
    }
    if (currentIndex === 0) {
      return;
    }

    const previousFileName =
      allVideoFiles[currentIndex - 1]?.split("/").pop() || "";
    const previousVideoPath = path.join(recordingsDir, previousFileName);

    if (isUsingS3Bucket) {
      try {
        await downloadFile(`recordings/${userId}/${fileName}`, fullVideoPath);

        await downloadFile(
          `recordings/${userId}/${previousFileName}`,
          previousVideoPath,
        );
      } catch (err) {
        console.error("Error downloading recordings:", err);
      }
    }

    const currentVideo: VideoInfo = {
      fileName,
      filePath: fullVideoPath,
      creationDate: await getDateFromFileName(fileName),
      duration: await getDurationMP4(fullVideoPath),
    };

    const previousVideo: VideoInfo = {
      fileName: previousFileName,
      filePath: previousVideoPath,
      creationDate: await getDateFromFileName(previousFileName),
      duration: await getDurationMP4(previousVideoPath),
    };

    const timeDifference =
      currentVideo.creationDate.getTime() -
      (previousVideo.creationDate.getTime() +
        (previousVideo.duration || 0) * 1000);

    if (Math.abs(timeDifference) <= thresholdMs || shouldMerge) {
      await prisma.recordingQueue.updateMany({
        where: {
          AND: {
            userId,
            fileName: {
              contains: previousVideo.fileName,
            },
          },
        },
        data: {
          status: "MERGING",
        },
      });

      await handleConsecutiveVideos(previousVideo, currentVideo);

      if (isUsingS3Bucket) {
        try {
          await prisma.recordingQueue.updateMany({
            where: {
              AND: {
                userId,
                fileName: {
                  contains: previousVideo.fileName,
                },
              },
            },
            data: {
              status: "UPLOADING",
            },
          });

          await uploadFile(
            `recordings/${userId}/${previousVideo.fileName}`,
            previousVideo.filePath,
            "video/mp4",
          );

          await uploadFile(
            `recordings/${userId}/${previousVideo.fileName.replace(
              ".mp4",
              ".webp",
            )}`,
            previousVideo.filePath.replace(".mp4", ".webp"),
            "image/webp",
          );

          await prisma.recordingQueue.updateMany({
            where: {
              AND: {
                userId,
                fileName: {
                  contains: previousVideo.fileName,
                },
              },
            },
            data: {
              status: "COMPLETED",
            },
          });

          fs.rmSync(previousVideo.filePath);
          fs.rmSync(previousVideo.filePath.replace(".mp4", ".webp"));

          await deleteFile(
            `recordings/${userId}/${currentVideo.fileName}`,
            `recordings/${userId}/${currentVideo.fileName.replace(
              ".mp4",
              ".webp",
            )}`,
          );
        } catch (err) {
          console.error("Error", err);
        }
      }
    } else {
      if (isUsingS3Bucket) {
        try {
          fs.rmSync(currentVideo.filePath);
          fs.rmSync(previousVideo.filePath);
        } catch {}
      }
    }
  } catch (error) {
    console.error(`Error processing video: ${error}`);
  }
};

const handleConsecutiveVideos = async (
  previousVideo: VideoInfo,
  currentVideo: VideoInfo,
): Promise<void> => {
  try {
    const outputFile = `${previousVideo.filePath}.mp4.merged`;

    const listFileName = `${previousVideo.filePath}_list.txt`;
    const listContent = `file '${previousVideo.filePath}'\nfile '${currentVideo.filePath}'`;

    fs.writeFileSync(listFileName, listContent);

    const mergeCommand = [
      "ffmpeg",
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listFileName,
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      "-f",
      "mp4",
      outputFile,
    ].join(" ");

    await execAsync(mergeCommand);

    fs.rmSync(previousVideo.filePath);
    fs.rmSync(currentVideo.filePath);
    fs.rmSync(listFileName);
    fs.renameSync(outputFile, previousVideo.filePath);

    try {
      fs.rmSync(currentVideo.filePath.replace(".mp4", ".webp"));
    } catch {}

    await generateThumbnail(previousVideo.filePath);
  } catch (error) {
    console.error("Error merging videos:", error);
    throw error;
  }
};

export const generateThumbnail = async (outputFile: string) => {
  const getDurationCommand = [
    "ffprobe",
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    outputFile,
  ].join(" ");

  const { stdout: durationStdout } = await execAsync(getDurationCommand);
  const duration = parseFloat(durationStdout.trim());
  const middleTime = duration / 2;

  const generateThumbnailCommand = [
    "ffmpeg",
    "-y",
    "-ss",
    middleTime.toString(),
    "-i",
    outputFile,
    "-vf",
    "scale=320:320:force_original_aspect_ratio=decrease",
    "-vframes",
    "1",
    "-qscale",
    "50",
    outputFile.replace(".mp4", ".webp"),
  ].join(" ");

  await execAsync(generateThumbnailCommand);
};

export const getVideoMetadata = async (filePath: string) => {
  const ffprobeCommand = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,bit_rate -of json ${filePath}`;

  try {
    const { stdout } = await execAsync(ffprobeCommand);
    const metadata = JSON.parse(stdout);

    if (!metadata.streams || metadata.streams.length === 0) {
      throw new Error("No metadata found.");
    }

    const videoStream = metadata.streams[0];

    return {
      width: videoStream.width,
      height: videoStream.height,
      bitrate: Math.floor(parseInt(videoStream.bit_rate) / 1000),
    };
  } catch (error) {
    console.error("Error obtaining metadata:", error);
    throw error;
  }
};

export const reencodeWithOriginalSettings = async (
  inputFile: string,
  outputFile: string,
) => {
  try {
    const { width, height, bitrate } = await getVideoMetadata(inputFile);
    const reencodeCommand = [
      "ffmpeg",
      "-y",
      "-i",
      inputFile,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-b:v",
      `${bitrate}k`,
      "-maxrate",
      `${bitrate}k`,
      "-minrate",
      `${bitrate}k`,
      "-bufsize",
      `${bitrate}k`,
      "-nal-hrd",
      "cbr",
      "-vf",
      `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
      "-movflags",
      "+faststart",
      "-c:a",
      "copy",
      "-f",
      "mp4",
      outputFile,
    ].join(" ");

    await execAsync(reencodeCommand);

    try {
      const validationCommand = `ffmpeg -v error -xerror -i ${outputFile} -f null -`;
      const { stderr } = await execAsync(validationCommand);

      if (stderr) {
        throw new Error("Reencoding failed (ffmpeg detected errors)");
      }
    } catch (e) {
      if (isStdError(e)) {
        throw new Error("Reencoding failed validation");
      } else {
        throw e;
      }
    }
  } catch (error) {
    console.error("Error while reencoding:", error);
    throw error;
  }
};
