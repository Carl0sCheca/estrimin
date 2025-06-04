import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { ReadableStream } from "stream/web";
import { parentPort, workerData } from "worker_threads";
import path from "path";
import fs from "fs";

interface WorkerData {
  url: string;
  filePath: string;
}

const downloadVideo = async () => {
  const { url, filePath } = workerData as WorkerData;

  try {
    const response = await fetch(url);

    if (!response.body) throw new Error("No response body");

    fs.mkdir(path.dirname(filePath), { recursive: true }, async (err) => {
      if (err) throw err;

      const fileStream = fs.createWriteStream(filePath);

      await pipeline(
        Readable.fromWeb(response.body as ReadableStream<Uint8Array>),
        fileStream
      );
    });

    parentPort?.postMessage({ success: true, filePath });
  } catch (error) {
    parentPort?.postMessage({ success: false, error: `Error: ${error}` });
  }
};

downloadVideo();
