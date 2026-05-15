import type {
  DomainDetectionResult,
  HealthReport,
  InsightReport,
  AnalysisAnswer,
} from '../types/analysis.js';

export function extractJson(text: string): any {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return JSON.parse(codeBlockMatch[1].trim());
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }

  throw new Error('No JSON found in AI response');
}

export function parseDomainResult(text: string): DomainDetectionResult[] {
  const data = extractJson(text);
  if (!data.domains || !Array.isArray(data.domains)) {
    throw new Error('Invalid domain detection response: missing "domains" array');
  }
  return data.domains.map((d: any) => ({
    domain: d.domain ?? 'other',
    confidence: d.confidence ?? 0,
    matchedSignals: d.matchedSignals ?? [],
    description: d.description ?? '',
  }));
}

export function parseHealthReport(text: string): HealthReport {
  const data = extractJson(text);
  return {
    summary: data.summary ?? '',
    dataQuality: (data.dataQuality ?? []).map((q: any) => ({
      table: q.table ?? '',
      column: q.column ?? '',
      issue: q.issue ?? 'unknown',
      severity: q.severity ?? 'low',
      detail: q.detail ?? '',
      suggestedAction: q.suggestedAction ?? '',
    })),
    keyMetrics: (data.keyMetrics ?? []).map((m: any) => ({
      name: m.name ?? '',
      value: m.value ?? 0,
      trend: m.trend ?? 'unknown',
      changePercent: m.changePercent ?? null,
      period: m.period ?? '',
    })),
    anomalies: (data.anomalies ?? []).map((a: any) => ({
      description: a.description ?? '',
      affectedTable: a.affectedTable ?? '',
      affectedColumn: a.affectedColumn ?? '',
      severity: a.severity ?? 'low',
      evidence: a.evidence ?? '',
    })),
    risks: (data.risks ?? []).map((r: any) => ({
      description: r.description ?? '',
      severity: r.severity ?? 'low',
      suggestedAction: r.suggestedAction ?? '',
    })),
  };
}

export function parseInsightReport(text: string): InsightReport {
  const data = extractJson(text);
  return {
    summary: data.summary ?? '',
    insights: (data.insights ?? []).map((i: any) => ({
      category: i.category ?? 'pattern',
      title: i.title ?? '',
      description: i.description ?? '',
      evidence: i.evidence ?? '',
      suggestedAction: i.suggestedAction ?? '',
      estimatedImpact: i.estimatedImpact ?? '',
      sql: i.sql ?? '',
    })),
    generatedAt: new Date().toISOString(),
  };
}

export function parseAnalysisAnswer(text: string): AnalysisAnswer {
  const data = extractJson(text);
  return {
    question: data.question ?? '',
    answer: data.answer ?? '',
    data: data.data ?? null,
    sql: data.sql ?? '',
    visualization: data.visualization ?? null,
  };
}

export function parseGeneratedSql(text: string): { sql: string; explanation: string; assumptions: string[] } {
  const data = extractJson(text);
  if (!data.sql) {
    throw new Error('Invalid SQL generation response: missing "sql" field');
  }
  return {
    sql: data.sql,
    explanation: data.explanation ?? '',
    assumptions: data.assumptions ?? [],
  };
}
