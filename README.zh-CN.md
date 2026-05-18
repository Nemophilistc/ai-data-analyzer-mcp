# AI Data Analyzer

[![npm version](https://img.shields.io/npm/v/ai-data-analyzer-mcp)](https://www.npmjs.com/package/ai-data-analyzer-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 一条命令，用 AI 分析任何数据库。无需配置文件，开箱即用。

## 快速开始

```bash
npx ai-data-analyzer
```

就这么简单。首次运行会引导你选择 AI 提供商并输入 API Key，然后自动打开浏览器，直接开始分析。

```
$ npx ai-data-analyzer

  🔍 AI Data Analyzer
  AI 驱动的数据库分析工具

  === 首次配置 ===

  选择 AI 提供商:
    1) OpenAI     (GPT-4o，需要 API Key)
    2) DeepSeek   (DeepSeek-V3，需要 API Key)
    3) Ollama     (本地模型，免费)

  输入编号 (1-3): 2
  输入 DeepSeek API Key: sk-xxxx

  ✓ 配置已保存到 .env
  ✓ 服务已启动: http://localhost:3456
```

在聊天界面中，连接数据库后直接提问：

- "帮我做一次数据体检"
- "这个数据库里有什么隐藏的趋势？"
- "上个月收入最高的产品是什么？"

## 功能特点

- **一条命令启动** — `npx ai-data-analyzer`，就这么简单
- **多 AI 提供商** — 支持 OpenAI、DeepSeek、Ollama（本地免费）
- **智能分析** — 不只是 SQL 翻译，主动做健康检查、异常检测、趋势发现
- **自然语言** — 用中文/英文提问，获得有解读的回答
- **安全设计** — 只读查询，不会修改任何数据
- **双模式** — Web UI 给所有人用，MCP Server 给开发者用

## 支持的数据库

| 数据库 | 连接方式 |
|--------|---------|
| SQLite | 文件路径（如 `./data.db`） |
| PostgreSQL | 连接字符串（如 `postgres://user:pass@host:5432/db`） |

## 支持的 AI 提供商

| 提供商 | API Key | 模型 | 地址 |
|--------|---------|------|------|
| OpenAI | 需要 | gpt-4o | api.openai.com |
| DeepSeek | 需要 | deepseek-chat | api.deepseek.com |
| Ollama | 不需要 | qwen2.5:7b | localhost:11434 |

## MCP Server 模式

本工具也可作为 MCP Server，用于 Claude Code、Cursor 等 MCP 兼容客户端。

### Claude Code

```bash
claude mcp add ai-data-analyzer -- npx ai-data-analyzer-mcp
```

### Cursor

添加到 `.cursor/mcp.json`：

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

### 环境变量（MCP 模式）

| 变量 | 说明 |
|------|------|
| `AI_DATA_DB_TYPE` | `postgresql` 或 `sqlite` |
| `AI_DATA_DB_FILE` | SQLite 文件路径 |
| `AI_DATA_DB_CONNECTION_STRING` | PostgreSQL 连接字符串 |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `OPENAI_API_KEY` | OpenAI API key |

## 可用工具

### `connect_database`
连接 PostgreSQL 或 SQLite 数据库。必须首先调用。

### `analyze_schema`
分析数据库结构，自动检测业务领域（电商、内容平台等）。

### `data_health_check`
全面数据质量检查——发现异常、缺失数据、不一致和业务风险。

### `discover_insights`
主动发现数据中隐藏的模式、趋势和机会。

### `ask_question`
自然语言问答。AI 生成 SQL、执行查询并解读结果。

## 架构

```mermaid
graph TB
    subgraph "Web 模式"
        Browser["🌐 浏览器"] -->|"HTTP"| WebServer["⚡ Web 服务"]
    end
    subgraph "MCP 模式"
        MCPClient["🖥️ MCP 客户端"] -->|"MCP 协议"| MCPServer["⚡ MCP 服务"]
    end
    WebServer --> AI["🤖 AI 提供商"]
    MCPServer --> AI
    AI --> Analyzers["🔬 分析器"]
    Analyzers --> Health["❤️ 健康检查"]
    Analyzers --> Insight["💡 洞察发现"]
    Analyzers --> Question["❓ 自然语言问答"]
    Analyzers --> Domain["🎯 领域检测"]
    Analyzers --> DB["🗄️ 数据库"]
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

## 贡献

欢迎贡献！请随时提交 Pull Request。

## 许可证

MIT
