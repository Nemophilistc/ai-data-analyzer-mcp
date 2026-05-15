import { SchemaReader } from '../db/schema-reader.js';
import { AIClient } from '../ai/client.js';
import { PROMPTS } from '../ai/prompts.js';
import { parseDomainResult } from '../ai/parser.js';
import type { DatabaseSchema, DomainDetectionResult } from '../types/index.js';

const DOMAIN_SIGNALS: Record<string, { strong: string[]; weak: string[]; columns: string[] }> = {
  ecommerce: {
    strong: ['orders', 'products', 'cart', 'payments', 'shipping', 'inventory'],
    weak: ['sku', 'price', 'quantity', 'checkout', 'coupon', 'discount'],
    columns: ['total_amount', 'unit_price', 'quantity', 'order_status'],
  },
  content_platform: {
    strong: ['posts', 'articles', 'videos', 'comments', 'likes', 'categories'],
    weak: ['views', 'tags', 'subscriptions', 'feeds', 'bookmarks'],
    columns: ['view_count', 'like_count', 'published_at', 'content'],
  },
  project_management: {
    strong: ['tasks', 'projects', 'milestones', 'sprints', 'boards'],
    weak: ['assignments', 'backlog', 'epics', 'stories'],
    columns: ['status', 'priority', 'due_date', 'assigned_to'],
  },
  saas_app: {
    strong: ['subscriptions', 'plans', 'billing', 'invoices', 'tenants'],
    weak: ['organizations', 'workspaces', 'features', 'quotas'],
    columns: ['plan_type', 'billing_cycle', 'expires_at'],
  },
  social_platform: {
    strong: ['followers', 'messages', 'notifications', 'friendships'],
    weak: ['profiles', 'feeds', 'stories', 'groups'],
    columns: ['follower_count', 'following_count'],
  },
  education: {
    strong: ['courses', 'lessons', 'enrollments', 'quizzes', 'grades'],
    weak: ['students', 'teachers', 'assignments', 'certificates'],
    columns: ['score', 'grade', 'enrollment_date'],
  },
  fintech: {
    strong: ['transactions', 'accounts', 'transfers', 'balances', 'wallets'],
    weak: ['ledger', 'statements', 'fees'],
    columns: ['amount', 'balance', 'currency'],
  },
  healthcare: {
    strong: ['patients', 'appointments', 'prescriptions', 'medical_records'],
    weak: ['doctors', 'diagnoses', 'treatments', 'lab_results'],
    columns: ['patient_id', 'diagnosis', 'prescription'],
  },
  logistics: {
    strong: ['shipments', 'warehouses', 'routes', 'deliveries', 'tracking'],
    weak: ['packages', 'carriers', 'zones'],
    columns: ['tracking_number', 'delivery_status', 'estimated_delivery'],
  },
};

export class DomainDetector {
  constructor(
    private schemaReader: SchemaReader,
    private aiClient: AIClient
  ) {}

  async detectDomain(schema: DatabaseSchema): Promise<DomainDetectionResult[]> {
    const keywordResults = this.keywordMatch(schema);
    if (keywordResults.length > 0 && keywordResults[0].confidence >= 0.6) {
      return keywordResults;
    }

    try {
      const summary = this.generateSchemaSummary(schema);
      const aiResponse = await this.aiClient.chatWithJsonOutput(
        PROMPTS.domainDetection(summary),
        'Analyze this database schema and determine the application domain.'
      );
      return parseDomainResult(JSON.stringify(aiResponse));
    } catch {
      return keywordResults;
    }
  }

  private keywordMatch(schema: DatabaseSchema): DomainDetectionResult[] {
    const tableNames = schema.tables.map((t) => t.name.toLowerCase());
    const allColumns = schema.tables.flatMap((t) => t.columns.map((c) => c.name.toLowerCase()));

    const scores: Record<string, { score: number; signals: string[] }> = {};

    for (const [domain, signals] of Object.entries(DOMAIN_SIGNALS)) {
      let score = 0;
      const matched: string[] = [];

      for (const s of signals.strong) {
        if (tableNames.some((t) => t.includes(s))) {
          score += 3;
          matched.push(s);
        }
      }
      for (const s of signals.weak) {
        if (tableNames.some((t) => t.includes(s))) {
          score += 1;
          matched.push(s);
        }
      }
      for (const s of signals.columns) {
        if (allColumns.some((c) => c.includes(s))) {
          score += 0.5;
          matched.push(s);
        }
      }

      if (score > 0) {
        scores[domain] = { score, signals: matched };
      }
    }

    return Object.entries(scores)
      .sort((a, b) => b[1].score - a[1].score)
      .map(([domain, { score, signals }]) => ({
        domain,
        confidence: Math.min(score / 10, 1),
        matchedSignals: signals,
        description: `Detected via keyword matching: ${signals.join(', ')}`,
      }));
  }

  generateSchemaSummary(schema: DatabaseSchema): string {
    const lines: string[] = [];
    lines.push(`Database: ${schema.databaseName} (${schema.databaseType})`);
    lines.push(`Total tables: ${schema.tables.length}`);
    lines.push(`Total rows: ~${schema.totalRowCount}`);
    lines.push('');

    for (const table of schema.tables) {
      const cols = table.columns
        .map((c) => {
          let desc = `${c.name}: ${c.dataType}`;
          if (c.isPrimaryKey) desc += ' [PK]';
          if (c.comment) desc += ` /* ${c.comment} */`;
          return desc;
        })
        .join(', ');
      lines.push(`${table.name} (${table.rowCount ?? '?'} rows): ${cols}`);

      for (const fk of table.foreignKeys) {
        lines.push(`  FK: ${fk.columnName} -> ${fk.referencedTable}.${fk.referencedColumn}`);
      }
    }

    return lines.join('\n');
  }
}
