import { describe, it, expect } from "vitest";
import { bashTool } from "../bash.js";

describe("bashTool", () => {
  it("returns stdout from a successful command", async () => {
    const result = await bashTool.execute({ command: "echo hello" });
    expect(result).toContain("hello");
  });

  it("returns stderr and exit code on failure", async () => {
    const command =
      process.platform === "win32" ? "exit /b 1" : "exit 1";
    const result = await bashTool.execute({ command });
    expect(result).toContain("[exit code");
  });
});
