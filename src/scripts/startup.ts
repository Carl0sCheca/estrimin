import prisma from "@/lib/prisma";
import { auth } from "../lib/auth";

const main = async () => {
  if ((await prisma.user.count()) === 0) {
    await prisma.setting.create({
      data: {
        name: "FORBIDDEN_NAMES",
        value: JSON.stringify([
          "user",
          "admin",
          "register",
          "login",
          "channel",
          "api",
          "videos",
        ]),
      },
    });

    await prisma.setting.create({
      data: {
        name: "DISABLE_REGISTER",
        value: JSON.stringify(false),
      },
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
