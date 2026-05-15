// Copyright (c) 2026 MIMO. MIT License.
// https://github.com/Nemophilistc/ai-data-analyzer-mcp

import type { DatabaseConfig } from './types/database.js';

export interface AppConfig {
  db: DatabaseConfig;
  sampleSize: number;
  maxRows: number;
}

export function getConfig(): AppConfig {
  const dbType = process.env.AI_DATA_DB_TYPE as 'postgresql' | 'sqlite' | undefined;

  if (!dbType) {
    throw new Error(
      'AI_DATA_DB_TYPE is required. Set it to "postgresql" or "sqlite".'
    );
  }

  if (dbType !== 'postgresql' && dbType !== 'sqlite') {
    throw new Error(`Invalid AI_DATA_DB_TYPE: "${dbType}". Must be "postgresql" or "sqlite".`);
  }

  const db: DatabaseConfig = { type: dbType };

  if (dbType === 'postgresql') {
    db.connectionString = process.env.AI_DATA_DB_CONNECTION_STRING;
    if (!db.connectionString) {
      db.host = process.env.AI_DATA_DB_HOST ?? 'localhost';
      db.port = Number(process.env.AI_DATA_DB_PORT ?? '5432');
      db.database = process.env.AI_DATA_DB_NAME;
      db.user = process.env.AI_DATA_DB_USER;
      db.password = process.env.AI_DATA_DB_PASSWORD;

      if (!db.database || !db.user) {
        throw new Error(
          'For PostgreSQL, set AI_DATA_DB_CONNECTION_STRING or AI_DATA_DB_NAME + AI_DATA_DB_USER.'
        );
      }
    }
  } else {
    db.filePath = process.env.AI_DATA_DB_FILE;
    if (!db.filePath) {
      throw new Error('For SQLite, set AI_DATA_DB_FILE to the database file path.');
    }
  }

  return {
    db,
    sampleSize: Number(process.env.AI_DATA_SAMPLE_SIZE ?? '1000'),
    maxRows: Number(process.env.AI_DATA_MAX_ROWS ?? '1000'),
  };
}
