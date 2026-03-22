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

export const getEncoderCandidates = async (): Promise<string[]> => {
  const candidates: string[] = [];

  try {
    const { stdout } = await execAsync("ffmpeg -encoders -hide_banner");

    const gpuEncoders = [
      "h264_vaapi",
      "hevc_vaapi",
      "h264_nvenc",
      "hevc_nvenc",
      "h264_amf",
      "hevc_amf",
      "h264_qsv",
      "hevc_qsv",
      "h264_videotoolbox",
      "hevc_videotoolbox",
    ];

    for (const encoder of gpuEncoders) {
      if (stdout.includes(encoder)) {
        candidates.push(encoder);
      }
    }

    candidates.push("libx264");
  } catch (error) {
    console.error("Error checking GPU encoders:", error);
    candidates.push("libx264");
  }

  return candidates;
};

const buildReencodeCommand = (
  inputFile: string,
  outputFile: string,
  videoEncoder: string,
  width: number,
  height: number,
  bitrate: number,
): string[] => {
  const reencodeCommand: string[] = ["-y", "-i", inputFile];

  let filterComplex = `scale=${width}:${height}:force_original_aspect_ratio=decrease`;

  if (videoEncoder.includes("vaapi")) {
    filterComplex = `scale=${width}:${height}:force_original_aspect_ratio=decrease,format=nv12,hwupload`;
    reencodeCommand.push("-vaapi_device", "/dev/dri/renderD128");
  }

  reencodeCommand.push("-vf", filterComplex);

  reencodeCommand.push("-c:v", videoEncoder);

  if (videoEncoder === "libx264") {
    reencodeCommand.push(
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
    );
  } else if (videoEncoder.includes("nvenc")) {
    reencodeCommand.push("-b:v", `${bitrate}k`, "-rc", "vbr");
  } else if (videoEncoder.includes("vaapi")) {
    reencodeCommand.push("-b:v", `${bitrate}k`);
  } else if (videoEncoder.includes("amf")) {
    reencodeCommand.push("-b:v", `${bitrate}k`);
  } else if (videoEncoder.includes("qsv")) {
    reencodeCommand.push("-b:v", `${bitrate}k`);
  } else if (videoEncoder.includes("videotoolbox")) {
    reencodeCommand.push("-b:v", `${bitrate}k`);
  } else {
    reencodeCommand.push(
      "-b:v",
      `${bitrate}k`,
      "-maxrate",
      `${bitrate}k`,
      "-minrate",
      `${bitrate}k`,
      "-bufsize",
      `${bitrate}k`,
    );
  }

  reencodeCommand.push(
    "-movflags",
    "+faststart",
    "-c:a",
    "copy",
    "-f",
    "mp4",
    outputFile,
  );

  return reencodeCommand;
};

export const reencodeWithOriginalSettings = async (
  inputFile: string,
  outputFile: string,
  recordingId: number,
) => {
  const { width, height, bitrate } = await getVideoMetadata(inputFile);
  const encoderCandidates = await getEncoderCandidates();

  let lastError: Error | null = null;

  for (const encoder of encoderCandidates) {
    try {
      const reencodeCommand = buildReencodeCommand(
        inputFile,
        outputFile,
        encoder,
        width,
        height,
        bitrate,
      );

      const ffmpegProcess = spawn("ffmpeg", reencodeCommand);
      const pid = ffmpegProcess.pid;

      await prisma.recordingQueue.update({
        where: { id: recordingId },
        data: {
          workerPid: pid,
          hostname: hostname(),
        },
      });

      let errorOutput = "";

      await new Promise<void>((resolve, reject) => {
        ffmpegProcess.stderr?.on("data", (data) => {
          errorOutput += data.toString();
        });

        ffmpegProcess.on("error", (err) => reject(err));

        ffmpegProcess.on("close", (code) => {
          if (code !== 0) {
            reject(
              new Error(
                `FFmpeg failed with code: ${code}${errorOutput ? "\n" + errorOutput.slice(-500) : ""}`,
              ),
            );
          } else {
            resolve();
          }
        });
      });

      try {
        const validationCommand = `ffmpeg -v error -xerror -i ${outputFile} -f null -`;
        await execAsync(validationCommand);
      } catch (e) {
        throw new Error("Encoding failed validation: " + (e as Error).message);
      }

      return true;
    } catch (error) {
      lastError = error as Error;
      console.warn(`✗ Encoding failed with ${encoder}:`);
      console.warn(lastError.message);

      if (encoder !== encoderCandidates[encoderCandidates.length - 1]) {
        if (existsSync(outputFile)) {
          rmSync(outputFile);
        }
        continue;
      }
    }
  }

  throw new Error(
    `All encoding attempts failed. Last error: ${lastError?.message}`,
  );
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
