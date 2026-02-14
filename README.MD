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

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Gmail integration (optional)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

To use the Gmail tools you need a Google Cloud project with the Gmail API enabled and an OAuth 2.0 Client ID (type "Desktop app" or "Web application" with `http://localhost:3000/oauth2callback` as a redirect URI). On first use the agent will open a browser window for you to authorize access.

### Run

```bash
npm run build
npm start
```

You'll see the available tools listed on startup, then a `you>` prompt. Type `exit` or `quit` to stop.

## Example Prompts

### Files & Shell

```
you> What files are in the current directory?
you> Read package.json and tell me the version
you> Create a file called hello.txt that says "Hello World"
```

### LinkedIn Jobs

```
you> Find remote software engineer jobs in New York
you> Search for entry level data analyst jobs posted this week
```

### Gmail

```
you> Check my inbox for unread emails
you> Search my email for messages from alice@example.com in the last week
you> Find emails with subject "invoice" received this month
you> Read email ID 18f3a... and summarize it
you> Send an email to bob@example.com with subject "Meeting tomorrow" saying I'll be 10 minutes late
you> Show me all starred emails from the last 3 days
```

## Available Tools

| Tool | Description |
|------|-------------|
| `bash` | Execute shell commands |
| `read_file` | Read file contents |
| `write_file` | Write content to a file |
| `linkedin_jobs` | Search LinkedIn job postings |
| `linkedin_job_detail` | Fetch full description for a LinkedIn job URL |
| `gmail_search` | Search Gmail using Gmail search syntax |
| `gmail_read` | Read the full content of an email by message ID |
| `gmail_send` | Send an email from your Gmail account |

## License

TBD
