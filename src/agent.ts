import Anthropic from "@anthropic-ai/sdk";
import type { AgentConfig, Tool } from "./types.js";
import { createClient, toAnthropicTools, chat } from "./llm.js";

export class Agent {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;
  private systemPrompt: string;
  private messages: Anthropic.Messages.MessageParam[] = [];
  private toolMap: Map<string, Tool>;
  private anthropicTools: Anthropic.Messages.Tool[];

  constructor(config: AgentConfig) {
    this.client = createClient(config.apiKey);
    this.model = config.model;
    this.maxTokens = config.maxTokens;
    this.systemPrompt = config.systemPrompt;
    this.toolMap = new Map(config.tools.map((t) => [t.name, t]));
    this.anthropicTools = toAnthropicTools(config.tools);
  }

  async run(userMessage: string): Promise<string> {
    this.messages.push({ role: "user", content: userMessage });

    while (true) {
      const response = await chat(
        this.client,
        this.model,
        this.maxTokens,
        this.systemPrompt,
        this.messages,
        this.anthropicTools,
      );

      this.messages.push({ role: "assistant", content: response.content });

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.Messages.ToolUseBlock => block.type === "tool_use",
      );

      if (toolUseBlocks.length === 0) {
        return response.content
          .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("\n");
      }

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

      for (const block of toolUseBlocks) {
        const tool = this.toolMap.get(block.name);
        if (!tool) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `Error: unknown tool "${block.name}"`,
            is_error: true,
          });
          continue;
        }

        try {
          const result = await tool.execute(block.input as Record<string, unknown>);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `Error executing tool "${block.name}": ${(err as Error).message}`,
            is_error: true,
          });
        }
      }

      this.messages.push({ role: "user", content: toolResults });
    }
  }
}
