// Copyright (c) 2026 MIMO. MIT License.
// https://github.com/Nemophilistc/ai-data-analyzer-mcp

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { DatabaseConnector } from './db/connector.js';
import { SchemaReader } from './db/schema-reader.js';
import { QueryExecutor } from './db/query-executor.js';
import { AIClient } from './ai/client.js';
import { DomainDetector } from './analyzer/domain-detector.js';
import { HealthChecker } from './analyzer/health-checker.js';
import { InsightEngine } from './analyzer/insight-engine.js';
import { QuestionHandler } from './analyzer/question-handler.js';
import type { DatabaseSchema, DomainDetectionResult } from './types/index.js';

export class DataAnalyzerServer {
  private server: Server;
  private connector: DatabaseConnector | null = null;
  private schemaReader: SchemaReader | null = null;
  private queryExecutor: QueryExecutor | null = null;
  private aiClient: AIClient;
  private domainDetector: DomainDetector | null = null;
  private healthChecker: HealthChecker | null = null;
  private insightEngine: InsightEngine | null = null;
  private questionHandler: QuestionHandler | null = null;
  private currentSchema: DatabaseSchema | null = null;
  private currentDomain: DomainDetectionResult[] | null = null;

  constructor() {
    this.server = new Server(
      { name: 'ai-data-analyzer', version: '0.1.0' },
      { capabilities: { tools: {} } }
    );
    this.aiClient = new AIClient();
    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'connect_database',
          description: 'Connect to a database. Must be called first before any analysis. Supports PostgreSQL and SQLite.',
          inputSchema: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['postgresql', 'sqlite'], description: 'Database type' },
              connectionString: { type: 'string', description: 'PostgreSQL connection string' },
              filePath: { type: 'string', description: 'SQLite file path' },
            },
            required: ['type'],
          },
        },
        {
          name: 'analyze_schema',
          description: 'Analyze the connected database schema. Automatically detects the business domain (e-commerce, content platform, etc.) and provides a structural overview.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'data_health_check',
          description: 'Run a comprehensive data health check. Detects data quality issues, calculates key metrics, finds anomalies, and identifies business risks.',
          inputSchema: {
            type: 'object',
            properties: {
              sampleSize: { type: 'number', description: 'Rows to sample', default: 1000 },
            },
          },
        },
        {
          name: 'discover_insights',
          description: 'Proactively discover hidden patterns, opportunities, risks, and trends in the data. Goes beyond simple queries to find non-obvious insights.',
          inputSchema: {
            type: 'object',
            properties: {
              focus: { type: 'string', description: 'Optional focus area, e.g. "revenue", "user_retention"' },
              maxInsights: { type: 'number', default: 5 },
            },
          },
        },
        {
          name: 'ask_question',
          description: 'Ask a natural language question about the data. The AI will generate SQL, execute it, and provide an interpreted analysis.',
          inputSchema: {
            type: 'object',
            properties: {
              question: { type: 'string', description: 'Your question about the data' },
              includeSql: { type: 'boolean', default: true },
            },
            required: ['question'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'connect_database':
            return await this.handleConnect(args);
          case 'analyze_schema':
            return await this.handleAnalyzeSchema();
          case 'data_health_check':
            return await this.handleHealthCheck(args);
          case 'discover_insights':
            return await this.handleDiscoverInsights(args);
          case 'ask_question':
            return await this.handleAskQuestion(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          }],
          isError: true,
        };
      }
    });
  }

  private async handleConnect(args: Record<string, any> | undefined) {
    if (!args) throw new Error('Arguments are required');

    const type = args.type as 'postgresql' | 'sqlite';
    if (type !== 'postgresql' && type !== 'sqlite') {
      throw new Error('type must be "postgresql" or "sqlite"');
    }

    const config = {
      type,
      connectionString: args.connectionString as string | undefined,
      filePath: args.filePath as string | undefined,
    };

    if (type === 'postgresql' && !config.connectionString) {
      throw new Error('connectionString is required for PostgreSQL');
    }
    if (type === 'sqlite' && !config.filePath) {
      throw new Error('filePath is required for SQLite');
    }

    this.connector = new DatabaseConnector(config);
    await this.connector.connect();

    this.schemaReader = new SchemaReader(this.connector);
    this.queryExecutor = new QueryExecutor(this.connector);
    this.domainDetector = new DomainDetector(this.schemaReader, this.aiClient);
    this.healthChecker = new HealthChecker(this.schemaReader, this.queryExecutor, this.aiClient);
    this.insightEngine = new InsightEngine(this.schemaReader, this.queryExecutor, this.aiClient, this.domainDetector);
    this.questionHandler = new QuestionHandler(this.schemaReader, this.queryExecutor, this.aiClient, this.domainDetector);

    this.currentSchema = await this.schemaReader.readSchema();
    this.currentDomain = null;

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          success: true,
          database: this.currentSchema.databaseName,
          type: this.currentSchema.databaseType,
          tables: this.currentSchema.tables.length,
          totalRows: this.currentSchema.totalRowCount,
          tableNames: this.currentSchema.tables.map((t) => t.name),
        }, null, 2),
      }],
    };
  }

  private async handleAnalyzeSchema() {
    this.ensureConnected();
    const schema = this.currentSchema!;
    const summary = this.domainDetector!.generateSchemaSummary(schema);
    const domains = await this.domainDetector!.detectDomain(schema);
    this.currentDomain = domains;

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          schemaSummary: summary,
          detectedDomains: domains,
          tableCount: schema.tables.length,
          totalRows: schema.totalRowCount,
        }, null, 2),
      }],
    };
  }

  private async handleHealthCheck(args: Record<string, any> | undefined) {
    this.ensureConnected();
    const sampleSize = (args?.sampleSize as number) ?? 1000;
    const report = await this.healthChecker!.runHealthCheck(this.currentSchema!, sampleSize);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(report, null, 2),
      }],
    };
  }

  private async handleDiscoverInsights(args: Record<string, any> | undefined) {
    this.ensureConnected();
    const focus = args?.focus as string | undefined;
    const maxInsights = (args?.maxInsights as number) ?? 5;
    const report = await this.insightEngine!.discoverInsights(this.currentSchema!, focus, maxInsights);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(report, null, 2),
      }],
    };
  }

  private async handleAskQuestion(args: Record<string, any> | undefined) {
    this.ensureConnected();
    if (!args?.question) throw new Error('question is required');
    const result = await this.questionHandler!.answerQuestion(this.currentSchema!, args.question as string);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      }],
    };
  }

  private ensureConnected() {
    if (!this.connector?.isConnected() || !this.currentSchema) {
      throw new Error('No database connected. Call connect_database first.');
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
