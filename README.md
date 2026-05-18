# AI Data Analyzer

[![npm version](https://img.shields.io/npm/v/ai-data-analyzer-mcp)](https://www.npmjs.com/package/ai-data-analyzer-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> One command to analyze any database with AI. No configuration files, no setup hassle.

## Quick Start

```bash
npx ai-data-analyzer
```

That's it. On first run, you'll be guided to choose an AI provider and enter your API key. Then a browser window opens with a chat interface — just start asking questions about your data.

```
$ npx ai-data-analyzer

  🔍 AI Data Analyzer
  AI-powered database analysis tool

  === First Time Setup ===

  Select AI provider:
    1) OpenAI     (GPT-4o, needs API key)
    2) DeepSeek   (DeepSeek-V3, needs API key)
    3) Ollama     (local models, free)

  Enter number (1-3): 2
  Enter DeepSeek API Key: sk-xxxx

  ✓ Configuration saved to .env
  ✓ Server running at http://localhost:3456
```

In the web UI, connect a database and start chatting:

- "帮我做一次数据体检"
- "这个数据库里有什么隐藏的趋势？"
- "上个月收入最高的产品是什么？"

## Features

- **One command launch** — `npx ai-data-analyzer` and you're ready
- **Multiple AI providers** — OpenAI, DeepSeek, Ollama (local, free)
- **Smart analysis** — Not just SQL translation. Proactive health checks, anomaly detection, trend discovery
- **Natural language** — Ask questions in plain English/Chinese, get interpreted answers
- **Safe by design** — Read-only queries, no data modification possible
- **Dual mode** — Web UI for everyone, MCP Server for developers

## Supported Databases

| Database | Connection |
|----------|-----------|
| SQLite | File path (e.g. `./data.db`) |
| PostgreSQL | Connection string (e.g. `postgres://user:pass@host:5432/db`) |

## Supported AI Providers

| Provider | API Key | Model | Base URL |
|----------|---------|-------|----------|
| OpenAI | Required | gpt-4o | api.openai.com |
| DeepSeek | Required | deepseek-chat | api.deepseek.com |
| Ollama | Not needed | qwen2.5:7b | localhost:11434 |

## MCP Server Mode

This tool also works as an MCP Server for Claude Code, Cursor, and other MCP-compatible clients.

### Claude Code

```bash
claude mcp add ai-data-analyzer -- npx ai-data-analyzer-mcp
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "ai-data-analyzer": {
      "command": "npx",
      "args": ["ai-data-analyzer-mcp"]
    }
  }
}
```

### Environment Variables (MCP mode)

| Variable | Description |
|----------|-------------|
| `AI_DATA_DB_TYPE` | `postgresql` or `sqlite` |
| `AI_DATA_DB_FILE` | SQLite file path |
| `AI_DATA_DB_CONNECTION_STRING` | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `OPENAI_API_KEY` | OpenAI API key |

## Available Tools

### `connect_database`
Connect to a PostgreSQL or SQLite database. Must be called first.

### `analyze_schema`
Analyze database structure. Auto-detects business domain (e-commerce, content platform, etc.).

### `data_health_check`
Comprehensive quality check — finds anomalies, missing data, inconsistencies, and business risks.

### `discover_insights`
Proactively discover hidden patterns, trends, and opportunities in your data.

### `ask_question`
Natural language Q&A. The AI generates SQL, executes it, and interprets the results.

## Architecture

```mermaid
graph TB
    subgraph "Web Mode"
        Browser["🌐 Browser"] -->|"HTTP"| WebServer["⚡ Web Server"]
    end
    subgraph "MCP Mode"
        MCPClient["🖥️ MCP Client"] -->|"MCP Protocol"| MCPServer["⚡ MCP Server"]
    end
    WebServer --> AI["🤖 AI Provider"]
    MCPServer --> AI
    AI --> Analyzers["🔬 Analyzers"]
    Analyzers --> Health["❤️ Health Check"]
    Analyzers --> Insight["💡 Insights"]
    Analyzers --> Question["❓ Q&A"]
    Analyzers --> Domain["🎯 Domain Detection"]
    Analyzers --> DB["🗄️ Database"]
    DB --> PG["🐘 PostgreSQL"]
    DB --> SQLite["📦 SQLite"]

    classDef web fill:#6366f1,stroke:#4f46e5,color:white,stroke-width:2px
    classDef mcp fill:#f59e0b,stroke:#d97706,color:white,stroke-width:2px
    classDef ai fill:#10b981,stroke:#059669,color:white,stroke-width:2px
    classDef analyzer fill:#8b5cf6,stroke:#7c3aed,color:white,stroke-width:2px
    classDef db fill:#ef4444,stroke:#dc2626,color:white,stroke-width:2px

    class Browser,WebServer web
    class MCPClient,MCPServer mcp
    class AI ai
    class Analyzers,Health,Insight,Question,Domain analyzer
    class DB,PG,SQLite db
```

## Contributing

Contributions welcome! Please submit a Pull Request.

## License

MIT
