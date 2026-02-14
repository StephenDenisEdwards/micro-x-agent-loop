import { google, type gmail_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import * as http from "node:http";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as cheerio from "cheerio";
import type { Tool } from "./types.js";

const TOKEN_PATH = path.resolve(".", ".gmail-token.json");
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];
const REDIRECT_URI = "http://localhost:3000/oauth2callback";

interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

function createOAuth2Client(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env",
    );
  }
  return new OAuth2Client(clientId, clientSecret, REDIRECT_URI);
}

async function loadSavedTokens(): Promise<StoredTokens | null> {
  try {
    const data = await fs.readFile(TOKEN_PATH, "utf-8");
    return JSON.parse(data) as StoredTokens;
  } catch {
    return null;
  }
}

async function saveTokens(tokens: StoredTokens): Promise<void> {
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2), "utf-8");
}

function authorizeViaBrowser(oauth2Client: OAuth2Client): Promise<void> {
  return new Promise((resolve, reject) => {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent",
    });

    const server = http.createServer(async (req, res) => {
      if (!req.url?.startsWith("/oauth2callback")) return;

      const url = new URL(req.url, "http://localhost:3000");
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`<h1>Authorization failed: ${error}</h1>`);
        server.close();
        reject(new Error(`Google OAuth error: ${error}`));
        return;
      }

      if (!code) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end("<h1>No authorization code received</h1>");
        return;
      }

      try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        await saveTokens({
          access_token: tokens.access_token!,
          refresh_token: tokens.refresh_token!,
          expiry_date: tokens.expiry_date!,
        });

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          "<h1>Authorization successful!</h1><p>You can close this tab and return to the agent.</p>",
        );
        server.close();
        resolve();
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end(`<h1>Token exchange failed</h1>`);
        server.close();
        reject(err);
      }
    });

    server.listen(3000, () => {
      console.log(`\n[Gmail] Opening browser for authorization...`);
      console.log(`[Gmail] If it doesn't open, visit: ${authUrl}\n`);

      // Open browser cross-platform
      const cmd =
        process.platform === "win32"
          ? "start"
          : process.platform === "darwin"
            ? "open"
            : "xdg-open";
      import("node:child_process").then(({ exec }) => {
        exec(`${cmd} "${authUrl}"`);
      });
    });
  });
}

let gmailClient: gmail_v1.Gmail | null = null;

async function getGmailClient(): Promise<gmail_v1.Gmail> {
  if (gmailClient) return gmailClient;

  const oauth2Client = createOAuth2Client();
  const tokens = await loadSavedTokens();

  if (tokens) {
    oauth2Client.setCredentials(tokens);
    // Refresh listener to persist updated tokens
    oauth2Client.on("tokens", async (newTokens) => {
      const merged: StoredTokens = {
        access_token: newTokens.access_token ?? tokens.access_token,
        refresh_token: newTokens.refresh_token ?? tokens.refresh_token,
        expiry_date: newTokens.expiry_date ?? tokens.expiry_date,
      };
      await saveTokens(merged);
    });
  } else {
    await authorizeViaBrowser(oauth2Client);
  }

  gmailClient = google.gmail({ version: "v1", auth: oauth2Client });
  return gmailClient;
}

// Helper to get a header value from a Gmail message
function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string,
): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

// Helper to decode base64url-encoded body
function decodeBody(data: string): string {
  return Buffer.from(data, "base64url").toString("utf-8");
}

// Convert HTML to readable plain text
function htmlToText(html: string): string {
  const $ = cheerio.load(html);

  // Remove non-visible elements
  $("script, style, head").remove();

  // Insert line breaks for block elements
  $("br").replaceWith("\n");
  $("p, div, tr, h1, h2, h3, h4, h5, h6, blockquote").each((_i, el) => {
    $(el).prepend("\n").append("\n");
  });
  $("li").each((_i, el) => {
    $(el).prepend("\n- ");
  });
  $("td, th").each((_i, el) => {
    $(el).append("\t");
  });

  return $("body").text()
    .replace(/\t+/g, "  ")
    .replace(/ {3,}/g, "  ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Recursively collect the best text from a message payload.
// For multipart/alternative, prefer HTML (the richest representation).
// For other multipart types, concatenate content from all sub-parts.
function extractText(payload: gmail_v1.Schema$MessagePart): string {
  // Leaf node with data
  if (payload.body?.data) {
    if (payload.mimeType === "text/plain") {
      return decodeBody(payload.body.data);
    }
    if (payload.mimeType === "text/html") {
      return htmlToText(decodeBody(payload.body.data));
    }
  }

  if (!payload.parts || payload.parts.length === 0) return "";

  // multipart/alternative — pick the richest version
  if (payload.mimeType === "multipart/alternative") {
    // Try HTML first (usually the last part and the most complete)
    for (const part of [...payload.parts].reverse()) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return htmlToText(decodeBody(part.body.data));
      }
    }
    // Recurse into nested multipart children (e.g. multipart/related inside alternative)
    for (const part of [...payload.parts].reverse()) {
      if (part.mimeType?.startsWith("multipart/")) {
        const text = extractText(part);
        if (text) return text;
      }
    }
    // Fall back to text/plain
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBody(part.body.data);
      }
    }
  }

  // multipart/mixed, multipart/related, etc. — concatenate all readable parts
  const sections: string[] = [];
  for (const part of payload.parts) {
    const text = extractText(part);
    if (text) sections.push(text);
  }
  return sections.join("\n\n");
}

// --- Tools ---

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
