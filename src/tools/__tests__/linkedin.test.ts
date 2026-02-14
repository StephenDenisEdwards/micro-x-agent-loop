import { describe, it, expect, vi, afterEach } from "vitest";

const mockQuery = vi.fn();
vi.mock("linkedin-jobs-api", () => ({ default: { query: mockQuery } }));

const { linkedinJobsTool, linkedinJobDetailTool } = await import(
  "../linkedin.js"
);

describe("linkedinJobsTool", () => {
  afterEach(() => {
    mockQuery.mockReset();
  });

  it("returns formatted job listings", async () => {
    mockQuery.mockResolvedValue([
      {
        position: "Software Engineer",
        company: "Acme Corp",
        location: "Remote",
        agoTime: "2 days ago",
        salary: "$120k",
        jobUrl: "https://linkedin.com/jobs/1",
      },
    ]);

    const result = await linkedinJobsTool.execute({ keyword: "engineer" });
    expect(result).toContain("1. Software Engineer");
    expect(result).toContain("Company: Acme Corp");
    expect(result).toContain("Location: Remote");
    expect(result).toContain("Salary: $120k");
    expect(result).toContain("URL: https://linkedin.com/jobs/1");
  });

  it("returns message when no results found", async () => {
    mockQuery.mockResolvedValue([]);
    const result = await linkedinJobsTool.execute({ keyword: "xyz" });
    expect(result).toBe("No job postings found matching your criteria.");
  });

  it("returns error message on failure", async () => {
    mockQuery.mockRejectedValue(new Error("Network error"));
    const result = await linkedinJobsTool.execute({ keyword: "test" });
    expect(result).toBe("Error searching LinkedIn jobs: Network error");
  });
});

describe("linkedinJobDetailTool", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns parsed job details from HTML", async () => {
    const sampleHtml = `
      <html>
        <body>
          <h1 class="top-card-layout__title">Senior Dev</h1>
          <a class="topcard__org-name-link">BigCo</a>
          <span class="topcard__flavor--bullet">New York, NY</span>
          <div class="show-more-less-html__markup">
            <p>Great job description here.</p>
          </div>
        </body>
      </html>
    `;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(sampleHtml),
      }),
    );

    const result = await linkedinJobDetailTool.execute({
      url: "https://linkedin.com/jobs/view/123",
    });
    expect(result).toContain("Title: Senior Dev");
    expect(result).toContain("Company: BigCo");
    expect(result).toContain("Location: New York, NY");
    expect(result).toContain("Great job description here.");
  });

  it("returns error message on HTTP failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403 }),
    );

    const result = await linkedinJobDetailTool.execute({
      url: "https://linkedin.com/jobs/view/999",
    });
    expect(result).toBe("Error fetching job page: HTTP 403");
  });

  it("returns error message on fetch exception", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Connection refused")),
    );

    const result = await linkedinJobDetailTool.execute({
      url: "https://linkedin.com/jobs/view/999",
    });
    expect(result).toBe("Error fetching job details: Connection refused");
  });
});
