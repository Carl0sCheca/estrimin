import fs from "fs";
import path from "path";
import {
  getDurationMP4,
  getDateFromFileName,
} from "../../src/lib/utils-server";
import { exec } from "child_process";
import { promisify } from "util";

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

const getSortedVideoFiles = async (directory: string): Promise<string[]> => {
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
  thresholdMs: number
): Promise<void> => {
  try {
    const recordingsDir = path.join(
      process.env.RECORDINGS_PATH || "",
      "recordings",
      userId
    );

    const fullVideoPath = segmentPath;

    const fileName = fullVideoPath.split("/").pop() || "";

    if (!fs.existsSync(recordingsDir)) {
      throw new Error(`No recording directory: ${recordingsDir}`);
    }

    const allVideoFiles = await getSortedVideoFiles(recordingsDir);

    const currentIndex = allVideoFiles.indexOf(fileName);
    if (currentIndex === -1) {
      throw new Error(`The file ${fileName} is not in the directory`);
    }

    if (currentIndex === 0) {
      return;
    }

    const previousFileName = allVideoFiles[currentIndex - 1];
    const previousVideoPath = path.join(recordingsDir, previousFileName);

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

    if (Math.abs(timeDifference) <= thresholdMs) {
      await handleConsecutiveVideos(previousVideo, currentVideo);
    }
  } catch (error) {
    console.error(`Error processing video: ${error}`);
  }
};

const handleConsecutiveVideos = async (
  previousVideo: VideoInfo,
  currentVideo: VideoInfo
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
  } catch (error) {
    console.error("Error merging videos:", error);
    throw error;
  }
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
  outputFile: string
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
