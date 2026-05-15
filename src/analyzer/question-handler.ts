// Copyright (c) 2026 MIMO. MIT License.
// https://github.com/Nemophilistc/ai-data-analyzer-mcp

import { SchemaReader } from '../db/schema-reader.js';
import { QueryExecutor } from '../db/query-executor.js';
import { AIClient } from '../ai/client.js';
import { DomainDetector } from './domain-detector.js';
import { PROMPTS } from '../ai/prompts.js';
import { parseGeneratedSql } from '../ai/parser.js';
import type { DatabaseSchema, AnalysisAnswer } from '../types/index.js';

const FORBIDDEN_KEYWORDS = [
  'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE',
  'GRANT', 'REVOKE', 'EXECUTE', 'EXEC',
];

export class QuestionHandler {
  constructor(
    private schemaReader: SchemaReader,
    private queryExecutor: QueryExecutor,
    private aiClient: AIClient,
    private domainDetector: DomainDetector
  ) {}

  async answerQuestion(schema: DatabaseSchema, question: string): Promise<AnalysisAnswer> {
    const domains = await this.domainDetector.detectDomain(schema);
    const domain = domains[0]?.domain ?? 'unknown';
    const summary = this.domainDetector.generateSchemaSummary(schema);

    const dialect = schema.databaseType;
    const sqlResponse = await this.aiClient.chatWithJsonOutput(
      PROMPTS.generateSql(summary, domain, question, dialect),
      `Generate a SQL query to answer: ${question}`
    );

    const { sql, explanation } = parseGeneratedSql(JSON.stringify(sqlResponse));

    if (!this.validateSql(sql)) {
      throw new Error('Generated SQL contains forbidden operations. Only SELECT queries are allowed.');
    }

    const queryResult = await this.queryExecutor.executeSafeQuery(sql);

    const answerResponse = await this.aiClient.chatWithJsonOutput(
      PROMPTS.answerQuestion(summary, domain, question, JSON.stringify(queryResult.rows)),
      `Analyze the query results and answer the question: ${question}`
    );

    return {
      question,
      answer: answerResponse.answer ?? '',
      data: queryResult.rows,
      sql,
      visualization: answerResponse.visualization ?? null,
    };
  }

  validateSql(sql: string): boolean {
    const normalized = sql.trim().toUpperCase();
    if (!normalized.startsWith('SELECT') && !normalized.startsWith('WITH')) {
      return false;
    }
    for (const keyword of FORBIDDEN_KEYWORDS) {
      if (new RegExp(`\\b${keyword}\\b`, 'i').test(sql)) {
        return false;
      }
    }
    return true;
  }
}
