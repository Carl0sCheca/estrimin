export const validateParameters = (
  userId: string,
  videoId: string,
  type: string,
): boolean => {
  if (!/^[a-zA-Z0-9\-_]+$/.test(userId)) return false;

  if (type !== "n" && type !== "s") return false;

  if (!/^[a-zA-Z0-9\-_\.]+$/.test(videoId)) return false;

  return true;
};
