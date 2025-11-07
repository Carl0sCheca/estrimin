import {
  _Object,
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import s3Client from "../../src/lib/s3-client";

import * as fs from "fs";
import { promisify } from "util";
import { pipeline, Readable } from "stream";

const streamPipeline = promisify(pipeline);

export const uploadFile = async (
  key: string,
  filePath: string,
  contentType: string
): Promise<string | null> => {
  try {
    const fileStream = fs.createReadStream(filePath);

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_RECORDINGS,
      Key: key,
      Body: fileStream,
      ContentType: contentType,
    });

    await s3Client?.send(command);

    const fileUrl = `s3://${key}`;
    return fileUrl;
  } catch (err) {
    console.error("Error uploading file from S3:", err);
    return null;
  }
};

export const downloadFile = async (
  key: string,
  localFilePath: string
): Promise<void> => {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_RECORDINGS,
      Key: key,
    });

    const response = await s3Client?.send(command);

    await streamPipeline(
      response?.Body as NodeJS.ReadableStream,
      fs.createWriteStream(localFilePath)
    );
  } catch (err) {
    console.error("Error downloading file from S3:", err);
  }
};

export const getFileBuffer = async (
  bucket: string,
  key: string
): Promise<Buffer> => {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client?.send(command);

  if (!response?.Body) {
    throw new Error("File not does not have body");
  }

  const stream = response.Body as Readable;

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export const deleteFile = async (...keys: string[]): Promise<void> => {
  try {
    const objects = keys.map((key) => {
      return { Key: key };
    });

    const command = new DeleteObjectsCommand({
      Bucket: process.env.S3_BUCKET_RECORDINGS,
      Delete: {
        Objects: objects,
      },
    });

    await s3Client?.send(command);
  } catch (err) {
    console.error("Error removing file from S3:", err);
  }
};

export const listRecordingFilesS3 = async (
  userId: string
): Promise<Array<_Object>> => {
  const command = new ListObjectsV2Command({
    Bucket: process.env.S3_BUCKET_RECORDINGS,
    Prefix: `recordings/${userId}/`,
  });

  const response = await s3Client?.send(command);

  return response?.Contents || [];
};

export const checkIfFileExists = async (key: string): Promise<boolean> => {
  try {
    const command = new HeadObjectCommand({
      Bucket: process.env.S3_BUCKET_RECORDINGS,
      Key: key,
    });

    await s3Client?.send(command);

    return true;
  } catch {}

  return false;
};

export const moveFile = async (
  keyFrom: string,
  keyTo: string,
  bucketFrom?: string,
  bucketTo?: string
) => {
  try {
    const copyCommand = new CopyObjectCommand({
      Bucket: bucketTo ?? bucketFrom ?? process.env.S3_BUCKET_RECORDINGS,
      CopySource: `${
        bucketFrom ?? process.env.S3_BUCKET_RECORDINGS
      }/${keyFrom}`,
      Key: keyTo,
    });
    await s3Client?.send(copyCommand);

    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucketFrom ?? process.env.S3_BUCKET_RECORDINGS,
      Key: keyFrom,
    });
    await s3Client?.send(deleteCommand);
  } catch (err) {
    throw new Error(err as string);
  }
};
