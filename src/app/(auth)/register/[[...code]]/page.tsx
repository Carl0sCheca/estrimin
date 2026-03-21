import type { Metadata } from "next";
import { RegisterForm } from "./_components/registerForm";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SITE_SETTING } from "@/interfaces";

export const metadata: Metadata = {
  title: "Register",
};

interface Props {
  params: Promise<{
    code: Array<string>;
  }>;
}

export const dynamic = "force-dynamic";

export default async function RegisterPage(props: Props) {
  const params = await props.params;
  let code: string | undefined;

  if (!params.code) {
    const disableRegister: boolean =
      ((
        await prisma.siteSetting.findFirst({
          where: { key: SITE_SETTING.DISABLE_REGISTER },
        })
      )?.value as boolean) ?? false;

    if (disableRegister) {
      redirect("/user");
    }
  } else {
    code = params.code.at(0);

    const validCode = await prisma.registrationCode.findFirst({
      where: { id: code },
    });

    if (
      !code ||
      !validCode ||
      validCode.used ||
      (validCode.expirationDate && validCode.expirationDate < new Date())
    ) {
      redirect("/user");
    }
  }

  return (
    <div
      className={"flex min-h-full flex-col justify-center px-6 py-12 lg:px-8"}
    >
      <RegisterForm registrationCode={code} />
    </div>
  );
}
