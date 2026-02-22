export const DEFAULT_SOCKET =
  process.env.ZEROMQ_SOCKET || "tcp://127.0.0.1:4000";

export enum SOCK_COMMAND {
  LIST,
  START,
  START_ALL,
  STOP,
  STOP_ALL,
}

export interface Command {
  c: SOCK_COMMAND;
  a?: string;
}

export interface Job {
  id: string;
  status: "running" | "stopped";
  isRunning: boolean;
  lastExecution: Date;
}

export interface FailedItems {
  id: number;
  fileName: string;
  error?: string;
  date?: Date;
}

export interface GetProcessingStatisticsResponse {
  ok: boolean;
  pending?: number;
  completed?: number;
  failed?: number;
}

export interface GetQueueSiteSettingsResponse {
  ok: boolean;
}

export interface SetQueueSiteSettingsResponse {
  ok: boolean;
}

export interface GetAllTasksSchedulerResponse {
  ok: boolean;
  tasks: Array<Job>;
}

export interface GetAllFailedQueueItemsResponse {
  ok: boolean;
  items: Array<FailedItems>;
}
