import prisma from "@/lib/prisma";
import { exec, spawn } from "child_process";
import { existsSync, renameSync, rmSync, writeFileSync } from "fs";
import { hostname } from "os";
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
  recordingId: number,
) => {
  const { width, height, bitrate } = await getVideoMetadata(inputFile);

  const reencodeCommand = [
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
  ];

  const ffmpegProcess = spawn("ffmpeg", reencodeCommand);
  const pid = ffmpegProcess.pid;

  await prisma.recordingQueue.update({
    where: { id: recordingId },
    data: {
      workerPid: pid,
      hostname: hostname(),
    },
  });

  return new Promise((resolve, reject) => {
    ffmpegProcess.on("error", (err) => reject(err));

    ffmpegProcess.on("close", async (code) => {
      if (code !== 0) {
        return reject(new Error(`FFmpeg failed code: ${code}`));
      }

      try {
        const validationCommand = `ffmpeg -v error -xerror -i ${outputFile} -f null -`;
        await execAsync(validationCommand);
        resolve(true);
      } catch (e) {
        reject(
          new Error("Reencoding failed validation: " + (e as Error).message),
        );
      }
    });
  });
};

export const mergeVideos = async (
  previousVideo: readonly [string, number],
  currentVideo: readonly [string, number],
): Promise<void> => {
  const listFileName = `${previousVideo[0]}_list.txt`;
  const outputFile = `${previousVideo[0]}.merged.mp4`;

  try {
    const listContent = `file '${previousVideo[0]}'\nfile '${currentVideo[0]}'`;
    writeFileSync(listFileName, listContent);

    const mergeCommand = [
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
    ];

    const ffmpegProcess = spawn("ffmpeg", mergeCommand);
    const pid = ffmpegProcess.pid;

    await prisma.recordingQueue.update({
      where: { id: currentVideo[1] },
      data: {
        workerPid: pid,
        hostname: hostname(),
      },
    });

    await prisma.recordingQueue.update({
      where: { id: previousVideo[1] },
      data: {
        workerPid: pid,
        hostname: hostname(),
      },
    });

    await new Promise((resolve, reject) => {
      ffmpegProcess.on("error", (err) => reject(err));

      ffmpegProcess.on("close", (code) => {
        if (code === 0) resolve(true);
        else reject(new Error(`FFmpeg merge failed with code: ${code}`));
      });
    });

    if (existsSync(previousVideo[0])) rmSync(previousVideo[0]);
    if (existsSync(currentVideo[0])) rmSync(currentVideo[0]);
    if (existsSync(listFileName)) rmSync(listFileName);

    renameSync(outputFile, previousVideo[0]);

    await generateThumbnail(previousVideo[0]);
  } catch (error) {
    if (existsSync(outputFile)) rmSync(outputFile);
    if (existsSync(listFileName)) rmSync(listFileName);

    console.error("Error merging videos:", error);
    throw error;
  }
};
