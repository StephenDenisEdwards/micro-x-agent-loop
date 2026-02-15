import { getGmailClient } from "./auth.js";
import { getHeader, extractText } from "./parser.js";
import type { Tool } from "../../types.js";

export const gmailReadTool: Tool = {
  name: "gmail_read",
  description:
    "Read the full content of a Gmail email by its message ID (from gmail_search results).",
  inputSchema: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "The Gmail message ID (from gmail_search results)",
      },
    },
    required: ["messageId"],
  },
  async execute(input) {
    try {
      const gmail = await getGmailClient();
      const res = await gmail.users.messages.get({
        userId: "me",
        id: input.messageId as string,
        format: "full",
      });

      const headers = res.data.payload?.headers;
      const from = getHeader(headers, "From");
      const to = getHeader(headers, "To");
      const subject = getHeader(headers, "Subject");
      const date = getHeader(headers, "Date");

      const body = extractText(res.data.payload!) || "(no text content)";

      return `From: ${from}\nTo: ${to}\nDate: ${date}\nSubject: ${subject}\n\n${body}`;
    } catch (err) {
      return `Error reading email: ${(err as Error).message}`;
    }
  },
};
