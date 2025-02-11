import type { Metadata } from "next";
import RegisterForm from "./ui/registerForm";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Register",
};

export const revalidate = 0;

interface Props {
  params: Promise<{
    code: Array<string>;
  }>;
}

export default async function RegisterPage(props: Props) {
  const params = await props.params;

  if (!params.code) {
    const disableRegister: boolean = JSON.parse(
      (
        await prisma.setting.findFirst({
          where: { name: "DISABLE_REGISTER" },
        })
      )?.value ?? "false"
    );

    if (disableRegister) {
      redirect("/user");
    }
  } else {
    const code = params.code.at(0);

    if (!code) {
      redirect("/user");
    }
  }

  return (
    <div
      className={"flex min-h-full flex-col justify-center px-6 py-12 lg:px-8"}
    >
      <RegisterForm />
    </div>
  );
}
