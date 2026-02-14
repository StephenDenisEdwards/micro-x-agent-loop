export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute(input: Record<string, unknown>): Promise<string>;
}

export interface AgentConfig {
  model: string;
  maxTokens: number;
  apiKey: string;
  tools: Tool[];
  systemPrompt: string;
}
