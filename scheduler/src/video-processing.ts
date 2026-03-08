import { exec } from "child_process";
import { renameSync, rmSync, writeFileSync } from "fs";
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

export const mergeVideos = async (
  previousVideo: string,
  currentVideo: string,
): Promise<void> => {
  try {
    const outputFile = `${previousVideo}.merged.mp4`;

    const listFileName = `${previousVideo}_list.txt`;
    const listContent = `file '${previousVideo}'\nfile '${currentVideo}'`;

    writeFileSync(listFileName, listContent);

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

    rmSync(previousVideo);
    rmSync(currentVideo);
    rmSync(listFileName);
    renameSync(outputFile, previousVideo);

    await generateThumbnail(previousVideo);
  } catch (error) {
    console.error("Error merging videos:", error);
    throw error;
  }
};
