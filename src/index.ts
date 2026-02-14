import "dotenv/config";
import * as readline from "node:readline";
import { Agent } from "./agent.js";
import { builtinTools } from "./tools.js";
import { SYSTEM_PROMPT } from "./system-prompt.js";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("Error: ANTHROPIC_API_KEY environment variable is required.");
  process.exit(1);
}

const agent = new Agent({
  model: "claude-sonnet-4-5-20250929",
  maxTokens: 4096,
  apiKey,
  tools: builtinTools,
  systemPrompt: SYSTEM_PROMPT,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(): void {
  rl.question("you> ", async (input) => {
    const trimmed = input.trim();

    if (trimmed === "exit" || trimmed === "quit") {
      rl.close();
      return;
    }

    if (!trimmed) {
      prompt();
      return;
    }

    try {
      const response = await agent.run(trimmed);
      console.log(`\nassistant> ${response}\n`);
    } catch (err) {
      console.error(`\nError: ${(err as Error).message}\n`);
    }

    prompt();
  });
}

console.log("micro-x-agent-loop (type 'exit' to quit)");
console.log(`Tools: ${builtinTools.map((t) => t.name).join(", ")}\n`);
prompt();
