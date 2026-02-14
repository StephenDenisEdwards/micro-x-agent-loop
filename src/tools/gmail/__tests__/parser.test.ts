import { describe, it, expect } from "vitest";
import { getHeader, decodeBody, htmlToText, extractText } from "../parser.js";

describe("getHeader", () => {
  const headers = [
    { name: "From", value: "alice@example.com" },
    { name: "Subject", value: "Hello" },
    { name: "Date", value: "Mon, 1 Jan 2024" },
  ];

  it("finds header by name (case-insensitive)", () => {
    expect(getHeader(headers, "from")).toBe("alice@example.com");
    expect(getHeader(headers, "SUBJECT")).toBe("Hello");
    expect(getHeader(headers, "Date")).toBe("Mon, 1 Jan 2024");
  });

  it("returns empty string for missing header", () => {
    expect(getHeader(headers, "To")).toBe("");
  });

  it("returns empty string for undefined headers", () => {
    expect(getHeader(undefined, "From")).toBe("");
  });
});

describe("decodeBody", () => {
  it("decodes base64url encoded string", () => {
    const encoded = Buffer.from("Hello, World!", "utf-8").toString("base64url");
    expect(decodeBody(encoded)).toBe("Hello, World!");
  });
});

describe("htmlToText", () => {
  it("strips HTML tags and returns text", () => {
    expect(htmlToText("<p>Hello</p>")).toContain("Hello");
  });

  it("converts <br> to newlines", () => {
    const result = htmlToText("line1<br>line2");
    expect(result).toContain("line1");
    expect(result).toContain("line2");
  });

  it("converts list items with dashes", () => {
    const result = htmlToText("<ul><li>one</li><li>two</li></ul>");
    expect(result).toContain("- one");
    expect(result).toContain("- two");
  });

  it("removes script and style elements", () => {
    const result = htmlToText(
      "<script>alert('x')</script><style>.x{}</style><p>visible</p>",
    );
    expect(result).not.toContain("alert");
    expect(result).not.toContain(".x{}");
    expect(result).toContain("visible");
  });

  it("handles block elements with line breaks", () => {
    const result = htmlToText("<div>block1</div><div>block2</div>");
    expect(result).toContain("block1");
    expect(result).toContain("block2");
  });
});

describe("extractText", () => {
  it("extracts text/plain leaf", () => {
    const encoded = Buffer.from("plain text", "utf-8").toString("base64url");
    const result = extractText({
      mimeType: "text/plain",
      body: { data: encoded },
    });
    expect(result).toBe("plain text");
  });

  it("extracts text/html leaf and converts to text", () => {
    const html = "<p>html content</p>";
    const encoded = Buffer.from(html, "utf-8").toString("base64url");
    const result = extractText({
      mimeType: "text/html",
      body: { data: encoded },
    });
    expect(result).toContain("html content");
  });

  it("handles multipart/alternative (prefers HTML)", () => {
    const plainEncoded = Buffer.from("plain version", "utf-8").toString(
      "base64url",
    );
    const htmlEncoded = Buffer.from("<p>html version</p>", "utf-8").toString(
      "base64url",
    );

    const result = extractText({
      mimeType: "multipart/alternative",
      parts: [
        { mimeType: "text/plain", body: { data: plainEncoded } },
        { mimeType: "text/html", body: { data: htmlEncoded } },
      ],
    });
    expect(result).toContain("html version");
    expect(result).not.toContain("plain version");
  });

  it("falls back to text/plain in multipart/alternative when no HTML", () => {
    const plainEncoded = Buffer.from("fallback plain", "utf-8").toString(
      "base64url",
    );

    const result = extractText({
      mimeType: "multipart/alternative",
      parts: [{ mimeType: "text/plain", body: { data: plainEncoded } }],
    });
    expect(result).toBe("fallback plain");
  });

  it("handles multipart/mixed (concatenates parts)", () => {
    const part1 = Buffer.from("part one", "utf-8").toString("base64url");
    const part2 = Buffer.from("part two", "utf-8").toString("base64url");

    const result = extractText({
      mimeType: "multipart/mixed",
      parts: [
        { mimeType: "text/plain", body: { data: part1 } },
        { mimeType: "text/plain", body: { data: part2 } },
      ],
    });
    expect(result).toContain("part one");
    expect(result).toContain("part two");
  });

  it("handles nested multipart structures", () => {
    const htmlEncoded = Buffer.from("<p>nested html</p>", "utf-8").toString(
      "base64url",
    );

    const result = extractText({
      mimeType: "multipart/mixed",
      parts: [
        {
          mimeType: "multipart/alternative",
          parts: [{ mimeType: "text/html", body: { data: htmlEncoded } }],
        },
      ],
    });
    expect(result).toContain("nested html");
  });

  it("returns empty string for empty payload", () => {
    const result = extractText({ mimeType: "multipart/mixed", parts: [] });
    expect(result).toBe("");
  });
});
