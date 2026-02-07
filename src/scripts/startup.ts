import prisma from "@/lib/prisma";
import { SITE_SETTING } from "@/interfaces";
import { registerAction } from "@/actions";
import { Role } from "@prisma/client";

const main = async () => {
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
        undefined
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
