import prisma from "@/lib/prisma";
import { SITE_SETTING } from "@/interfaces";
import { registerAction } from "@/actions";
import { Role } from "@prisma/client";

const main = async () => {
  if ((await prisma.user.count()) === 0) {
    await prisma.siteSetting.create({
      data: {
        key: SITE_SETTING.FORBIDDEN_NAMES,
        value: [
          "user",
          "admin",
          "register",
          "login",
          "channel",
          "api",
          "videos",
        ],
      },
    });

    await prisma.siteSetting.createMany({
      data: [
        {
          key: SITE_SETTING.DISABLE_REGISTER,
          value: false,
        },
        {
          key: SITE_SETTING.DISABLE_QUEUE_JOBS,
          value: false,
        },
        {
          key: SITE_SETTING.DISABLE_RECORDINGS,
          value: false,
        },
      ],
    });

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
