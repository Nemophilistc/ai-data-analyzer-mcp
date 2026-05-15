export interface DatabaseConfig {
  type: 'postgresql' | 'sqlite';
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  filePath?: string;
}

export interface TableInfo {
  name: string;
  schema: string;
  rowCount: number | null;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  foreignKeys: ForeignKeyInfo[];
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  comment: string | null;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  isUnique: boolean;
}

export interface ForeignKeyInfo {
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface DatabaseSchema {
  databaseName: string;
  databaseType: 'postgresql' | 'sqlite';
  tables: TableInfo[];
  totalRowCount: number;
  discoveredAt: string;
}

export interface ColumnStats {
  nullCount: number;
  distinctCount: number;
  min: string | number | null;
  max: string | number | null;
  avg: number | null;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
  truncated: boolean;
}
