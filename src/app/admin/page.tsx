import type { Metadata } from "next";
import { AdminForm } from "./ui/adminForm";
import prisma from "@/lib/prisma";
import { SiteSetting } from "@/generated/client";

export const metadata: Metadata = {
  title: "Administration",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const settings: Array<SiteSetting> = await prisma.siteSetting.findMany();
  const baseUrl = process.env.BASE_URL || "";

  return (
    <>
      <div
        className={"flex min-h-full flex-col justify-center px-6 py-12 lg:px-8"}
      >
        <AdminForm settings={settings} baseUrl={baseUrl} />
      </div>
    </>
  );
}
