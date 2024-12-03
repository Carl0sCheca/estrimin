import type { Metadata } from "next";
import LoginForm from "./ui/loginForm";

export const metadata: Metadata = {
  title: "Log in",
};

export default async function LoginPage() {
  return (
    <div
      className={"flex min-h-full flex-col justify-center px-6 py-12 lg:px-8"}
    >
      <LoginForm />
    </div>
  );
}
