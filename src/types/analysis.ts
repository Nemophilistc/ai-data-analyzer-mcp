export interface DomainDetectionResult {
  domain: string;
  confidence: number;
  matchedSignals: string[];
  description: string;
}

export interface HealthReport {
  summary: string;
  dataQuality: DataQualityIssue[];
  keyMetrics: KeyMetric[];
  anomalies: Anomaly[];
  risks: Risk[];
}

export interface DataQualityIssue {
  table: string;
  column: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  detail: string;
  suggestedAction: string;
}

export interface KeyMetric {
  name: string;
  value: number | string;
  trend: 'up' | 'down' | 'stable' | 'unknown';
  changePercent: number | null;
  period: string;
}

export interface Anomaly {
  description: string;
  affectedTable: string;
  affectedColumn: string;
  severity: 'low' | 'medium' | 'high';
  evidence: string;
}

export interface Risk {
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestedAction: string;
}

export interface Insight {
  category: 'pattern' | 'opportunity' | 'risk' | 'anomaly' | 'trend';
  title: string;
  description: string;
  evidence: string;
  suggestedAction: string;
  estimatedImpact: string;
  sql: string;
}

export interface InsightReport {
  summary: string;
  insights: Insight[];
  generatedAt: string;
}

export interface AnalysisAnswer {
  question: string;
  answer: string;
  data: Record<string, any>[] | null;
  sql: string;
  visualization: string | null;
}
