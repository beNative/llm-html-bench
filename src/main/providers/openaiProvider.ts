import { LLMProvider, GenerationRequest, GenerationResult, ProviderConfig } from '../../shared/types/providers';
import { extractHtml } from '../../shared/utils/htmlExtractor';

export class OpenAICompatibleProvider implements LLMProvider {
  public id = 'openai-compatible';
  public name = 'OpenAI Compatible';

  public async testConnection(config: ProviderConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${config.baseUrl.replace(/\/+$/, '')}/models`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      const res = await fetch(url, { method: 'GET', headers });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return { success: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
      }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  public async generate(request: GenerationRequest, config: ProviderConfig): Promise<GenerationResult> {
    const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const messages: { role: string; content: string }[] = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.promptText });

    const payload: Record<string, unknown> = {
      model: request.modelId,
      messages,
    };

    if (typeof request.temperature === 'number') payload.temperature = request.temperature;
    if (typeof request.topP === 'number') payload.top_p = request.topP;
    if (typeof request.maxTokens === 'number') payload.max_tokens = request.maxTokens;
    if (typeof request.seed === 'number') payload.seed = request.seed;

    const startTime = Date.now();

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Provider returned HTTP ${response.status}: ${errText.slice(0, 500)}`);
    }

    interface ChatCompletionResponse {
      id?: string;
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const rawOutput = data.choices?.[0]?.message?.content || '';
    const extracted = extractHtml(rawOutput);

    const inputTokens = data.usage?.prompt_tokens;
    const outputTokens = data.usage?.completion_tokens;
    let tokensPerSecond: number | undefined;

    if (outputTokens && durationMs > 0) {
      tokensPerSecond = Math.round((outputTokens / (durationMs / 1000)) * 10) / 10;
    }

    return {
      rawOutput,
      extractedHtml: extracted,
      generationTimeMs: durationMs,
      inputTokens,
      outputTokens,
      tokensPerSecond,
      requestedModelId: request.modelId,
      resolvedModelId: data.model || request.modelId,
      metadata: {
        providerId: config.id,
        baseUrl: config.baseUrl,
        responseId: data.id,
      },
    };
  }
}
