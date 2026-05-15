# AI Data Analyzer MCP

[![npm version](https://img.shields.io/npm/v/ai-data-analyzer-mcp)](https://www.npmjs.com/package/ai-data-analyzer-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> AI 驱动的数据库分析 MCP Server。连接数据库，自动获得洞察。

## 这是什么？

AI Data Analyzer MCP 是一个 MCP (Model Context Protocol) Server，连接到你的数据库并充当 AI 数据分析师。无需手动编写 SQL 查询，即可获得自动健康检查、主动洞察和自然语言问答。

**与 DBHub 或 Google MCP Toolbox 的区别**：那些工具是面向开发者的 SQL 翻译器，而这个工具像高级数据分析师一样思考——它主动发现问题、模式和机会，而不需要你先提出问题。

**使用场景**：连接你的 PostgreSQL 或 SQLite 数据库，几秒内获得数据质量报告、关键业务指标、隐藏异常和可执行建议。

## 快速开始

### Claude Code

```bash
npx ai-data-analyzer-mcp
```

添加到 Claude Code MCP 配置 (`~/.claude/claude_code_config.json`)：

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

添加到 Cursor MCP 配置 (`.cursor/mcp.json`)：

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

### 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `AI_DATA_DB_TYPE` | 是 | `postgresql` 或 `sqlite` |
| `AI_DATA_DB_CONNECTION_STRING` | PG | PostgreSQL 连接字符串 |
| `AI_DATA_DB_FILE` | SQLite | SQLite 数据库文件路径 |
| `ANTHROPIC_API_KEY` | 是* | Anthropic API key (Claude) |
| `OPENAI_API_KEY` | 是* | OpenAI API key (GPT-4o) |

*`ANTHROPIC_API_KEY` 或 `OPENAI_API_KEY` 需要设置其中一个。

## 可用工具

### `connect_database`
连接数据库。必须首先调用。

**参数：**
- `type`（必需）：`"postgresql"` 或 `"sqlite"`
- `connectionString`：PostgreSQL 连接字符串
- `filePath`：SQLite 文件路径

### `analyze_schema`
分析数据库 schema。自动检测业务领域（电商、内容平台等）并提供结构概览。

**参数：** 无

### `data_health_check`
运行全面的数据健康检查。检测数据质量问题、计算关键指标、发现异常、识别业务风险。

**参数：**
- `sampleSize`（可选）：采样行数（默认：1000）

### `discover_insights`
主动发现数据中隐藏的模式、机会、风险和趋势。

**参数：**
- `focus`（可选）：重点领域，如 `"revenue"`、`"user_retention"`
- `maxInsights`（可选）：最大洞察数（默认：5）

### `ask_question`
用自然语言提问。AI 会生成 SQL、执行查询并提供分析解读。

**参数：**
- `question`（必需）：你的问题
- `includeSql`（可选）：是否在响应中包含生成的 SQL（默认：true）

## 支持的数据库

### PostgreSQL

```json
{
  "AI_DATA_DB_TYPE": "postgresql",
  "AI_DATA_DB_CONNECTION_STRING": "postgres://user:password@host:5432/dbname"
}
```

或使用单独参数：
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

## 工作原理

```
┌─────────────────────────────────────────────────────┐
│                    MCP 客户端                        │
│              (Claude Code / Cursor)                  │
└──────────────────────┬──────────────────────────────┘
                       │ MCP 协议
                       ▼
┌─────────────────────────────────────────────────────┐
│              AI Data Analyzer MCP Server             │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Schema   │  │ Domain   │  │  AI Client       │  │
│  │ Reader   │→ │ Detector │→ │  (Claude/GPT)    │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│       │              │               │              │
│       ▼              ▼               ▼              │
│  ┌──────────────────────────────────────────────┐   │
│  │            分析器模块                         │   │
│  │  • 健康检查器  • 洞察引擎                    │   │
│  │  • 问答处理器                                │   │
│  └──────────────────────────────────────────────┘   │
│                       │                             │
│                       ▼                             │
│  ┌──────────────────────────────────────────────┐   │
│  │         数据库连接器                          │   │
│  │     (PostgreSQL / SQLite)                    │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**三层架构：**
1. **Schema 发现** — 读取数据库结构（表、列、关系）
2. **领域检测** — 通过关键词匹配 + AI 推断识别业务领域
3. **AI 分析** — 生成洞察、健康报告、回答问题

## 示例

### 示例 1：数据库健康检查

```
用户：检查我的数据库健康状况

AI：我来分析你的数据库。先连接然后运行健康检查。

[connect_database → data_health_check]

结果：
- 数据质量：发现 3 个问题（2 个中等，1 个高严重性）
- 关键指标：1,234 用户，5,678 订单，$89,012 GMV
- 异常：3月15日退款量异常飙升
- 风险：15% 的用户邮箱为 NULL
```

### 示例 2：自然语言问答

```
用户：上个月收入最高的 5 个产品是什么？

AI：让我查询你的数据库。

[ask_question]

回答：2026年4月收入前5的产品：
1. MacBook Pro — $14,999（15台）
2. iPhone 15 — $7,999（23台）
...
```

## 贡献

欢迎贡献！请随时提交 Pull Request。

## 许可证

MIT
