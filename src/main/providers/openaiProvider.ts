import { LLMProvider, GenerationRequest, GenerationResult, ProviderConfig } from '../../shared/types/providers';
import { extractHtml } from '../../shared/utils/htmlExtractor';
import { Logger } from '../utils/logger';

function getCandidateModelUrls(baseUrl: string): string[] {
  const clean = baseUrl.trim().replace(/\/+$/, '');
  const candidates: string[] = [];

  if (clean.endsWith('/models') || clean.endsWith('/tags')) {
    candidates.push(clean);
  } else if (clean.endsWith('/v1')) {
    candidates.push(`${clean}/models`);
    candidates.push(`${clean.replace(/\/v1$/, '')}/models`);
    candidates.push(`${clean.replace(/\/v1$/, '')}/api/tags`);
  } else {
    candidates.push(`${clean}/v1/models`);
    candidates.push(`${clean}/models`);
    candidates.push(`${clean}/api/tags`);
    candidates.push(`${clean}/api/v1/models`);
  }

  return Array.from(new Set(candidates));
}

function getCandidateChatUrls(baseUrl: string): string[] {
  const clean = baseUrl.trim().replace(/\/+$/, '');
  const candidates: string[] = [];

  if (clean.endsWith('/chat/completions')) {
    candidates.push(clean);
  } else if (clean.endsWith('/v1')) {
    candidates.push(`${clean}/chat/completions`);
    candidates.push(`${clean.replace(/\/v1$/, '')}/chat/completions`);
  } else {
    candidates.push(`${clean}/chat/completions`);
    candidates.push(`${clean}/v1/chat/completions`);
  }

  return Array.from(new Set(candidates));
}

export class OpenAICompatibleProvider implements LLMProvider {
  public id = 'openai-compatible';
  public name = 'OpenAI Compatible';

  public async testConnection(config: ProviderConfig): Promise<{ success: boolean; error?: string }> {
    const candidateUrls = getCandidateModelUrls(config.baseUrl);
    Logger.info('PROVIDER', `Testing connection for provider "${config.name}" across ${candidateUrls.length} candidate endpoint(s)...`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    let lastError = '';

    for (const url of candidateUrls) {
      try {
        Logger.debug('PROVIDER', `Testing endpoint URL: ${url}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);

        const res = await fetch(url, { method: 'GET', headers, signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          Logger.info('PROVIDER', `✓ Connection test succeeded at: ${url} (HTTP ${res.status})`);
          return { success: true };
        } else {
          const text = await res.text().catch(() => '');
          lastError = `HTTP ${res.status} at ${url}: ${text.slice(0, 150)}`;
          Logger.warn('PROVIDER', `Candidate ${url} returned ${lastError}`);
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        Logger.warn('PROVIDER', `Candidate ${url} failed with error: ${lastError}`);
      }
    }

    return { success: false, error: lastError || 'Could not connect to provider endpoint.' };
  }

  public async fetchModels(config: ProviderConfig): Promise<{ success: boolean; models: Array<{ id: string; name: string; ownedBy?: string }>; error?: string }> {
    const candidateUrls = getCandidateModelUrls(config.baseUrl);
    Logger.info('PROVIDER', `Auto-discovering models for "${config.name}" (Base URL: ${config.baseUrl}). Testing candidate URLs: ${candidateUrls.join(', ')}`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    let lastError = '';

    for (const url of candidateUrls) {
      try {
        Logger.debug('PROVIDER', `Querying model endpoint: ${url}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(url, { method: 'GET', headers, signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          lastError = `HTTP ${res.status} at ${url}: ${text.slice(0, 150)}`;
          Logger.warn('PROVIDER', `Endpoint ${url} responded with status: ${lastError}`);
          continue;
        }

        const json = (await res.json()) as any;
        let rawList: any[] = [];
        if (Array.isArray(json)) {
          rawList = json;
        } else if (Array.isArray(json?.data)) {
          rawList = json.data;
        } else if (Array.isArray(json?.models)) {
          rawList = json.models;
        }

        const models = rawList
          .map((item: any) => {
            if (typeof item === 'string') return { id: item, name: item };
            const id = item?.id || item?.name || item?.model;
            if (!id) return null;
            return {
              id: String(id),
              name: item?.name || item?.id || String(id),
              ownedBy: item?.owned_by || item?.owner || item?.details?.family,
            };
          })
          .filter((m): m is { id: string; name: string; ownedBy?: string } => !!m);

        models.sort((a, b) => a.id.localeCompare(b.id));

        Logger.info('PROVIDER', `✓ Successfully discovered ${models.length} model(s) from: ${url}`);
        return { success: true, models };
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        Logger.warn('PROVIDER', `Failed querying ${url}: ${lastError}`);
      }
    }

    Logger.error('PROVIDER', `All model discovery attempts failed for "${config.name}". Last error: ${lastError}`);
    return { success: false, models: [], error: lastError || `Could not discover models from ${config.baseUrl}` };
  }

  public async generate(request: GenerationRequest, config: ProviderConfig): Promise<GenerationResult> {
    const candidateUrls = getCandidateChatUrls(config.baseUrl);
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
    let response: Response | null = null;
    let successfulUrl = '';
    let lastError = '';

    for (const url of candidateUrls) {
      try {
        Logger.info('PROVIDER', `Sending completion request to: ${url} (Model: ${request.modelId})`);
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          response = res;
          successfulUrl = url;
          break;
        } else {
          const errText = await res.text().catch(() => '');
          lastError = `HTTP ${res.status} at ${url}: ${errText.slice(0, 500)}`;
          Logger.warn('PROVIDER', `Request to ${url} returned ${lastError}`);
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        Logger.warn('PROVIDER', `Request to ${url} failed with: ${lastError}`);
      }
    }

    const durationMs = Date.now() - startTime;

    if (!response || !response.ok) {
      throw new Error(`Provider generation failed: ${lastError || 'Could not reach completion endpoint'}`);
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

    Logger.info('PROVIDER', `✓ Completion received from ${successfulUrl} in ${durationMs}ms (${outputTokens || 0} tokens, ${tokensPerSecond || 0} tok/s)`);

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
        endpointUrl: successfulUrl,
        responseId: data.id,
      },
    };
  }
}
