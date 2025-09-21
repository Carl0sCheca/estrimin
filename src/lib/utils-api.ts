import path from "path";
import { existsSync } from "fs";

export const validateParameters = (
  userId: string,
  videoId: string,
  type: string
): boolean => {
  if (!/^[a-zA-Z0-9\-_]+$/.test(userId)) return false;

  if (type !== "n" && type !== "s") return false;

  if (!/^[a-zA-Z0-9\-_\.]+$/.test(videoId)) return false;

  return true;
};

export const getSafePath = (
  userId: string,
  fileName: string,
  type: string
): string | null => {
  try {
    const basePath = path.resolve(process.env.RECORDINGS_PATH || "");

    if (!basePath || !existsSync(basePath)) {
      return null;
    }

    if (type !== "s" && type !== "n") {
      return null;
    }

    const subDir = type === "n" ? "recordings" : "recordings_saved";

    const relativePath = path.join(subDir, userId, fileName);
    const fullPath = path.resolve(path.join(basePath, relativePath));

    if (!fullPath.startsWith(basePath)) {
      console.warn(`Path traversal attempt detected in video: ${fullPath}`);
      return null;
    }

    const normalizedPath = fullPath.replace(/\\/g, "/");
    if (normalizedPath.includes("../") || normalizedPath.includes("..\\")) {
      console.warn(`Path traversal attempt detected in video: ${fullPath}`);
      return null;
    }

    return fullPath;
  } catch (error) {
    console.error("Error in getSafeVideoPath:", error);
    return null;
  }
};
