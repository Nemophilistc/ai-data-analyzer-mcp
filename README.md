# AI Data Analyzer MCP

[![npm version](https://img.shields.io/npm/v/ai-data-analyzer-mcp)](https://www.npmjs.com/package/ai-data-analyzer-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> AI-powered database analyzer MCP Server. Connect your database, get automatic insights.

## What is this?

AI Data Analyzer MCP is an MCP (Model Context Protocol) Server that connects to your database and acts as an AI data analyst. Instead of manually writing SQL queries, you get automatic health checks, proactive insights, and natural language Q&A.

**Unlike DBHub or Google MCP Toolbox** (which are SQL translators for developers), this tool thinks like a senior data analyst — it proactively discovers issues, patterns, and opportunities you didn't know to ask about.

**Use case**: Connect your PostgreSQL or SQLite database, and within seconds get a data quality report, key business metrics, hidden anomalies, and actionable recommendations.

## Quick Start

### Claude Code

```bash
# Add to Claude Code MCP settings
npx ai-data-analyzer-mcp
```

Add to your Claude Code MCP config (`~/.claude/claude_code_config.json`):

```json
{
  "mcpServers": {
    "ai-data-analyzer": {
      "command": "npx",
      "args": ["ai-data-analyzer-mcp"],
      "env": {
        "AI_DATA_DB_TYPE": "sqlite",
        "AI_DATA_DB_FILE": "./your-database.db",
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

### Cursor

Add to your Cursor MCP config (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "ai-data-analyzer": {
      "command": "npx",
      "args": ["ai-data-analyzer-mcp"],
      "env": {
        "AI_DATA_DB_TYPE": "postgresql",
        "AI_DATA_DB_CONNECTION_STRING": "postgres://user:pass@localhost:5432/mydb",
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_DATA_DB_TYPE` | Yes | `postgresql` or `sqlite` |
| `AI_DATA_DB_CONNECTION_STRING` | PG | PostgreSQL connection string |
| `AI_DATA_DB_FILE` | SQLite | Path to SQLite database file |
| `ANTHROPIC_API_KEY` | Yes* | Anthropic API key (Claude) |
| `OPENAI_API_KEY` | Yes* | OpenAI API key (GPT-4o) |

*One of `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` is required.

## Available Tools

### `connect_database`
Connect to a database. Must be called first before any analysis.

**Parameters:**
- `type` (required): `"postgresql"` or `"sqlite"`
- `connectionString`: PostgreSQL connection string
- `filePath`: SQLite file path

### `analyze_schema`
Analyze the connected database schema. Automatically detects the business domain (e-commerce, content platform, etc.) and provides a structural overview.

**Parameters:** None

### `data_health_check`
Run a comprehensive data health check. Detects data quality issues, calculates key metrics, finds anomalies, and identifies business risks.

**Parameters:**
- `sampleSize` (optional): Rows to sample (default: 1000)

### `discover_insights`
Proactively discover hidden patterns, opportunities, risks, and trends in the data.

**Parameters:**
- `focus` (optional): Focus area, e.g. `"revenue"`, `"user_retention"`
- `maxInsights` (optional): Max insights to return (default: 5)

### `ask_question`
Ask a natural language question about the data. The AI will generate SQL, execute it, and provide an interpreted analysis.

**Parameters:**
- `question` (required): Your question about the data
- `includeSql` (optional): Include generated SQL in response (default: true)

## Supported Databases

### PostgreSQL

```json
{
  "AI_DATA_DB_TYPE": "postgresql",
  "AI_DATA_DB_CONNECTION_STRING": "postgres://user:password@host:5432/dbname"
}
```

Or use individual parameters:
```json
{
  "AI_DATA_DB_TYPE": "postgresql",
  "AI_DATA_DB_HOST": "localhost",
  "AI_DATA_DB_PORT": "5432",
  "AI_DATA_DB_NAME": "mydb",
  "AI_DATA_DB_USER": "myuser",
  "AI_DATA_DB_PASSWORD": "mypass"
}
```

### SQLite

```json
{
  "AI_DATA_DB_TYPE": "sqlite",
  "AI_DATA_DB_FILE": "./path/to/database.db"
}
```

## How it works

```mermaid
graph TB
    Client["🖥️ MCP Client<br/><i>Claude Code / Cursor</i>"]
    Server["⚡ AI Data Analyzer MCP Server"]
    Schema["📋 Schema Reader<br/><i>Tables, Columns, Relations</i>"]
    Domain["🎯 Domain Detector<br/><i>Keyword + AI Inference</i>"]
    AI["🤖 AI Client<br/><i>Claude / GPT</i>"]
    Analyzers["🔬 Analyzer Modules"]
    Health["❤️ Health Checker"]
    Insight["💡 Insight Engine"]
    Question["❓ Question Handler"]
    DB["🗄️ Database Connector"]
    PG["🐘 PostgreSQL"]
    SQLite["📦 SQLite"]

    Client ==>|"MCP Protocol"| Server
    Server --> Schema
    Server --> Domain
    Server --> AI
    Schema --> Analyzers
    Domain --> Analyzers
    AI --> Analyzers
    Analyzers --> Health
    Analyzers --> Insight
    Analyzers --> Question
    Health --> DB
    Insight --> DB
    Question --> DB
    DB --> PG
    DB --> SQLite

    classDef client fill:#6366f1,stroke:#4f46e5,color:white,stroke-width:2px
    classDef server fill:#f59e0b,stroke:#d97706,color:white,stroke-width:2px
    classDef component fill:#10b981,stroke:#059669,color:white,stroke-width:2px
    classDef analyzer fill:#8b5cf6,stroke:#7c3aed,color:white,stroke-width:2px
    classDef db fill:#ef4444,stroke:#dc2626,color:white,stroke-width:2px

    class Client client
    class Server server
    class Schema,Domain,AI component
    class Analyzers,Health,Insight,Question analyzer
    class DB,PG,SQLite db
```

**Three-layer architecture:**
1. **Schema Discovery** — Reads database structure (tables, columns, relationships)
2. **Domain Detection** — Identifies business domain via keyword matching + AI inference
3. **AI Analysis** — Generates insights, health reports, and answers questions

## Examples

### Example 1: Database Health Check

```
User: Check the health of my database

AI: I'll analyze your database. Let me start by connecting and running a health check.

[connect_database → data_health_check]

Results:
- Data Quality: 3 issues found (2 medium, 1 high severity)
- Key Metrics: 1,234 users, 5,678 orders, $89,012 GMV
- Anomalies: Unusual spike in refunds on March 15
- Risks: 15% of user emails are NULL
```

### Example 2: Natural Language Q&A

```
User: What are my top 5 products by revenue last month?

AI: Let me query your database for that information.

[ask_question]

Answer: Your top 5 products by revenue in April 2026:
1. MacBook Pro — $14,999 (15 units)
2. iPhone 15 — $7,999 (23 units)
...
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
