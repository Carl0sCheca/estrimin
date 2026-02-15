import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { User } from "@/generated/client";
import { auth } from "@/lib/auth";
import { UserForm } from "./_components/userForm";

export const metadata: Metadata = {
  title: "User",
};

export default async function UserPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div
      className={"flex min-h-full flex-col justify-center px-6 py-12 lg:px-8"}
    >
      <UserForm userInit={session.user as User} />
    </div>
  );
}
