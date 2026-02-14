# micro-x-agent-loop

A lightweight autonomous AI agent loop, starting simple and evolving toward a full-featured personal AI assistant inspired by [OpenClaw](https://github.com/openclaw/openclaw).

## About

This project begins as a minimal agent loop — the core cycle of perceiving, reasoning, and acting that underpins autonomous AI agents. The goal is to build a solid foundation first, then incrementally add capabilities to approach the functionality of projects like OpenClaw: an open-source autonomous agent that executes real-world tasks via LLMs across multiple platforms and integrations.

## Roadmap

### Phase 1 — Simple Agent Loop
- Basic prompt-response loop with an LLM
- Tool/action execution framework
- Simple memory and context management

### Phase 2 — Skills & Integrations
- Plugin/skill system for extensible capabilities
- File system, web browsing, and command execution skills
- Multi-model support

### Phase 3 — Multi-Platform & Autonomy
- Messaging platform integrations (Slack, Discord, Telegram, etc.)
- Autonomous task planning and execution
- Permission and safety controls

## Getting Started

### Prerequisites

- Node.js >= 20
- An Anthropic API key ([get one here](https://console.anthropic.com/))

### Installation

```bash
git clone https://github.com/StephenDenisEdwards/micro-x-agent-loop.git
cd micro-x-agent-loop
npm install
```

### Configuration

Create a `.env` file in the project root with your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Run

```bash
npm run build
npm start
```

You'll see the available tools listed on startup, then a `you>` prompt. Type `exit` or `quit` to stop.

## Example Prompts

```
you> What files are in the current directory?
you> Read package.json and tell me the version
you> Create a file called hello.txt that says "Hello World"
you> Find remote software engineer jobs in New York
you> Search for entry level data analyst jobs posted this week
```

## Available Tools

| Tool | Description |
|------|-------------|
| `bash` | Execute shell commands |
| `read_file` | Read file contents |
| `write_file` | Write content to a file |
| `linkedin_jobs` | Search LinkedIn job postings |

## License

TBD
