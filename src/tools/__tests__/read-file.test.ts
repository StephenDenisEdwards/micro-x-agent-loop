import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

vi.mock("mammoth", () => ({
  default: {
    extractRawText: vi.fn().mockResolvedValue({ value: "docx content" }),
  },
}));

const { readFileTool } = await import("../read-file.js");

describe("readFileTool", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "read-file-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("reads a plain text file", async () => {
    const filePath = path.join(tmpDir, "test.txt");
    await fs.writeFile(filePath, "hello world", "utf-8");

    const result = await readFileTool.execute({ path: filePath });
    expect(result).toBe("hello world");
  });

  it("reads a .docx file using mammoth", async () => {
    const result = await readFileTool.execute({ path: "/fake/doc.docx" });
    expect(result).toBe("docx content");
  });

  it("returns error message for nonexistent file", async () => {
    const result = await readFileTool.execute({ path: "/nonexistent/file.txt" });
    expect(result).toMatch(/^Error reading file:/);
  });
});
