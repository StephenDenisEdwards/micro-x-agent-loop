import { execFile } from "node:child_process";
import type { Tool } from "../types.js";

export const bashTool: Tool = {
  name: "bash",
  description:
    "Execute a bash command and return its output (stdout + stderr).",
  inputSchema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The bash command to execute",
      },
    },
    required: ["command"],
  },
  execute(input) {
    const command = input.command as string;
    const isWindows = process.platform === "win32";
    const shell = isWindows ? "cmd.exe" : "bash";
    const shellArgs = isWindows ? ["/c", command] : ["-c", command];
    return new Promise((resolve) => {
      execFile(
        shell,
        shellArgs,
        { timeout: 30_000 },
        (error, stdout, stderr) => {
          if (error) {
            resolve(`${stdout}${stderr}\n[exit code ${error.code ?? 1}]`);
          } else {
            resolve(`${stdout}${stderr}`.trimEnd());
          }
        },
      );
    });
  },
};
