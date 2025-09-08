import prisma from "@/lib/prisma";
import { auth } from "../lib/auth";
import { SITE_SETTING } from "@/interfaces";

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
      await auth.api.signUpEmail({
        body: {
          name: "administrator",
          email: "chan@ge.me",
          password: "changeme",
          role: "ADMIN",
        },
      });
    } catch {} // This will cause an error because it cannot save to a cookie. However, I don't want to use a cookie here.
  }
};

main();
