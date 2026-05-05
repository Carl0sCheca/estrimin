-- AlterTable
ALTER TABLE "recordingQueue" ALTER COLUMN "status" SET DEFAULT 'RECORDING';

-- CreateTable
CREATE TABLE "taskMachine" (
    "hostname" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 4000,
    "heartbeat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taskMachine_pkey" PRIMARY KEY ("hostname","port")
);

-- CreateTable
CREATE TABLE "task" (
    "id" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "lastRun" TIMESTAMP(3) NOT NULL,
    "isRunning" BOOLEAN NOT NULL,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_task_idx" ON "task"("task");

-- CreateIndex
CREATE INDEX "task_hostname_idx" ON "task"("hostname");
