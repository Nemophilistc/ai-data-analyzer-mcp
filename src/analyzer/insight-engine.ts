// Copyright (c) 2026 MIMO. MIT License.
// https://github.com/Nemophilistc/ai-data-analyzer-mcp

import { SchemaReader } from '../db/schema-reader.js';
import { QueryExecutor } from '../db/query-executor.js';
import { AIClient } from '../ai/client.js';
import { DomainDetector } from './domain-detector.js';
import { PROMPTS } from '../ai/prompts.js';
import { parseInsightReport } from '../ai/parser.js';
import type { DatabaseSchema, InsightReport } from '../types/index.js';

export class InsightEngine {
  constructor(
    private schemaReader: SchemaReader,
    private queryExecutor: QueryExecutor,
    private aiClient: AIClient,
    private domainDetector: DomainDetector
  ) {}

  async discoverInsights(
    schema: DatabaseSchema,
    focus?: string,
    maxInsights = 5
  ): Promise<InsightReport> {
    const [domains, sampleData, exploratoryResults] = await Promise.all([
      this.domainDetector.detectDomain(schema),
      this.getSampleData(schema),
      this.runExploratoryQueries(schema),
    ]);

    const domain = domains[0]?.domain ?? 'unknown';
    const summary = this.domainDetector.generateSchemaSummary(schema);

    const context = `${summary}\n\nExploratory Query Results:\n${exploratoryResults}`;

    const aiResponse = await this.aiClient.chatWithJsonOutput(
      PROMPTS.discoverInsights(context, domain, sampleData, focus),
      `Discover up to ${maxInsights} insights from this data.`
    );

    const report = parseInsightReport(JSON.stringify(aiResponse));
    report.insights = report.insights.slice(0, maxInsights);
    return report;
  }

  async runExploratoryQueries(schema: DatabaseSchema): Promise<string> {
    const results: string[] = [];

    for (const table of schema.tables) {
      const dateCol = table.columns.find((c) => /date|time|created_at|timestamp/i.test(c.name));
      if (dateCol) {
        try {
          const isPg = schema.databaseType === 'postgresql';
          const sql = isPg
            ? `SELECT DATE_TRUNC('day', "${dateCol.name}") as period, COUNT(*) as count FROM "${table.name}" GROUP BY 1 ORDER BY 1 DESC LIMIT 30`
            : `SELECT DATE("${dateCol.name}") as period, COUNT(*) as count FROM "${table.name}" GROUP BY 1 ORDER BY 1 DESC LIMIT 30`;
          const result = await this.queryExecutor.executeSafeQuery(sql);
          results.push(`Time trend for ${table.name}.${dateCol.name}: ${JSON.stringify(result.rows.slice(0, 10))}`);
        } catch {
          // Skip failed queries
        }
      }

      const numericCol = table.columns.find((c) =>
        /amount|price|total|count|quantity|revenue/i.test(c.name) &&
        /int|float|double|numeric|decimal|real|bigint/i.test(c.dataType)
      );
      if (numericCol) {
        try {
          const result = await this.queryExecutor.executeSafeQuery(
            `SELECT MIN("${numericCol.name}") as min_val, MAX("${numericCol.name}") as max_val, AVG("${numericCol.name}") as avg_val, COUNT(*) as count FROM "${table.name}"`
          );
          results.push(`Distribution for ${table.name}.${numericCol.name}: ${JSON.stringify(result.rows[0])}`);
        } catch {
          // Skip
        }
      }

      for (const fk of table.foreignKeys) {
        try {
          const result = await this.queryExecutor.executeSafeQuery(
            `SELECT "${fk.columnName}", COUNT(*) as count FROM "${table.name}" GROUP BY "${fk.columnName}" ORDER BY count DESC LIMIT 10`
          );
          results.push(`Top FK for ${table.name}.${fk.columnName}: ${JSON.stringify(result.rows.slice(0, 5))}`);
        } catch {
          // Skip
        }
      }
    }

    return results.join('\n');
  }

  private async getSampleData(schema: DatabaseSchema): Promise<string> {
    const parts: string[] = [];
    for (const table of schema.tables.slice(0, 8)) {
      try {
        const rows = await this.schemaReader.getTableSample(table.name, 3);
        if (rows.length === 0) continue;
        parts.push(`${table.name}: ${JSON.stringify(rows)}`);
      } catch {
        // Skip
      }
    }
    return parts.join('\n');
  }
}
