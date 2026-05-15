// Copyright (c) 2026 MIMO. MIT License.
// https://github.com/Nemophilistc/ai-data-analyzer-mcp

import pg from 'pg';
import Database from 'better-sqlite3';
import type { DatabaseConfig } from '../types/database.js';

export class DatabaseConnector {
  private config: DatabaseConfig;
  private pgPool: pg.Pool | null = null;
  private sqliteDb: Database.Database | null = null;
  private connected = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.config.type === 'postgresql') {
      await this.connectPostgres();
    } else {
      this.connectSqlite();
    }
    this.connected = true;
  }

  private async connectPostgres(): Promise<void> {
    const poolConfig: pg.PoolConfig = this.config.connectionString
      ? { connectionString: this.config.connectionString }
      : {
          host: this.config.host,
          port: this.config.port ?? 5432,
          database: this.config.database,
          user: this.config.user,
          password: this.config.password,
        };

    poolConfig.connectionTimeoutMillis = 10000;
    poolConfig.max = 5;

    this.pgPool = new pg.Pool(poolConfig);
    const client = await this.pgPool.connect();
    client.release();
  }

  private connectSqlite(): void {
    const filePath = this.config.filePath;
    if (!filePath) {
      throw new Error('SQLite filePath is required');
    }

    try {
      this.sqliteDb = new Database(filePath, { readonly: true });
      this.sqliteDb.pragma('journal_mode = WAL');
    } catch (err: any) {
      if (err.code === 'SQLITE_CANTOPEN') {
        throw new Error(`SQLite file not found: ${filePath}`);
      }
      throw new Error(`Failed to open SQLite database: ${err.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
      this.pgPool = null;
    }
    if (this.sqliteDb) {
      this.sqliteDb.close();
      this.sqliteDb = null;
    }
    this.connected = false;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.connect();
      if (this.config.type === 'postgresql' && this.pgPool) {
        const client = await this.pgPool.connect();
        client.release();
      }
      return { success: true };
    } catch (err: any) {
      let message = err.message;
      if (message.includes('password')) {
        message = 'Authentication failed. Check your credentials.';
      } else if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
        message = 'Cannot reach the database server. Check host and port.';
      } else if (message.includes('SQLITE_CANTOPEN')) {
        message = `SQLite file not found: ${this.config.filePath}`;
      }
      return { success: false, error: message };
    }
  }

  getPgPool(): pg.Pool | null {
    return this.pgPool;
  }

  getSqliteDb(): Database.Database | null {
    return this.sqliteDb;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getType(): 'postgresql' | 'sqlite' {
    return this.config.type;
  }
}
