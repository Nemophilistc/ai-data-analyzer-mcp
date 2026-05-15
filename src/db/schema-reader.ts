// Copyright (c) 2026 MIMO. MIT License.
// https://github.com/Nemophilistc/ai-data-analyzer-mcp

import pg from 'pg';
import Database from 'better-sqlite3';
import { DatabaseConnector } from './connector.js';
import type {
  DatabaseSchema,
  TableInfo,
  ColumnInfo,
  IndexInfo,
  ForeignKeyInfo,
  ColumnStats,
} from '../types/database.js';

export class SchemaReader {
  constructor(private connector: DatabaseConnector) {}

  async readSchema(): Promise<DatabaseSchema> {
    const type = this.connector.getType();
    if (type === 'postgresql') {
      return this.readPostgresSchema();
    }
    return this.readSqliteSchema();
  }

  private async readPostgresSchema(): Promise<DatabaseSchema> {
    const pool = this.connector.getPgPool()!;

    const tablesResult = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );

    const tables: TableInfo[] = [];
    let totalRowCount = 0;

    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      const columns = await this.getPostgresColumns(pool, tableName);
      const primaryKeys = await this.getPostgresPrimaryKeys(pool, tableName);
      const foreignKeys = await this.getPostgresForeignKeys(pool, tableName);
      const indexes = await this.getPostgresIndexes(pool, tableName);
      const rowCount = await this.getPostgresRowCount(pool, tableName);

      totalRowCount += rowCount ?? 0;

      const columnInfos: ColumnInfo[] = columns.map((c: any) => ({
        name: c.column_name,
        dataType: c.data_type,
        isNullable: c.is_nullable === 'YES',
        defaultValue: c.column_default,
        isPrimaryKey: primaryKeys.includes(c.column_name),
        comment: c.column_comment ?? null,
      }));

      tables.push({
        name: tableName,
        schema: 'public',
        rowCount,
        columns: columnInfos,
        indexes,
        foreignKeys,
      });
    }

    return {
      databaseName: 'public',
      databaseType: 'postgresql',
      tables,
      totalRowCount,
      discoveredAt: new Date().toISOString(),
    };
  }

  private async getPostgresColumns(pool: pg.Pool, tableName: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT c.column_name, c.data_type, c.is_nullable, c.column_default,
              pgd.description as column_comment
       FROM information_schema.columns c
       LEFT JOIN pg_catalog.pg_statio_all_tables st
         ON c.table_name = st.relname AND c.table_schema = st.schemaname
       LEFT JOIN pg_catalog.pg_description pgd
         ON pgd.objoid = st.relid AND pgd.objsubid = c.ordinal_position
       WHERE c.table_schema = 'public' AND c.table_name = $1
       ORDER BY c.ordinal_position`,
      [tableName]
    );
    return result.rows;
  }

  private async getPostgresPrimaryKeys(pool: pg.Pool, tableName: string): Promise<string[]> {
    const result = await pool.query(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_name = $1
         AND tc.constraint_type = 'PRIMARY KEY'
         AND tc.table_schema = 'public'`,
      [tableName]
    );
    return result.rows.map((r: any) => r.column_name);
  }

  private async getPostgresForeignKeys(pool: pg.Pool, tableName: string): Promise<ForeignKeyInfo[]> {
    const result = await pool.query(
      `SELECT kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
       JOIN information_schema.constraint_column_usage ccu
         ON tc.constraint_name = ccu.constraint_name
       WHERE tc.table_name = $1
         AND tc.constraint_type = 'FOREIGN KEY'
         AND tc.table_schema = 'public'`,
      [tableName]
    );
    return result.rows.map((r: any) => ({
      columnName: r.column_name,
      referencedTable: r.foreign_table_name,
      referencedColumn: r.foreign_column_name,
    }));
  }

  private async getPostgresIndexes(pool: pg.Pool, tableName: string): Promise<IndexInfo[]> {
    const result = await pool.query(
      `SELECT indexname, indexdef FROM pg_indexes
       WHERE tablename = $1 AND schemaname = 'public'`,
      [tableName]
    );
    return result.rows.map((r: any) => {
      const match = r.indexdef.match(/\(([^)]+)\)/);
      const columns = match ? match[1].split(',').map((c: string) => c.trim()) : [];
      return {
        name: r.indexname,
        columns,
        isUnique: r.indexdef.includes('UNIQUE'),
      };
    });
  }

  private async getPostgresRowCount(pool: pg.Pool, tableName: string): Promise<number> {
    const result = await pool.query(
      `SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = $1`,
      [tableName]
    );
    return Number(result.rows[0]?.estimate ?? 0);
  }

  private readSqliteSchema(): DatabaseSchema {
    const db = this.connector.getSqliteDb()!;

    const tablesResult = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
      .all() as { name: string }[];

    const tables: TableInfo[] = [];
    let totalRowCount = 0;

    for (const { name: tableName } of tablesResult) {
      const columns = this.getSqliteColumns(db, tableName);
      const foreignKeys = this.getSqliteForeignKeys(db, tableName);
      const indexes = this.getSqliteIndexes(db, tableName);
      const rowCount = this.getSqliteRowCount(db, tableName);

      totalRowCount += rowCount ?? 0;

      tables.push({
        name: tableName,
        schema: 'main',
        rowCount,
        columns,
        indexes,
        foreignKeys,
      });
    }

    return {
      databaseName: 'main',
      databaseType: 'sqlite',
      tables,
      totalRowCount,
      discoveredAt: new Date().toISOString(),
    };
  }

  private getSqliteColumns(db: Database.Database, tableName: string): ColumnInfo[] {
    const rows = db.prepare(`PRAGMA table_info("${tableName}")`).all() as any[];
    return rows.map((r) => ({
      name: r.name,
      dataType: r.type,
      isNullable: r.notnull === 0,
      defaultValue: r.dflt_value,
      isPrimaryKey: r.pk === 1,
      comment: null,
    }));
  }

  private getSqliteForeignKeys(db: Database.Database, tableName: string): ForeignKeyInfo[] {
    const rows = db.prepare(`PRAGMA foreign_key_list("${tableName}")`).all() as any[];
    return rows.map((r) => ({
      columnName: r.from,
      referencedTable: r.table,
      referencedColumn: r.to,
    }));
  }

  private getSqliteIndexes(db: Database.Database, tableName: string): IndexInfo[] {
    const rows = db.prepare(`PRAGMA index_list("${tableName}")`).all() as any[];
    return rows.map((r) => {
      const cols = db.prepare(`PRAGMA index_info("${r.name}")`).all() as any[];
      return {
        name: r.name,
        columns: cols.map((c) => c.name),
        isUnique: r.unique === 1,
      };
    });
  }

  private getSqliteRowCount(db: Database.Database, tableName: string): number {
    const result = db.prepare(`SELECT COUNT(*) as count FROM "${tableName}"`).get() as any;
    return result.count;
  }

  async getTableRowCount(tableName: string): Promise<number> {
    const type = this.connector.getType();
    if (type === 'postgresql') {
      const pool = this.connector.getPgPool()!;
      const result = await pool.query(
        `SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = $1`,
        [tableName]
      );
      return Number(result.rows[0]?.estimate ?? 0);
    }
    const db = this.connector.getSqliteDb()!;
    const result = db.prepare(`SELECT COUNT(*) as count FROM "${tableName}"`).get() as any;
    return result.count;
  }

  async getTableSample(tableName: string, limit = 5): Promise<Record<string, any>[]> {
    const type = this.connector.getType();
    if (type === 'postgresql') {
      const pool = this.connector.getPgPool()!;
      const result = await pool.query(
        `SELECT * FROM "${tableName}" LIMIT $1`,
        [limit]
      );
      return result.rows;
    }
    const db = this.connector.getSqliteDb()!;
    return db.prepare(`SELECT * FROM "${tableName}" LIMIT ?`).all(limit) as Record<string, any>[];
  }

  async getColumnStats(tableName: string, columnName: string): Promise<ColumnStats> {
    const type = this.connector.getType();
    if (type === 'postgresql') {
      return this.getPostgresColumnStats(tableName, columnName);
    }
    return this.getSqliteColumnStats(tableName, columnName);
  }

  private async getPostgresColumnStats(tableName: string, columnName: string): Promise<ColumnStats> {
    const pool = this.connector.getPgPool()!;
    const result = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE "${columnName}" IS NULL) AS null_count,
        COUNT(DISTINCT "${columnName}") AS distinct_count,
        MIN("${columnName}")::text AS min_val,
        MAX("${columnName}")::text AS max_val,
        CASE
          WHEN pg_typeof("${columnName}")::text IN ('integer','bigint','numeric','real','double precision','smallint','decimal')
          THEN AVG("${columnName}")
          ELSE NULL
        END AS avg_val
       FROM "${tableName}"`
    );
    const row = result.rows[0];
    return {
      nullCount: Number(row.null_count),
      distinctCount: Number(row.distinct_count),
      min: row.min_val,
      max: row.max_val,
      avg: row.avg_val !== null ? Number(row.avg_val) : null,
    };
  }

  private getSqliteColumnStats(tableName: string, columnName: string): ColumnStats {
    const db = this.connector.getSqliteDb()!;
    const result = db
      .prepare(
        `SELECT
          SUM(CASE WHEN "${columnName}" IS NULL THEN 1 ELSE 0 END) AS null_count,
          COUNT(DISTINCT "${columnName}") AS distinct_count,
          MIN("${columnName}") AS min_val,
          MAX("${columnName}") AS max_val,
          AVG(CAST("${columnName}" AS REAL)) AS avg_val
         FROM "${tableName}"`
      )
      .get() as any;
    return {
      nullCount: Number(result.null_count ?? 0),
      distinctCount: Number(result.distinct_count ?? 0),
      min: result.min_val,
      max: result.max_val,
      avg: result.avg_val !== null ? Number(result.avg_val) : null,
    };
  }
}
