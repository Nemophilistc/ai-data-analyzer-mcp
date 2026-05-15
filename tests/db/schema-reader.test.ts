import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { DatabaseConnector } from '../../src/db/connector.js';
import { SchemaReader } from '../../src/db/schema-reader.js';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('SchemaReader with SQLite', () => {
  let db: Database.Database;
  let connector: DatabaseConnector;
  let reader: SchemaReader;

  beforeAll(() => {
    db = new Database(':memory:');
    const fixture = readFileSync(join(__dirname, '../fixtures/ecommerce.sql'), 'utf-8');
    db.exec(fixture);

    connector = new DatabaseConnector({ type: 'sqlite', filePath: ':memory:' });
    // Override the internal db for testing
    (connector as any).sqliteDb = db;
    (connector as any).connected = true;

    reader = new SchemaReader(connector);
  });

  afterAll(() => {
    db.close();
  });

  it('should read all tables', async () => {
    const schema = await reader.readSchema();
    expect(schema.tables.length).toBe(6);
    expect(schema.tables.map((t) => t.name).sort()).toEqual(
      ['cart_items', 'order_items', 'orders', 'products', 'reviews', 'users']
    );
  });

  it('should detect primary keys', async () => {
    const schema = await reader.readSchema();
    const usersTable = schema.tables.find((t) => t.name === 'users');
    expect(usersTable).toBeDefined();
    const pkCol = usersTable!.columns.find((c) => c.isPrimaryKey);
    expect(pkCol).toBeDefined();
    expect(pkCol!.name).toBe('id');
  });

  it('should detect foreign keys', async () => {
    const schema = await reader.readSchema();
    const ordersTable = schema.tables.find((t) => t.name === 'orders');
    expect(ordersTable).toBeDefined();
    expect(ordersTable!.foreignKeys.length).toBeGreaterThan(0);
    expect(ordersTable!.foreignKeys[0].referencedTable).toBe('users');
  });

  it('should get row counts', async () => {
    const schema = await reader.readSchema();
    const usersTable = schema.tables.find((t) => t.name === 'users');
    expect(usersTable!.rowCount).toBe(10);
  });

  it('should get table sample', async () => {
    const sample = await reader.getTableSample('users', 3);
    expect(sample.length).toBe(3);
    expect(sample[0]).toHaveProperty('name');
    expect(sample[0]).toHaveProperty('email');
  });

  it('should get column stats', async () => {
    const stats = await reader.getColumnStats('orders', 'total_amount');
    expect(stats.nullCount).toBe(0);
    expect(stats.distinctCount).toBeGreaterThan(0);
    expect(stats.min).toBeDefined();
    expect(stats.max).toBeDefined();
  });

  it('should calculate total row count', async () => {
    const schema = await reader.readSchema();
    expect(schema.totalRowCount).toBeGreaterThan(0);
  });
});
