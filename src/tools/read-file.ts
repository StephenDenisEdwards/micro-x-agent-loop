import * as fs from "node:fs/promises";
import * as path from "node:path";
import mammoth from "mammoth";
import type { Tool } from "../types.js";

export const readFileTool: Tool = {
  name: "read_file",
  description:
    "Read the contents of a file and return it as text. Supports plain text files and .docx documents.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Absolute or relative path to the file to read",
      },
    },
    required: ["path"],
  },
  async execute(input) {
    const filePath = input.path as string;
    try {
      if (path.extname(filePath).toLowerCase() === ".docx") {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
      }
      return await fs.readFile(filePath, "utf-8");
    } catch (err) {
      return `Error reading file: ${(err as Error).message}`;
    }
  },
};
