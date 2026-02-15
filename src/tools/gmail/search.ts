import { getGmailClient } from "./auth.js";
import { getHeader } from "./parser.js";
import type { Tool } from "../../types.js";

export const gmailSearchTool: Tool = {
  name: "gmail_search",
  description:
    "Search Gmail using Gmail search syntax (e.g. 'is:unread', 'from:someone@example.com', 'subject:hello'). Returns a list of matching emails with ID, date, from, subject, and snippet.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "Gmail search query (e.g. 'is:unread', 'from:boss@co.com newer_than:7d')",
      },
      maxResults: {
        type: "number",
        description: "Max number of results (default 10)",
      },
    },
    required: ["query"],
  },
  async execute(input) {
    try {
      const gmail = await getGmailClient();
      const maxResults = (input.maxResults as number) || 10;

      const listRes = await gmail.users.messages.list({
        userId: "me",
        q: input.query as string,
        maxResults,
      });

      const messages = listRes.data.messages;
      if (!messages || messages.length === 0) {
        return "No emails found matching your query.";
      }

      const results: string[] = [];
      for (const msg of messages) {
        const detail = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date"],
        });

        const headers = detail.data.payload?.headers;
        const from = getHeader(headers, "From");
        const subject = getHeader(headers, "Subject");
        const date = getHeader(headers, "Date");
        const snippet = detail.data.snippet ?? "";

        results.push(
          `ID: ${msg.id}\n  Date: ${date}\n  From: ${from}\n  Subject: ${subject}\n  Snippet: ${snippet}`,
        );
      }

      return results.join("\n\n");
    } catch (err) {
      return `Error searching Gmail: ${(err as Error).message}`;
    }
  },
};
