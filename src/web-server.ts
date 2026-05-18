// Copyright (c) 2026 MIMO. MIT License.
// https://github.com/Nemophilistc/ai-data-analyzer-mcp

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { DatabaseConnector } from './db/connector.js';
import { SchemaReader } from './db/schema-reader.js';
import { QueryExecutor } from './db/query-executor.js';
import { AIClient } from './ai/client.js';
import { DomainDetector } from './analyzer/domain-detector.js';
import { HealthChecker } from './analyzer/health-checker.js';
import { InsightEngine } from './analyzer/insight-engine.js';
import { QuestionHandler } from './analyzer/question-handler.js';
import type { DatabaseSchema, DomainDetectionResult } from './types/index.js';

export interface WebConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'connect_database',
      description: 'Connect to a PostgreSQL or SQLite database. Must be called first before any analysis.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['postgresql', 'sqlite'], description: 'Database type' },
          connectionString: { type: 'string', description: 'PostgreSQL connection string' },
          filePath: { type: 'string', description: 'SQLite database file path' },
        },
        required: ['type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_schema',
      description: 'Analyze the connected database schema and detect business domain.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'data_health_check',
      description: 'Run a comprehensive data health check. Detects quality issues, anomalies, and business risks.',
      parameters: {
        type: 'object',
        properties: {
          sampleSize: { type: 'number', description: 'Rows to sample (default: 1000)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'discover_insights',
      description: 'Discover hidden patterns, opportunities, risks, and trends in the data.',
      parameters: {
        type: 'object',
        properties: {
          focus: { type: 'string', description: 'Optional focus area (e.g. "revenue")' },
          maxInsights: { type: 'number', description: 'Max insights (default: 5)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ask_question',
      description: 'Ask a natural language question about the data. Generates SQL, executes, and interprets.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'Your question about the data' },
        },
        required: ['question'],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are an AI data analyst assistant. You help users understand and analyze their databases.

Available tools:
- connect_database: Connect to a database (MUST be called first)
- analyze_schema: Analyze database structure and detect business domain
- data_health_check: Check data quality, anomalies, and risks
- discover_insights: Find hidden patterns and trends
- ask_question: Answer natural language questions about the data

When a user provides a database path or connection string, call connect_database.
When asked about data, call ask_question.
For quality checks, call data_health_check.
For pattern discovery, call discover_insights.

Always respond in the same language as the user. Be concise and insightful.`;

class AnalyzerState {
  connector: DatabaseConnector | null = null;
  schemaReader: SchemaReader | null = null;
  queryExecutor: QueryExecutor | null = null;
  domainDetector: DomainDetector | null = null;
  healthChecker: HealthChecker | null = null;
  insightEngine: InsightEngine | null = null;
  questionHandler: QuestionHandler | null = null;
  currentSchema: DatabaseSchema | null = null;
  connected = false;

  async connect(type: 'postgresql' | 'sqlite', connectionString?: string, filePath?: string) {
    if (this.connector) await this.connector.disconnect();

    const config = { type, connectionString, filePath };
    this.connector = new DatabaseConnector(config);
    await this.connector.connect();

    const aiClient = new AIClient();
    this.schemaReader = new SchemaReader(this.connector);
    this.queryExecutor = new QueryExecutor(this.connector);
    this.domainDetector = new DomainDetector(this.schemaReader, aiClient);
    this.healthChecker = new HealthChecker(this.schemaReader, this.queryExecutor, aiClient);
    this.insightEngine = new InsightEngine(this.schemaReader, this.queryExecutor, aiClient, this.domainDetector);
    this.questionHandler = new QuestionHandler(this.schemaReader, this.queryExecutor, aiClient, this.domainDetector);

    this.currentSchema = await this.schemaReader.readSchema();
    this.connected = true;

    return {
      database: this.currentSchema.databaseName,
      type: this.currentSchema.databaseType,
      tables: this.currentSchema.tables.length,
      totalRows: this.currentSchema.totalRowCount,
      tableNames: this.currentSchema.tables.map(t => t.name),
    };
  }

  async analyzeSchema() {
    this.ensureConnected();
    const summary = this.domainDetector!.generateSchemaSummary(this.currentSchema!);
    const domains = await this.domainDetector!.detectDomain(this.currentSchema!);
    return { schemaSummary: summary, detectedDomains: domains, tableCount: this.currentSchema!.tables.length, totalRows: this.currentSchema!.totalRowCount };
  }

  async healthCheck(sampleSize = 1000) {
    this.ensureConnected();
    return await this.healthChecker!.runHealthCheck(this.currentSchema!, sampleSize);
  }

  async discoverInsights(focus?: string, maxInsights = 5) {
    this.ensureConnected();
    return await this.insightEngine!.discoverInsights(this.currentSchema!, focus, maxInsights);
  }

  async askQuestion(question: string) {
    this.ensureConnected();
    return await this.questionHandler!.answerQuestion(this.currentSchema!, question);
  }

  private ensureConnected() {
    if (!this.connected || !this.currentSchema) {
      throw new Error('No database connected. Please provide a database path or connection string first.');
    }
  }
}

async function callAIWithTools(messages: ChatMessage[], config: WebConfig): Promise<any> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 4096,
      messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error ${response.status}: ${err}`);
  }

  const data = await response.json() as any;
  return data.choices[0].message;
}

async function executeToolCall(name: string, args: Record<string, any>, state: AnalyzerState): Promise<string> {
  try {
    switch (name) {
      case 'connect_database': {
        const result = await state.connect(args.type, args.connectionString, args.filePath);
        return JSON.stringify({ success: true, ...result }, null, 2);
      }
      case 'analyze_schema': {
        const result = await state.analyzeSchema();
        return JSON.stringify(result, null, 2);
      }
      case 'data_health_check': {
        const result = await state.healthCheck(args.sampleSize);
        return JSON.stringify(result, null, 2);
      }
      case 'discover_insights': {
        const result = await state.discoverInsights(args.focus, args.maxInsights);
        return JSON.stringify(result, null, 2);
      }
      case 'ask_question': {
        const result = await state.askQuestion(args.question);
        return JSON.stringify(result, null, 2);
      }
      default:
        return `Unknown tool: ${name}`;
    }
  } catch (err: any) {
    return `Error: ${err.message}`;
  }
}

async function handleChat(body: any, config: WebConfig, state: AnalyzerState): Promise<any> {
  const userMessage = body.message;
  const history: ChatMessage[] = body.history || [];

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMessage },
  ];

  // Tool call loop (max 5 rounds)
  for (let round = 0; round < 5; round++) {
    const aiResponse = await callAIWithTools(messages, config);

    if (!aiResponse.tool_calls || aiResponse.tool_calls.length === 0) {
      return { role: 'assistant', content: aiResponse.content || '' };
    }

    messages.push({
      role: 'assistant',
      content: aiResponse.content || '',
      tool_calls: aiResponse.tool_calls,
    });

    for (const toolCall of aiResponse.tool_calls) {
      let args: Record<string, any> = {};
      try { args = JSON.parse(toolCall.function.arguments); } catch {}

      const result = await executeToolCall(toolCall.function.name, args, state);

      messages.push({
        role: 'tool',
        content: result,
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
      });
    }
  }

  const finalResponse = await callAIWithTools(messages, config);
  return { role: 'assistant', content: finalResponse.content || 'Analysis complete.' };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, data: any, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

export async function startWebServer(config: WebConfig, port: number): Promise<void> {
  // Load .env into process.env for AIClient
  const envPath = join(process.cwd(), '.env');
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch {}

  // Set AI config env vars for AIClient
  process.env.AI_PROVIDER = config.provider;
  process.env.AI_API_KEY = config.apiKey;
  process.env.AI_BASE_URL = config.baseUrl;
  process.env.AI_MODEL = config.model;

  const state = new AnalyzerState();

  // Find the HTML file
  const currentDir = fileURLToPath(new URL('.', import.meta.url));
  const htmlPaths = [
    join(currentDir, '..', 'web', 'index.html'),
    join(currentDir, 'web', 'index.html'),
    join(process.cwd(), 'web', 'index.html'),
  ];

  let htmlContent = '';
  for (const p of htmlPaths) {
    try { htmlContent = readFileSync(p, 'utf-8'); break; } catch {}
  }

  if (!htmlContent) {
    htmlContent = EMBEDDED_HTML;
  }

  const server = createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://localhost:${port}`);

    if (url.pathname === '/' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlContent);
      return;
    }

    if (url.pathname === '/api/config' && req.method === 'GET') {
      sendJson(res, {
        provider: config.provider,
        model: config.model,
        databaseConnected: state.connected,
        databaseInfo: state.currentSchema ? {
          name: state.currentSchema.databaseName,
          type: state.currentSchema.databaseType,
          tables: state.currentSchema.tables.length,
          totalRows: state.currentSchema.totalRowCount,
        } : null,
      });
      return;
    }

    if (url.pathname === '/api/chat' && req.method === 'POST') {
      try {
        const body = JSON.parse(await readBody(req));
        const result = await handleChat(body, config, state);
        sendJson(res, result);
      } catch (err: any) {
        sendJson(res, { error: err.message }, 500);
      }
      return;
    }

    sendJson(res, { error: 'Not found' }, 404);
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve());
  });
}

const EMBEDDED_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>AI Data Analyzer</title></head>
<body style="font-family:system-ui;max-width:800px;margin:40px auto;padding:20px">
<h1>AI Data Analyzer</h1>
<p>Web UI file not found. Please ensure web/index.html exists in the package.</p>
</body></html>`;
