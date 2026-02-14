import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import { createRequire } from "node:module";
import type { Tool } from "./types.js";

const require = createRequire(import.meta.url);

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
    return new Promise((resolve) => {
      execFile(
        "bash",
        ["-c", command],
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

export const readFileTool: Tool = {
  name: "read_file",
  description: "Read the contents of a file and return it as UTF-8 text.",
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
    const path = input.path as string;
    try {
      return await fs.readFile(path, "utf-8");
    } catch (err) {
      return `Error reading file: ${(err as Error).message}`;
    }
  },
};

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

export const linkedinJobsTool: Tool = {
  name: "linkedin_jobs",
  description:
    "Search for job postings on LinkedIn. Returns job title, company, location, date, salary, and URL.",
  inputSchema: {
    type: "object",
    properties: {
      keyword: {
        type: "string",
        description: "Job search keyword (e.g. 'software engineer')",
      },
      location: {
        type: "string",
        description: "Job location (e.g. 'New York', 'Remote')",
      },
      dateSincePosted: {
        type: "string",
        description: "Recency filter: 'past month', 'past week', or '24hr'",
      },
      jobType: {
        type: "string",
        description:
          "Employment type: 'full time', 'part time', 'contract', 'temporary', 'internship'",
      },
      remoteFilter: {
        type: "string",
        description: "Work arrangement: 'on site', 'remote', or 'hybrid'",
      },
      experienceLevel: {
        type: "string",
        description:
          "Experience level: 'internship', 'entry level', 'associate', 'senior', 'director', 'executive'",
      },
      limit: {
        type: "string",
        description: "Max number of results to return (default '10')",
      },
      sortBy: {
        type: "string",
        description: "Sort order: 'recent' or 'relevant'",
      },
    },
    required: ["keyword"],
  },
  async execute(input) {
    try {
      const linkedIn = require("linkedin-jobs-api");
      const queryOptions: Record<string, unknown> = {
        keyword: input.keyword,
        limit: (input.limit as string) || "10",
      };
      if (input.location) queryOptions.location = input.location;
      if (input.dateSincePosted)
        queryOptions.dateSincePosted = input.dateSincePosted;
      if (input.jobType) queryOptions.jobType = input.jobType;
      if (input.remoteFilter) queryOptions.remoteFilter = input.remoteFilter;
      if (input.experienceLevel)
        queryOptions.experienceLevel = input.experienceLevel;
      if (input.sortBy) queryOptions.sortBy = input.sortBy;

      const results = await linkedIn.query(queryOptions);

      if (!results || results.length === 0) {
        return "No job postings found matching your criteria.";
      }

      const formatted = results.map(
        (job: Record<string, string>, i: number) =>
          `${i + 1}. ${job.position}\n   Company: ${job.company}\n   Location: ${job.location}\n   Posted: ${job.agoTime}\n   Salary: ${job.salary}\n   URL: ${job.jobUrl}`,
      );
      return formatted.join("\n\n");
    } catch (err) {
      return `Error searching LinkedIn jobs: ${(err as Error).message}`;
    }
  },
};

export const builtinTools: Tool[] = [
  bashTool,
  readFileTool,
  writeFileTool,
  linkedinJobsTool,
];
