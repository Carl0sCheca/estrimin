import type { Metadata } from "next";
import { AdminForm } from "./ui/adminForm";
import prisma from "@/lib/prisma";
import { Setting } from "@prisma/client";

export const metadata: Metadata = {
  title: "Administration",
};

export const revalidate = 0;

export default async function AdminPage() {
  const settings: Array<Setting> = await prisma.setting.findMany();

  return (
    <>
      <div
        className={"flex min-h-full flex-col justify-center px-6 py-12 lg:px-8"}
      >
        <AdminForm settings={settings} />
      </div>
    </>
  );
}
