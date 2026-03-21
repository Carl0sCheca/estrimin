import { describe, expect, test } from "vitest";
import {
  getAllPathUrl,
  getFileNameFromPath,
  getLastUrlSegment,
  getUrlSegment,
  hasPathname,
} from "./utils-server";

describe("hasPathname", () => {
  test("should return true for valid pathnames (including trailing slashes)", async () => {
    expect(await hasPathname("http://test.domain/api/estrimin/")).toBe(true);
    expect(await hasPathname("http://test.domain/api/estrimin")).toBe(true);
  });

  test("should return false for unrelated paths", async () => {
    expect(await hasPathname("http://test.domain/")).toBe(false);
    expect(await hasPathname("http://test.domain")).toBe(false);
  });

  test("should return false for empty path", async () => {
    expect(await hasPathname("")).toBe(false);
  });
});

describe("getUrlSegment", () => {
  test("should return the correct segment at index 0", async () => {
    expect(await getUrlSegment(0, "http://test.domain/api/estrimin/")).toBe(
      "api",
    );
    expect(await getUrlSegment(0, "http://test.domain/api/estrimin")).toBe(
      "api",
    );
  });

  test("should return the correct segment at index 1", async () => {
    expect(await getUrlSegment(1, "http://test.domain/api/estrimin/")).toBe(
      "estrimin",
    );
    expect(await getUrlSegment(1, "http://test.domain/api/estrimin")).toBe(
      "estrimin",
    );
  });

  test("should return undefined for invalid indices", async () => {
    expect(await getUrlSegment(5, "http://test.domain/api/estrimin")).toBe(
      undefined,
    );
  });
});

describe("getLastUrlSegment", () => {
  test("should return the last segment", async () => {
    expect(await getLastUrlSegment("http://test.domain/api/estrimin/")).toBe(
      "estrimin",
    );
    expect(await getLastUrlSegment("http://test.domain/api/estrimin")).toBe(
      "estrimin",
    );
  });

  describe("getFileNameFromPath", () => {
    test("should return the file name from a valid path", async () => {
      expect(await getFileNameFromPath("/root/projects/file.txt")).toBe(
        "file.txt",
      );
      expect(await getFileNameFromPath("/home/user/document.pdf")).toBe(
        "document.pdf",
      );
    });

    test("should return the file name without trailing slashes", async () => {
      expect(await getFileNameFromPath("/root/projects/file.txt/")).toBe("");
    });

    test("should return undefined for root path", async () => {
      expect(await getFileNameFromPath("/")).toBe("");
    });

    test("should return the file name for single segment", async () => {
      expect(await getFileNameFromPath("file.txt")).toBe("file.txt");
    });
  });
});

describe("getAllPathUrl", () => {
  test("should return the path with trailing slash", async () => {
    expect(await getAllPathUrl("http://test.domain/")).toBe("/");
  });

  test("should return the pathname without trailing slash", async () => {
    expect(await getAllPathUrl("http://test.domain/api/estrimin")).toBe(
      "/api/estrimin",
    );
  });

  test("should return the pathname with single segment and trailing slash", async () => {
    expect(await getAllPathUrl("http://test.domain/path/")).toBe("/path/");
  });

  test("should return the pathname with single segment without trailing slash", async () => {
    expect(await getAllPathUrl("http://test.domain/path")).toBe("/path");
  });

  test("should return the pathname with multiple segments and trailing slash", async () => {
    expect(await getAllPathUrl("http://test.domain/path/path2/")).toBe(
      "/path/path2/",
    );
  });

  test("should return the pathname with multiple segments without trailing slash", async () => {
    expect(await getAllPathUrl("http://test.domain/path/path2")).toBe(
      "/path/path2",
    );
  });

  test("should return undefined for invalid URL", async () => {
    expect(await getAllPathUrl("not-a-valid-url")).toBe(undefined);
  });
});
