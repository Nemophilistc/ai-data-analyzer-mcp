import { describe, it, expect } from 'vitest';
import { DomainDetector } from '../../src/analyzer/domain-detector.js';
import type { DatabaseSchema } from '../../src/types/database.js';

function makeSchema(tables: { name: string; columns: string[] }[]): DatabaseSchema {
  return {
    databaseName: 'test',
    databaseType: 'sqlite',
    tables: tables.map((t) => ({
      name: t.name,
      schema: 'main',
      rowCount: 100,
      columns: t.columns.map((c) => ({
        name: c,
        dataType: 'TEXT',
        isNullable: true,
        defaultValue: null,
        isPrimaryKey: c === 'id',
        comment: null,
      })),
      indexes: [],
      foreignKeys: [],
    })),
    totalRowCount: tables.length * 100,
    discoveredAt: new Date().toISOString(),
  };
}

describe('DomainDetector keyword matching', () => {
  it('should detect ecommerce domain', () => {
    const schema = makeSchema([
      { name: 'users', columns: ['id', 'name', 'email'] },
      { name: 'orders', columns: ['id', 'user_id', 'total_amount'] },
      { name: 'products', columns: ['id', 'name', 'price'] },
      { name: 'cart_items', columns: ['id', 'user_id', 'product_id'] },
    ]);

    const detector = new DomainDetector(null as any, null as any);
    const results = (detector as any).keywordMatch(schema) as any[];

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].domain).toBe('ecommerce');
    expect(results[0].confidence).toBeGreaterThan(0.3);
  });

  it('should detect content platform domain', () => {
    const schema = makeSchema([
      { name: 'users', columns: ['id', 'username', 'email'] },
      { name: 'posts', columns: ['id', 'author_id', 'title', 'content', 'view_count'] },
      { name: 'comments', columns: ['id', 'post_id', 'user_id'] },
      { name: 'likes', columns: ['id', 'post_id', 'user_id'] },
    ]);

    const detector = new DomainDetector(null as any, null as any);
    const results = (detector as any).keywordMatch(schema) as any[];

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].domain).toBe('content_platform');
  });

  it('should return empty for empty schema', () => {
    const schema = makeSchema([]);
    const detector = new DomainDetector(null as any, null as any);
    const results = (detector as any).keywordMatch(schema) as any[];
    expect(results.length).toBe(0);
  });

  it('should detect multiple domains for mixed schema', () => {
    const schema = makeSchema([
      { name: 'orders', columns: ['id', 'total_amount'] },
      { name: 'posts', columns: ['id', 'title', 'view_count'] },
      { name: 'comments', columns: ['id', 'post_id'] },
    ]);

    const detector = new DomainDetector(null as any, null as any);
    const results = (detector as any).keywordMatch(schema) as any[];

    expect(results.length).toBeGreaterThanOrEqual(2);
    const domains = results.map((r: any) => r.domain);
    expect(domains).toContain('ecommerce');
    expect(domains).toContain('content_platform');
  });
});
