export const getDiffTimeInMinutes = (date1: Date, date2: Date): number => {
  return Math.floor(
    Math.abs(new Date(date1).getTime() - new Date(date2).getTime()) / 1000 / 60,
  );
};

export const formatTimeAgo = (startTime: Date) => {
  const now = new Date();
  const diffMinutes = getDiffTimeInMinutes(now, startTime);

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""}`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays !== 1 ? "s" : ""}`;
};

export const secondsToHMS = (seconds: number) => {
  seconds = Math.max(0, Math.floor(seconds));

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (num: number) => num.toString().padStart(2, "0");

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
};

export const formatDate = (date: Date, time: boolean = false) => {
  const dateLocal = new Date(date);

  const year = dateLocal.getFullYear();
  const month = String(dateLocal.getMonth() + 1).padStart(2, "0");
  const day = String(dateLocal.getDate()).padStart(2, "0");
  const hours = String(dateLocal.getHours()).padStart(2, "0");
  const minutes = String(dateLocal.getMinutes()).padStart(2, "0");
  const seconds = String(dateLocal.getSeconds()).padStart(2, "0");

  return `${year}/${month}/${day}${
    time ? ` - ${hours}:${minutes}:${seconds}` : ""
  }`;
};

export const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
