import { S3Client } from "@aws-sdk/client-s3";

const s3ClientSingleton = () => {
  if (!process.env.S3_ACCESS_KEY_ID) {
    return null;
  }

  return new S3Client({
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
    endpoint: process.env.S3_BUCKET_ENDPOINT,
    region: process.env.S3_REGION,
    forcePathStyle: true,
  });
};

type S3ClientSingleton = ReturnType<typeof s3ClientSingleton>;

const globalForS3 = globalThis as unknown as {
  s3client: S3ClientSingleton | undefined;
};

const s3Client = globalForS3.s3client ?? s3ClientSingleton();

export default s3Client;

if (process.env.NODE_ENV !== "production") globalForS3.s3client = s3Client;
