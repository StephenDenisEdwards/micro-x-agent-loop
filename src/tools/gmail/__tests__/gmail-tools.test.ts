import { describe, it, expect, vi, afterEach } from "vitest";

// Mock auth module before importing tools
const mockList = vi.fn();
const mockGet = vi.fn();
const mockSend = vi.fn();

vi.mock("../auth.js", () => ({
  getGmailClient: vi.fn().mockResolvedValue({
    users: {
      messages: {
        list: mockList,
        get: mockGet,
        send: mockSend,
      },
    },
  }),
}));

// Import after mocks are set up
const { gmailSearchTool } = await import("../search.js");
const { gmailReadTool } = await import("../read.js");
const { gmailSendTool } = await import("../send.js");

afterEach(() => {
  vi.restoreAllMocks();
  mockList.mockReset();
  mockGet.mockReset();
  mockSend.mockReset();
});

describe("gmailSearchTool", () => {
  it("returns formatted search results", async () => {
    mockList.mockResolvedValue({
      data: { messages: [{ id: "msg1" }] },
    });
    mockGet.mockResolvedValue({
      data: {
        payload: {
          headers: [
            { name: "From", value: "bob@example.com" },
            { name: "Subject", value: "Test email" },
            { name: "Date", value: "Tue, 2 Jan 2024" },
          ],
        },
        snippet: "Preview text...",
      },
    });

    const result = await gmailSearchTool.execute({ query: "is:unread" });
    expect(result).toContain("ID: msg1");
    expect(result).toContain("From: bob@example.com");
    expect(result).toContain("Subject: Test email");
    expect(result).toContain("Date: Tue, 2 Jan 2024");
    expect(result).toContain("Snippet: Preview text...");
  });

  it("returns message when no results found", async () => {
    mockList.mockResolvedValue({ data: { messages: null } });
    const result = await gmailSearchTool.execute({ query: "nonexistent" });
    expect(result).toBe("No emails found matching your query.");
  });

  it("returns error message on failure", async () => {
    mockList.mockRejectedValue(new Error("Auth failed"));
    const result = await gmailSearchTool.execute({ query: "test" });
    expect(result).toBe("Error searching Gmail: Auth failed");
  });
});

describe("gmailReadTool", () => {
  it("returns formatted email with headers and body", async () => {
    const bodyEncoded = Buffer.from("Email body text", "utf-8").toString(
      "base64url",
    );
    mockGet.mockResolvedValue({
      data: {
        payload: {
          mimeType: "text/plain",
          body: { data: bodyEncoded },
          headers: [
            { name: "From", value: "alice@example.com" },
            { name: "To", value: "bob@example.com" },
            { name: "Subject", value: "Hello" },
            { name: "Date", value: "Wed, 3 Jan 2024" },
          ],
        },
      },
    });

    const result = await gmailReadTool.execute({ messageId: "msg1" });
    expect(result).toContain("From: alice@example.com");
    expect(result).toContain("To: bob@example.com");
    expect(result).toContain("Subject: Hello");
    expect(result).toContain("Date: Wed, 3 Jan 2024");
    expect(result).toContain("Email body text");
  });

  it("returns error message on failure", async () => {
    mockGet.mockRejectedValue(new Error("Not found"));
    const result = await gmailReadTool.execute({ messageId: "bad-id" });
    expect(result).toBe("Error reading email: Not found");
  });
});

describe("gmailSendTool", () => {
  it("returns success message with email ID", async () => {
    mockSend.mockResolvedValue({ data: { id: "sent-123" } });

    const result = await gmailSendTool.execute({
      to: "recipient@example.com",
      subject: "Test",
      body: "Hello!",
    });
    expect(result).toBe("Email sent successfully (ID: sent-123)");
  });

  it("returns error message on failure", async () => {
    mockSend.mockRejectedValue(new Error("Quota exceeded"));
    const result = await gmailSendTool.execute({
      to: "x@example.com",
      subject: "Test",
      body: "Hello",
    });
    expect(result).toBe("Error sending email: Quota exceeded");
  });
});
