import { JobStatus } from "toad-scheduler";

export interface RawTask {
  id: string;
  isExecuting: boolean;
}

export interface RawJob {
  id: string;
  task: RawTask;
  status: JobStatus;
}

export interface ListedJob {
  id: string | undefined;
  status: JobStatus;
  isRunning: boolean;
  lastExecution?: Date;
}
