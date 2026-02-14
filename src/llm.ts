import Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "./types.js";

export function createClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

export function toAnthropicTools(
  tools: Tool[],
): Anthropic.Messages.Tool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: "object" as const,
      ...(t.inputSchema as Record<string, unknown>),
    },
  }));
}

export async function chat(
  client: Anthropic,
  model: string,
  maxTokens: number,
  systemPrompt: string,
  messages: Anthropic.Messages.MessageParam[],
  tools: Anthropic.Messages.Tool[],
): Promise<Anthropic.Messages.Message> {
  return client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
    tools,
  });
}
