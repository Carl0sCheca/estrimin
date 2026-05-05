export class JobAbortError extends Error {
  constructor() {
    super("Job aborted");
    this.name = "AbortError";
  }
}

const jobControllers = new Map<string, AbortController>();

export const setJobController = (
  jobName: string,
  controller: AbortController,
) => {
  jobControllers.set(jobName, controller);
};

export const abortJob = (jobName: string) => {
  jobControllers.get(jobName)?.abort();
};

export const abortAllJobs = () => {
  for (const controller of jobControllers.values()) {
    controller.abort();
  }
};

export const clearJobController = (jobName: string) => {
  jobControllers.delete(jobName);
};

export const throwIfJobAborted = (signal: AbortSignal) => {
  if (signal.aborted) {
    throw new JobAbortError();
  }
};
