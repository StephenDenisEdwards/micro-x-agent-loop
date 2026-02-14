import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { writeFileTool } from "../write-file.js";

describe("writeFileTool", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "write-file-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("writes content and returns success message", async () => {
    const filePath = path.join(tmpDir, "out.txt");
    const result = await writeFileTool.execute({
      path: filePath,
      content: "written content",
    });

    expect(result).toBe(`Successfully wrote to ${filePath}`);
    const contents = await fs.readFile(filePath, "utf-8");
    expect(contents).toBe("written content");
  });

  it("returns error message for invalid path", async () => {
    const result = await writeFileTool.execute({
      path: "/nonexistent-dir/subdir/file.txt",
      content: "test",
    });
    expect(result).toMatch(/^Error writing file:/);
  });
});
