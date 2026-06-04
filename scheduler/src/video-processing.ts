import prisma from "@/lib/prisma";
import { spawn, type ChildProcess } from "child_process";
import { existsSync, renameSync, rmSync, writeFileSync } from "fs";
import { hostname } from "os";

const TIMEOUT = {
  FFPROBE_DURATION: 30_000,
  FFPROBE_METADATA: 30_000,
  ENCODER_LIST: 30_000,
  THUMBNAIL: 60_000,
  VALIDATION: 300_000,
  REENCODE: 600_000,
  MERGE: 600_000,
} as const;

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

const isAbortError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "name" in error &&
  (error as { name: string }).name === "AbortError";

const execFFmpeg = (
  cmd: string,
  args: string[],
  { timeoutMs, signal }: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("The operation was aborted", "AbortError"));
      return;
    }

    const child = spawn(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const killChild = () => child.kill("SIGTERM");

    if (timeoutMs) timeoutId = setTimeout(killChild, timeoutMs);
    signal?.addEventListener("abort", killChild, { once: true });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });

    const cleanup = () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", killChild);
    };

    child.on("error", (err) => {
      cleanup();
      reject(err);
    });

    child.on("close", (code, sig) => {
      cleanup();
      if (sig !== null || code === null) {
        reject(
          signal?.aborted
            ? new DOMException("The operation was aborted", "AbortError")
            : new Error(`Process timed out after ${timeoutMs}ms`),
        );
        return;
      }
      if (code !== 0) {
        const err: ExecError = new Error(
          `Process exited with code ${code}${stderr ? "\n" + stderr.slice(-500) : ""}`,
        );
        err.stderr = stderr;
        err.code = code;
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });

const runWithTimeout = (
  child: ChildProcess,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      child.kill();
      reject(new DOMException("The operation was aborted", "AbortError"));
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const killChild = () => child.kill("SIGTERM");

    timeoutId = setTimeout(killChild, timeoutMs);
    signal?.addEventListener("abort", killChild, { once: true });

    let stderr = "";
    child.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });

    const cleanup = () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", killChild);
    };

    child.on("error", (err) => {
      cleanup();
      reject(err);
    });

    child.on("close", (code, sig) => {
      cleanup();
      if (sig !== null || code === null) {
        reject(
          signal?.aborted
            ? new DOMException("The operation was aborted", "AbortError")
            : new Error(`Process timed out after ${timeoutMs}ms`),
        );
        return;
      }
      if (code !== 0) {
        reject(
          new Error(
            `Process exited with code ${code}${stderr ? "\n" + stderr.slice(-500) : ""}`,
          ),
        );
      } else {
        resolve();
      }
    });
  });

export const generateThumbnail = async (
  outputFile: string,
  signal?: AbortSignal,
) => {
  const { stdout: durationStdout } = await execFFmpeg(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      outputFile,
    ],
    { timeoutMs: TIMEOUT.FFPROBE_DURATION, signal },
  );

  const duration = parseFloat(durationStdout.trim());
  const middleTime = duration / 2;

  await execFFmpeg(
    "ffmpeg",
    [
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
    ],
    { timeoutMs: TIMEOUT.THUMBNAIL, signal },
  );
};

export const getVideoMetadata = async (
  filePath: string,
  signal?: AbortSignal,
) => {
  try {
    const { stdout } = await execFFmpeg(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height,bit_rate",
        "-of",
        "json",
        filePath,
      ],
      { timeoutMs: TIMEOUT.FFPROBE_METADATA, signal },
    );

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
    if (isAbortError(error)) throw error;

    console.error("Error obtaining metadata:", error);
    throw error;
  }
};

export const getEncoderCandidates = async (
  signal?: AbortSignal,
): Promise<string[]> => {
  const candidates: string[] = [];

  try {
    const { stdout } = await execFFmpeg(
      "ffmpeg",
      ["-encoders", "-hide_banner"],
      {
        timeoutMs: TIMEOUT.ENCODER_LIST,
        signal,
      },
    );

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
    if (isAbortError(error)) throw error;

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
  const reencodeCommand: string[] = ["-y"];

  if (videoEncoder.includes("vaapi")) {
    reencodeCommand.push(
      "-vaapi_device",
      "/dev/dri/renderD128",
      "-hwaccel",
      "vaapi",
      "-hwaccel_output_format",
      "vaapi",
    );
  } else if (videoEncoder.includes("nvenc")) {
    reencodeCommand.push("-hwaccel", "cuda", "-hwaccel_output_format", "cuda");
  } else if (videoEncoder.includes("qsv")) {
    reencodeCommand.push("-hwaccel", "qsv", "-hwaccel_output_format", "qsv");
  } else if (videoEncoder.includes("videotoolbox")) {
    reencodeCommand.push("-hwaccel", "videotoolbox");
  }

  reencodeCommand.push("-i", inputFile);

  let filterComplex: string;
  if (videoEncoder.includes("vaapi")) {
    filterComplex = `scale_vaapi=${width}:${height}:force_original_aspect_ratio=decrease`;
  } else {
    filterComplex = `scale=${width}:${height}:force_original_aspect_ratio=decrease`;
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
  signal?: AbortSignal,
) => {
  const { width, height, bitrate } = await getVideoMetadata(inputFile, signal);
  const encoderCandidates = await getEncoderCandidates(signal);

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

      await runWithTimeout(ffmpegProcess, TIMEOUT.REENCODE, signal);

      await execFFmpeg(
        "ffmpeg",
        ["-v", "error", "-xerror", "-i", outputFile, "-f", "null", "-"],
        { timeoutMs: TIMEOUT.VALIDATION, signal },
      );

      return true;
    } catch (error) {
      if (isAbortError(error)) throw error;

      lastError = error as Error;
      console.warn(`\u2717 Encoding failed with ${encoder}:`);
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
  signal?: AbortSignal,
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

    await runWithTimeout(ffmpegProcess, TIMEOUT.MERGE, signal);

    if (existsSync(previousVideo[0])) rmSync(previousVideo[0]);
    if (existsSync(currentVideo[0])) rmSync(currentVideo[0]);
    if (existsSync(listFileName)) rmSync(listFileName);

    renameSync(outputFile, previousVideo[0]);

    await generateThumbnail(previousVideo[0], signal);
  } catch (error) {
    if (isAbortError(error)) throw error;

    if (existsSync(outputFile)) rmSync(outputFile);
    if (existsSync(listFileName)) rmSync(listFileName);

    console.error("Error merging videos:", error);
    throw error;
  }
};
