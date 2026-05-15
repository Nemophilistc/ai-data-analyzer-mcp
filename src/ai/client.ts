// Copyright (c) 2026 MIMO. MIT License.
// https://github.com/Nemophilistc/ai-data-analyzer-mcp

export class AIClient {
  private provider: 'anthropic' | 'openai' | null = null;
  private apiKey: string = '';

  constructor() {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (anthropicKey) {
      this.provider = 'anthropic';
      this.apiKey = anthropicKey;
    } else if (openaiKey) {
      this.provider = 'openai';
      this.apiKey = openaiKey;
    }
  }

  async chat(systemPrompt: string, userMessage: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Please set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable');
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (this.provider === 'anthropic') {
          return await this.callAnthropic(systemPrompt, userMessage);
        }
        return await this.callOpenAI(systemPrompt, userMessage);
      } catch (err: any) {
        if (attempt === 2) throw err;
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw new Error('AI request failed after 3 attempts');
  }

  async chatWithJsonOutput(systemPrompt: string, userMessage: string): Promise<any> {
    const text = await this.chat(systemPrompt, userMessage);
    try {
      return this.extractJson(text);
    } catch {
      const retryText = await this.chat(
        systemPrompt + '\n\nYou MUST respond with valid JSON only. No markdown, no explanation.',
        userMessage
      );
      return this.extractJson(retryText);
    }
  }

  private extractJson(text: string): any {
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1].trim());
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    throw new Error('No JSON found in response');
  }

  private async callAnthropic(systemPrompt: string, userMessage: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Anthropic API error ${response.status}: ${errorBody}`);
      }

      const data = await response.json() as any;
      return data.content[0].text;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async callOpenAI(systemPrompt: string, userMessage: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 4096,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
      }

      const data = await response.json() as any;
      return data.choices[0].message.content;
    } finally {
      clearTimeout(timeout);
    }
  }
}
