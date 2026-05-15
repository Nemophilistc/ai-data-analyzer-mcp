import { DatabaseConnector } from './connector.js';
import type { QueryResult } from '../types/database.js';

const FORBIDDEN_KEYWORDS = [
  'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE',
  'GRANT', 'REVOKE', 'EXECUTE', 'EXEC',
];

export class QueryExecutor {
  constructor(private connector: DatabaseConnector) {}

  async executeQuery(sql: string, params?: any[]): Promise<QueryResult> {
    const type = this.connector.getType();
    if (type === 'postgresql') {
      return this.executePostgresQuery(sql, params);
    }
    return this.executeSqliteQuery(sql, params);
  }

  async executeSafeQuery(sql: string, params?: any[]): Promise<QueryResult> {
    this.validateReadOnly(sql);
    return this.executeQuery(sql, params);
  }

  private validateReadOnly(sql: string): void {
    const normalized = sql.trim().toUpperCase();

    if (!normalized.startsWith('SELECT') && !normalized.startsWith('WITH')) {
      throw new Error('Only SELECT and WITH...SELECT queries are allowed');
    }

    for (const keyword of FORBIDDEN_KEYWORDS) {
      const pattern = new RegExp(`\\b${keyword}\\b`, 'i');
      if (pattern.test(sql)) {
        throw new Error(`Query contains forbidden keyword: ${keyword}`);
      }
    }
  }

  private async executePostgresQuery(sql: string, params?: any[]): Promise<QueryResult> {
    const pool = this.connector.getPgPool()!;
    const client = await pool.connect();

    try {
      await client.query('BEGIN READ ONLY');

      const start = Date.now();
      const limitSql = this.addLimit(sql, 1000);
      const result = await client.query(limitSql, params);
      const executionTimeMs = Date.now() - start;

      await client.query('COMMIT');

      const columns = result.fields.map((f) => f.name);
      const truncated = result.rows.length >= 1000;

      return {
        columns,
        rows: result.rows,
        rowCount: result.rowCount ?? result.rows.length,
        executionTimeMs,
        truncated,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private executeSqliteQuery(sql: string, params?: any[]): QueryResult {
    const db = this.connector.getSqliteDb()!;
    const start = Date.now();
    const limitSql = this.addLimit(sql, 1000);

    try {
      const stmt = db.prepare(limitSql);
      const rows = params ? stmt.all(...params) : stmt.all();
      const executionTimeMs = Date.now() - start;

      const typedRows = rows as Record<string, any>[];
      const columns = typedRows.length > 0 ? Object.keys(typedRows[0]) : [];
      const truncated = typedRows.length >= 1000;

      return {
        columns,
        rows: typedRows,
        rowCount: typedRows.length,
        executionTimeMs,
        truncated,
      };
    } catch (err: any) {
      throw new Error(`SQLite query error: ${err.message}`);
    }
  }

  private addLimit(sql: string, limit: number): string {
    const upperSql = sql.trim().toUpperCase();
    if (upperSql.includes('LIMIT')) {
      return sql;
    }
    return sql.trim().replace(/;?\s*$/, '') + ` LIMIT ${limit}`;
  }
}
