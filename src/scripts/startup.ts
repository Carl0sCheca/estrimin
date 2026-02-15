import prisma from "@/lib/prisma";
import { SITE_SETTING } from "@/interfaces";
import { registerAction } from "@/actions";
import { Role } from "@/generated/client";
import { getAllUrlSegment, hasPathname } from "@/lib/utils-server";
import { lstat, symlink, unlink } from "fs/promises";
import { join } from "path";
import s3Client from "@/lib/s3-client";
import {
  ExpirationStatus,
  PutBucketLifecycleConfigurationCommand,
} from "@aws-sdk/client-s3";

const main = async () => {
  const isUsingS3 = await hasPathname(process.env.STREAM_URL || "");

  if (isUsingS3) {
    const recordingPath = process.env.RECORDINGS_PATH || "";
    const urlSegments =
      (await getAllUrlSegment(process.env.STREAM_URL || "")) || [];

    const linkPath = join(recordingPath, "recordings");
    const target = join(recordingPath, urlSegments.join("/"));

    try {
      await lstat(linkPath);
      await unlink(linkPath);
    } catch {}
    await symlink(target, linkPath, "dir");

    try {
      await s3Client?.send(
        new PutBucketLifecycleConfigurationCommand({
          Bucket: process.env.S3_BUCKET_RECORDINGS,
          LifecycleConfiguration: {
            Rules: [
              {
                ID: `DeleteAfter72Hours_Recordings`,
                Status: ExpirationStatus.Enabled,
                Filter: {
                  Prefix: "recordings/",
                },
                Expiration: {
                  Days: 3,
                },
              },
            ],
          },
        }),
      );
    } catch {}
  }

  const forbiddenNames = [
    "user",
    "admin",
    "register",
    "login",
    "channel",
    "api",
    "videos",
    "following",
  ];

  await prisma.siteSetting.upsert({
    where: {
      key: SITE_SETTING.FORBIDDEN_NAMES,
    },
    create: {
      key: SITE_SETTING.FORBIDDEN_NAMES,
      value: forbiddenNames,
    },
    update: {
      key: SITE_SETTING.FORBIDDEN_NAMES,
      value: forbiddenNames,
    },
  });

  if (
    !(await prisma.siteSetting.findFirst({
      where: { key: SITE_SETTING.DISABLE_REGISTER },
    }))
  ) {
    await prisma.siteSetting.create({
      data: {
        key: SITE_SETTING.DISABLE_REGISTER,
        value: false,
      },
    });
  }

  if (
    !(await prisma.siteSetting.findFirst({
      where: { key: SITE_SETTING.DISABLE_QUEUE_JOBS },
    }))
  ) {
    await prisma.siteSetting.create({
      data: {
        key: SITE_SETTING.DISABLE_QUEUE_JOBS,
        value: false,
      },
    });
  }

  if (
    !(await prisma.siteSetting.findFirst({
      where: { key: SITE_SETTING.DISABLE_RECORDINGS },
    }))
  ) {
    await prisma.siteSetting.create({
      data: {
        key: SITE_SETTING.DISABLE_RECORDINGS,
        value: false,
      },
    });
  }

  if ((await prisma.user.count()) === 0) {
    try {
      await registerAction(
        "chan@ge.me",
        "changeme",
        "administrator",
        undefined,
      );

      await prisma.user.updateMany({
        where: {
          role: Role.USER,
        },
        data: {
          role: Role.ADMIN,
        },
      });
    } catch {}
  }
};

main();
