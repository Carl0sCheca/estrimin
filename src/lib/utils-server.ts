"use server";

import prisma from "./prisma";
import fs from "fs";
import { createFile, MP4BoxBuffer } from "mp4box";

interface MP4MediaInfo {
  duration: number;
  timescale: number;
}

export const dateToFilename = async (
  date: Date | undefined,
): Promise<string | null> => {
  if (!date) {
    return null;
  }

  const isoString = date.toISOString();

  const formatted = isoString
    .replace(/T/, "_")
    .replace(/:/g, "-")
    .replace(/\..+Z$/, "");

  return formatted;
};

export const getDateFromFileName = async (fileName: string): Promise<Date> => {
  const dateTimeMatch = fileName.match(
    /(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{6})/,
  );
  if (!dateTimeMatch) {
    throw new Error(`Date format not recognized in file: ${fileName}`);
  }

  const [datePart, timePart] = dateTimeMatch[0].split("_");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes, seconds, microseconds] = timePart
    .split("-")
    .map(Number);

  const utcDate = Date.UTC(
    year,
    month - 1,
    day,
    hours,
    minutes,
    seconds,
    Math.floor(microseconds / 1000),
  );

  return new Date(utcDate);
};

export const getDurationMP4 = async (filePath: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      reject(new Error(`The file '${filePath}' does not exist`));
      return;
    }

    const mp4boxFile = createFile();
    let resolved = false;
    let bytesRead = 0;
    const MAX_READ_SIZE = 2 * 1024 * 1024; // max 0.5mb

    mp4boxFile.onReady = (info: MP4MediaInfo) => {
      if (resolved) return;
      resolved = true;

      if (info.duration && info.timescale) {
        const durationInSeconds = info.duration / info.timescale;
        resolve(durationInSeconds);
      } else {
        reject(new Error("Error obtaining duration from the MP4 file"));
      }
    };

    mp4boxFile.onError = (error) => {
      if (resolved) return;
      resolved = true;
      reject(new Error(`Error processing MP4 file: ${error}`));
    };

    const stream = fs.createReadStream(filePath, {
      highWaterMark: 64 * 1024, // 64KB chunks
    });

    stream.on("data", (chunk: string | Buffer) => {
      if (resolved) {
        stream.destroy();
        return;
      }

      if (bytesRead >= MAX_READ_SIZE) {
        stream.destroy();
        if (!resolved) {
          reject(
            new Error("Could not find moov atom in the first 2MB of the file"),
          );
        }
        return;
      }

      interface ArrayBufferWithFileStart extends ArrayBuffer {
        fileStart: number;
      }

      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBufferWithFileStart;

      arrayBuffer.fileStart = bytesRead;

      try {
        mp4boxFile.appendBuffer(arrayBuffer as MP4BoxBuffer);
        mp4boxFile.flush();
      } catch (error) {
        stream.destroy();
        if (!resolved) {
          reject(new Error(`Error processing chunk: ${error}`));
        }
        return;
      }

      bytesRead += buffer.length;
    });

    stream.on("end", () => {
      if (!resolved) {
        reject(new Error("Reached end of file without finding duration"));
      }
    });

    stream.on("error", (error) => {
      if (!resolved) {
        reject(new Error(`Error reading file: ${error.message}`));
      }
    });
  });
};

export const checkAdmin = async (
  sessionId: string | undefined,
): Promise<{ ok: boolean; message?: string }> => {
  const isAdmin: { ok: boolean; message?: string } = {
    ok: true,
  };

  try {
    const sessionDb = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { user: true },
    });

    if (!sessionDb) {
      isAdmin.ok = false;
      isAdmin.message = "Session not found";
    } else if (sessionDb.user.role !== "ADMIN") {
      isAdmin.ok = false;
      isAdmin.message = "Forbidden user";
    }
  } catch {
    isAdmin.ok = false;
    isAdmin.message = "Unexpected error";
  }

  return isAdmin;
};

export const hasPathname = async (urlString: string): Promise<boolean> => {
  try {
    const url = new URL(urlString);

    const path = url.pathname.replace(/\/+$/, "");

    return path.length > 0;
  } catch {
    return false;
  }
};

export const getLastUrlSegment = async (urlString: string) =>
  getUrlSegment(-1, urlString);

export const getUrlSegment = async (
  index: number,
  urlString: string,
): Promise<string | undefined> => {
  try {
    const url = new URL(urlString);
    return url.pathname.split("/").filter(Boolean).at(index);
  } catch {
    return undefined;
  }
};
