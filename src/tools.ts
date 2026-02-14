import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import { createRequire } from "node:module";
import * as cheerio from "cheerio";
import type { Tool } from "./types.js";
import { gmailSearchTool, gmailReadTool, gmailSendTool } from "./gmail.js";

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

export const linkedinJobDetailTool: Tool = {
  name: "linkedin_job_detail",
  description:
    "Fetch the full job specification/description from a LinkedIn job URL. Use this after linkedin_jobs to get complete details for a specific posting.",
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description:
          "The LinkedIn job URL (e.g. from a linkedin_jobs search result)",
      },
    },
    required: ["url"],
  },
  async execute(input) {
    const url = input.url as string;
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
      });

      if (!response.ok) {
        return `Error fetching job page: HTTP ${response.status}`;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract job title
      const title =
        $(".top-card-layout__title").text().trim() ||
        $("h1").first().text().trim();

      // Extract company name
      const company =
        $(".topcard__org-name-link").text().trim() ||
        $(".top-card-layout__company-name").text().trim();

      // Extract location
      const location =
        $(".topcard__flavor--bullet").text().trim() ||
        $(".top-card-layout__bullet").text().trim();

      // Extract job description - try multiple known selectors
      const descriptionHtml =
        $(".description__text").html() ||
        $(".show-more-less-html__markup").html() ||
        $(".decorated-job-posting__details").html() ||
        "";

      let description = "";
      if (descriptionHtml) {
        // Convert HTML to readable text: preserve line breaks for block elements
        const desc$ = cheerio.load(descriptionHtml);
        desc$("br").replaceWith("\n");
        desc$("p, li, h1, h2, h3, h4, h5, h6").each((_i, el) => {
          desc$(el).append("\n");
        });
        desc$("li").each((_i, el) => {
          desc$(el).prepend("- ");
        });
        description = desc$.text().replace(/\n{3,}/g, "\n\n").trim();
      }

      if (!description) {
        return "Could not extract job description from the page. LinkedIn may have blocked the request or the page structure has changed.";
      }

      const parts: string[] = [];
      if (title) parts.push(`Title: ${title}`);
      if (company) parts.push(`Company: ${company}`);
      if (location) parts.push(`Location: ${location}`);
      parts.push("", "--- Job Description ---", "", description);

      return parts.join("\n");
    } catch (err) {
      return `Error fetching job details: ${(err as Error).message}`;
    }
  },
};

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
