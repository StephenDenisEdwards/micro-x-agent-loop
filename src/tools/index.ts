import type { Tool } from "../types.js";
import { bashTool } from "./bash.js";
import { readFileTool } from "./read-file.js";
import { writeFileTool } from "./write-file.js";
import { linkedinJobsTool, linkedinJobDetailTool } from "./linkedin.js";
import { gmailSearchTool, gmailReadTool, gmailSendTool } from "./gmail/index.js";

export const builtinTools: Tool[] = [
  bashTool,
  readFileTool,
  writeFileTool,
  linkedinJobsTool,
  linkedinJobDetailTool,
  gmailSearchTool,
  gmailReadTool,
  gmailSendTool,
];
