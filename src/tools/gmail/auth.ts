import { google, type gmail_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import * as http from "node:http";
import * as fs from "node:fs/promises";
import * as path from "node:path";

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

export async function getGmailClient(): Promise<gmail_v1.Gmail> {
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
