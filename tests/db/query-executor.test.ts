import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { DatabaseConnector } from '../../src/db/connector.js';
import { QueryExecutor } from '../../src/db/query-executor.js';

describe('QueryExecutor with SQLite', () => {
  let db: Database.Database;
  let connector: DatabaseConnector;
  let executor: QueryExecutor;

  beforeAll(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT, value REAL);
      INSERT INTO test_table VALUES (1, 'Alice', 100.5);
      INSERT INTO test_table VALUES (2, 'Bob', 200.0);
      INSERT INTO test_table VALUES (3, 'Charlie', 300.75);
    `);

    connector = new DatabaseConnector({ type: 'sqlite', filePath: ':memory:' });
    (connector as any).sqliteDb = db;
    (connector as any).connected = true;

    executor = new QueryExecutor(connector);
  });

  afterAll(() => {
    db.close();
  });

  it('should execute a SELECT query', async () => {
    const result = await executor.executeQuery('SELECT * FROM test_table');
    expect(result.rows.length).toBe(3);
    expect(result.columns).toContain('id');
    expect(result.columns).toContain('name');
  });

  it('should execute a parameterized query', async () => {
    const result = await executor.executeQuery(
      'SELECT * FROM test_table WHERE name = ?',
      ['Alice']
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].name).toBe('Alice');
  });

  it('should reject INSERT queries in safe mode', async () => {
    await expect(
      executor.executeSafeQuery('INSERT INTO test_table VALUES (4, "Dave", 400)')
    ).rejects.toThrow('Only SELECT');
  });

  it('should reject DELETE queries in safe mode', async () => {
    await expect(
      executor.executeSafeQuery('DELETE FROM test_table WHERE id = 1')
    ).rejects.toThrow('Only SELECT');
  });

  it('should reject DROP queries in safe mode', async () => {
    await expect(
      executor.executeSafeQuery('DROP TABLE test_table')
    ).rejects.toThrow('Only SELECT');
  });

  it('should allow WITH...SELECT queries', async () => {
    const result = await executor.executeSafeQuery(
      'WITH cte AS (SELECT * FROM test_table) SELECT * FROM cte'
    );
    expect(result.rows.length).toBe(3);
  });

  it('should track execution time', async () => {
    const result = await executor.executeQuery('SELECT * FROM test_table');
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });
});
