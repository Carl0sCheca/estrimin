import prisma from "@/lib/prisma";
import { SITE_SETTING } from "@/interfaces";

export const updateLastExecutionFromSettings = async (task: string) => {
  try {
    await prisma.$transaction(
      async (tx) => {
        const result = await tx.$queryRaw<{ value: Record<string, string> }[]>`
          SELECT value FROM "siteSetting"
          WHERE key = ${SITE_SETTING.LAST_QUEUES_EXECUTION}
          FOR UPDATE
        `;

        const currentValue = result?.[0]?.value || {};
        const updatedValue = {
          ...currentValue,
          [task]: new Date().toISOString(),
        };

        await tx.siteSetting.upsert({
          where: { key: SITE_SETTING.LAST_QUEUES_EXECUTION },
          update: { value: updatedValue },
          create: {
            key: SITE_SETTING.LAST_QUEUES_EXECUTION,
            value: { [task]: new Date().toISOString() },
          },
        });
      },
      {
        maxWait: 30000,
        timeout: 20000,
      },
    );
  } catch (error) {
    console.error(`Error updating execution for ${task}:`, error);
  }
};
