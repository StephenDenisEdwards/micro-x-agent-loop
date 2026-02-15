import * as fs from "node:fs/promises";
import type { Tool } from "../types.js";

export const writeFileTool: Tool = {
  name: "write_file",
  description: "Write content to a file, creating it if it doesn't exist.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Absolute or relative path to the file to write",
      },
      content: {
        type: "string",
        description: "The content to write to the file",
      },
    },
    required: ["path", "content"],
  },
  async execute(input) {
    const path = input.path as string;
    const content = input.content as string;
    try {
      await fs.writeFile(path, content, "utf-8");
      return `Successfully wrote to ${path}`;
    } catch (err) {
      return `Error writing file: ${(err as Error).message}`;
    }
  },
};
