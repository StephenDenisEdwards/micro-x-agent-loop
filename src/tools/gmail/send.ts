import { getGmailClient } from "./auth.js";
import type { Tool } from "../../types.js";

export const gmailSendTool: Tool = {
  name: "gmail_send",
  description: "Send an email from your Gmail account.",
  inputSchema: {
    type: "object",
    properties: {
      to: {
        type: "string",
        description: "Recipient email address",
      },
      subject: {
        type: "string",
        description: "Email subject line",
      },
      body: {
        type: "string",
        description: "Email body (plain text)",
      },
    },
    required: ["to", "subject", "body"],
  },
  async execute(input) {
    try {
      const gmail = await getGmailClient();
      const to = input.to as string;
      const subject = input.subject as string;
      const body = input.body as string;

      const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        body,
      ].join("\r\n");

      const encodedMessage = Buffer.from(message)
        .toString("base64url");

      const res = await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw: encodedMessage },
      });

      return `Email sent successfully (ID: ${res.data.id})`;
    } catch (err) {
      return `Error sending email: ${(err as Error).message}`;
    }
  },
};
