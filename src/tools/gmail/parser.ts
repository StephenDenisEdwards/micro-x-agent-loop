import * as cheerio from "cheerio";
import type { gmail_v1 } from "googleapis";

// Helper to get a header value from a Gmail message
export function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string,
): string {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

// Helper to decode base64url-encoded body
export function decodeBody(data: string): string {
  return Buffer.from(data, "base64url").toString("utf-8");
}

// Convert HTML to readable plain text
export function htmlToText(html: string): string {
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
export function extractText(payload: gmail_v1.Schema$MessagePart): string {
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
