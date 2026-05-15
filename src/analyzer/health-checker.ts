import { SchemaReader } from '../db/schema-reader.js';
import { QueryExecutor } from '../db/query-executor.js';
import { AIClient } from '../ai/client.js';
import { PROMPTS } from '../ai/prompts.js';
import { parseHealthReport } from '../ai/parser.js';
import type { DatabaseSchema, HealthReport } from '../types/index.js';

export class HealthChecker {
  constructor(
    private schemaReader: SchemaReader,
    private queryExecutor: QueryExecutor,
    private aiClient: AIClient
  ) {}

  async runHealthCheck(schema: DatabaseSchema, sampleSize = 1000): Promise<HealthReport> {
    const [sampleData, columnStats] = await Promise.all([
      this.getSampleData(schema),
      this.getColumnStatistics(schema),
    ]);

    const summary = this.schemaReader.constructor.name === 'SchemaReader'
      ? new (await import('../analyzer/domain-detector.js')).DomainDetector(this.schemaReader, this.aiClient).generateSchemaSummary(schema)
      : '';

    const aiResponse = await this.aiClient.chatWithJsonOutput(
      PROMPTS.healthCheck(summary || this.buildSimpleSummary(schema), sampleData, columnStats),
      'Perform a comprehensive health check on this database.'
    );

    return parseHealthReport(JSON.stringify(aiResponse));
  }

  private buildSimpleSummary(schema: DatabaseSchema): string {
    return schema.tables
      .map((t) => `${t.name} (${t.columns.length} columns, ~${t.rowCount ?? '?'} rows)`)
      .join('\n');
  }

  async getSampleData(schema: DatabaseSchema): Promise<string> {
    const parts: string[] = [];

    for (const table of schema.tables.slice(0, 10)) {
      try {
        const rows = await this.schemaReader.getTableSample(table.name, 3);
        if (rows.length === 0) continue;

        const cols = Object.keys(rows[0]);
        const header = cols.join(' | ');
        const divider = cols.map(() => '---').join(' | ');
        const dataRows = rows.map((r) => cols.map((c) => String(r[c] ?? 'NULL')).join(' | '));

        parts.push(`### ${table.name}\n${header}\n${divider}\n${dataRows.join('\n')}\n`);
      } catch {
        // Skip tables that can't be sampled
      }
    }

    return parts.join('\n');
  }

  async getColumnStatistics(schema: DatabaseSchema): Promise<string> {
    const parts: string[] = [];

    for (const table of schema.tables.slice(0, 10)) {
      const numericCols = table.columns.filter((c) =>
        /int|float|double|numeric|decimal|real|bigint|smallint/i.test(c.dataType)
      );
      const dateCols = table.columns.filter((c) =>
        /date|time|timestamp/i.test(c.dataType)
      );

      const targetCols = [...numericCols.slice(0, 5), ...dateCols.slice(0, 3)];

      for (const col of targetCols) {
        try {
          const stats = await this.schemaReader.getColumnStats(table.name, col.name);
          parts.push(
            `${table.name}.${col.name}: null=${stats.nullCount}, distinct=${stats.distinctCount}, min=${stats.min}, max=${stats.max}, avg=${stats.avg}`
          );
        } catch {
          // Skip columns that can't be analyzed
        }
      }
    }

    return parts.join('\n');
  }
}
