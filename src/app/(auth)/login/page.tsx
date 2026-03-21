import type { Metadata } from "next";
import { LoginForm } from "./_components/loginForm";
import { isRegisterDisabledAction } from "@/actions";

export const metadata: Metadata = {
  title: "Log in",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const isRegisterDisabled = (await isRegisterDisabledAction()).ok;

  return (
    <div
      className={"flex min-h-full flex-col justify-center px-6 py-12 lg:px-8"}
    >
      <LoginForm isDisabled={isRegisterDisabled} />
    </div>
  );
}
