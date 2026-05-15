import { z } from 'zod';

export const ConnectDatabaseSchema = z.object({
  type: z.enum(['postgresql', 'sqlite']),
  connectionString: z.string().optional().describe('PostgreSQL connection string, e.g. postgres://user:pass@host:5432/db'),
  filePath: z.string().optional().describe('SQLite file path, e.g. ./data.db'),
});

export const AnalyzeSchemaSchema = z.object({});

export const DataHealthCheckSchema = z.object({
  sampleSize: z.number().optional().default(1000).describe('Number of rows to sample for quality checks'),
});

export const DiscoverInsightsSchema = z.object({
  focus: z.string().optional().describe('Optional focus area, e.g. "revenue", "user_retention", "product_performance"'),
  maxInsights: z.number().optional().default(5).describe('Maximum number of insights to return'),
});

export const AskQuestionSchema = z.object({
  question: z.string().describe('Natural language question about the data'),
  includeSql: z.boolean().optional().default(true).describe('Whether to include the generated SQL in the response'),
});
