// Copyright (c) 2026 MIMO. MIT License.
// https://github.com/Nemophilistc/ai-data-analyzer-mcp

export const PROMPTS = {
  domainDetection: (schemaSummary: string) => `
You are a database schema analyst. Given the following database schema, determine what type of application this database supports.

Database Schema:
${schemaSummary}

Analyze the table names, column names, and relationships to determine the application domain.

Respond in JSON format:
{
  "domains": [
    {
      "domain": "ecommerce|content_platform|project_management|saas_app|social_platform|education|fintech|healthcare|gaming|logistics|other",
      "confidence": 0.0-1.0,
      "matchedSignals": ["table_or_column_name1", "table_or_column_name2"],
      "description": "Brief explanation of why you think this is this domain"
    }
  ],
  "businessLogic": "A 2-3 sentence description of what this application does based on the schema",
  "dataModel": "Brief description of the core data model and relationships"
}

You may return multiple domains if the database supports multiple functionalities (e.g., an e-commerce platform with a blog section).
Sort by confidence descending.
`,

  healthCheck: (schemaSummary: string, sampleData: string, columnStats: string) => `
You are a senior data analyst performing a health check on a database.

Database Schema:
${schemaSummary}

Sample Data (first few rows of key tables):
${sampleData}

Column Statistics:
${columnStats}

Perform a comprehensive data health check. Analyze:

1. **Data Quality Issues**: Look for high null rates, potential outliers, data inconsistencies, format issues
2. **Key Metrics**: Based on the domain, identify and calculate the most important business metrics from the data
3. **Anomalies**: Any data points that look unusual or suspicious
4. **Risks**: Business risks visible from the data (e.g., data concentration, missing data trends)

Respond in JSON format:
{
  "summary": "2-3 sentence overall health assessment",
  "dataQuality": [
    {
      "table": "table_name",
      "column": "column_name",
      "issue": "high_null_rate|outliers|data_inconsistency|format_issue|stale_data",
      "severity": "low|medium|high",
      "detail": "Description of the issue with specific numbers",
      "suggestedAction": "What to do about it"
    }
  ],
  "keyMetrics": [
    {
      "name": "metric_name",
      "value": "metric_value",
      "trend": "up|down|stable|unknown",
      "changePercent": null_or_number,
      "period": "time_period"
    }
  ],
  "anomalies": [
    {
      "description": "What's unusual",
      "affectedTable": "table",
      "affectedColumn": "column",
      "severity": "low|medium|high",
      "evidence": "Evidence with numbers"
    }
  ],
  "risks": [
    {
      "description": "Risk description",
      "severity": "low|medium|high",
      "suggestedAction": "Mitigation suggestion"
    }
  ]
}
`,

  discoverInsights: (schemaSummary: string, domain: string, sampleData: string, focus?: string) => `
You are a senior data analyst discovering insights from a database.

Database Schema:
${schemaSummary}

Detected Domain: ${domain}

Sample Data:
${sampleData}

${focus ? `Focus Area: ${focus}` : 'Analyze all major aspects of the business.'}

Your job is to discover non-obvious insights. Don't just summarize the data — find patterns, correlations, and opportunities that the business owner might not be aware of.

For each insight:
1. State what you found
2. Show the evidence (specific numbers)
3. Explain why it matters
4. Suggest a concrete action
5. Estimate the potential impact

Think like a senior consultant presenting findings to a CEO. Be specific with numbers, not vague.

Respond in JSON format:
{
  "summary": "3-4 sentence executive summary of findings",
  "insights": [
    {
      "category": "pattern|opportunity|risk|anomaly|trend",
      "title": "Short descriptive title",
      "description": "Detailed explanation of the insight",
      "evidence": "Specific data points and numbers",
      "suggestedAction": "Concrete next step",
      "estimatedImpact": "Quantified potential impact",
      "sql": "The SQL query that would verify this insight"
    }
  ]
}
`,

  answerQuestion: (schemaSummary: string, domain: string, question: string, queryResult: string) => `
You are a data analyst answering a business question based on database data.

Database Schema:
${schemaSummary}
Domain: ${domain}

User Question: ${question}

Query Result:
${queryResult}

Analyze the data and provide a clear, actionable answer. Don't just repeat the numbers — interpret them and provide context.

If the data doesn't fully answer the question, say what additional data would be needed.

Respond in JSON format:
{
  "answer": "Your analysis in plain language, 2-5 paragraphs",
  "keyFindings": ["finding1", "finding2", "finding3"],
  "suggestedFollowUp": ["follow-up question 1", "follow-up question 2"],
  "visualization": "suggested chart type: bar|line|pie|table|heatmap|none"
}
`,

  generateSql: (schemaSummary: string, domain: string, question: string, dialect: 'postgresql' | 'sqlite') => `
You are a SQL expert. Generate a safe, read-only SQL query to answer the user's question.

Database Schema:
${schemaSummary}
Domain: ${domain}
SQL Dialect: ${dialect}

User Question: ${question}

Rules:
1. ONLY generate SELECT queries (no INSERT, UPDATE, DELETE, DROP, etc.)
2. Use proper JOINs based on the foreign key relationships
3. Add appropriate WHERE clauses for filtering
4. Use aggregate functions when appropriate (COUNT, SUM, AVG, etc.)
5. Add ORDER BY for meaningful sorting
6. Limit results to a reasonable number (use LIMIT)
7. Use table and column comments to understand the business meaning
8. For time-based analysis, use appropriate date functions for the dialect

Respond in JSON format:
{
  "sql": "SELECT ...",
  "explanation": "Brief explanation of what this query does",
  "assumptions": ["any assumptions made about the data"]
}
`,
};
