# Batching vs RAG for Job Suitability Scoring

## The Problem

When processing ~24 JobServe emails against a CV, the agent tries to hold all emails in context simultaneously. This causes the model to hit `max_tokens` limits, which led to broken tool-use message history and API errors.

## Why RAG Is Not the Right Fit Here

RAG (Retrieval-Augmented Generation) with a vector database solves a different problem: finding relevant chunks from a large corpus that won't fit in context. It doesn't help here because:

- **The CV is small** — a single document that fits easily within the context window.
- **Every job spec must be evaluated** — there is no retrieval step. We need to score all 24, not search for a subset.
- **Accuracy requires full context** — chunking the CV or job specs into embedding fragments risks losing details (skills, experience dates, certifications) that directly affect the suitability score.
- **Added complexity for no gain** — RAG requires an embedding model, a vector database, a chunking strategy, and retrieval tuning. None of that helps when the dataset is small and every item must be processed.

### When RAG Would Make Sense

- Thousands of job specs where you need to find the top N most relevant.
- A large document corpus (multiple CVs, portfolios, reference materials).
- Open-ended queries like "find jobs matching criteria X" from a massive pool.

## Recommended Approach: Sequential Batching

Process one job email at a time rather than loading all of them into context at once.

### How It Works

1. **Read the CV once** and keep it in the system prompt or as a persistent context block.
2. **Search for all matching emails** and collect their IDs/metadata (lightweight — no full content yet).
3. **For each email**, in a loop:
   - Read the full email content.
   - Send a focused prompt: CV + single job spec.
   - Extract the suitability summary and fit score.
   - Append the result to an output file.
   - Discard the job spec from context before moving to the next one.
4. **Output a final summary** document with all results.

### Benefits

| Concern | All-at-once | Sequential batching |
|---|---|---|
| Token usage per API call | Grows with every email | Flat (CV + 1 job spec) |
| Risk of hitting `max_tokens` | High at ~24 emails | Low |
| Scales to more emails | Poorly | Linearly |
| Implementation complexity | Simpler loop | Slightly more orchestration |
| Accuracy | May lose detail under token pressure | Full context for every evaluation |

### Implementation Outline

```typescript
async function scoreJobs(agent: Agent, cvText: string, emailIds: string[]): Promise<void> {
  const results: JobResult[] = [];

  for (const emailId of emailIds) {
    // Read one email at a time
    const emailContent = await readEmail(emailId);

    // Score with full CV + single job spec in context
    const prompt = [
      `Here is my CV:\n${cvText}`,
      `Here is a job specification:\n${emailContent}`,
      `Write a 2-3 sentence suitability summary and a fit score out of 10.`,
    ].join("\n\n");

    const response = await agent.run(prompt);
    results.push({ emailId, response });
  }

  // Write all results to a single output file
  await writeResults(results);
}
```

### Key Design Decisions

- **CV stays in context for every call** — it's small enough and every evaluation needs it.
- **One email per iteration** — keeps token usage predictable and avoids truncation.
- **Results written incrementally** — if the process fails partway through, partial results are preserved.
- **No vector database needed** — the dataset is small and every item must be processed. Simple iteration is sufficient.
