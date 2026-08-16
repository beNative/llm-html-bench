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
    candidates.push(`${clean}/v1/chat/completions`);
    candidates.push(`${clean}/chat/completions`);
    candidates.push(`${clean}/api/v1/chat/completions`);
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
      stream: false,
    };

    if (typeof request.temperature === 'number') payload.temperature = request.temperature;
    if (typeof request.topP === 'number') payload.top_p = request.topP;
    if (typeof request.maxTokens === 'number') payload.max_tokens = request.maxTokens;
    if (typeof request.seed === 'number') payload.seed = request.seed;

    const startTime = Date.now();
    let successfulUrl = '';
    let lastError = '';
    let rawOutput = '';
    let responseId: string | undefined;
    let resolvedModel = request.modelId;
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;

    for (const url of candidateUrls) {
      try {
        Logger.info('PROVIDER', `Sending completion request to: ${url} (Model: ${request.modelId}, stream: false)`);
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          lastError = `HTTP ${res.status} at ${url}: ${errText.slice(0, 500)}`;
          Logger.warn('PROVIDER', `Request to ${url} returned ${lastError}`);
          continue;
        }

        const contentType = res.headers.get('content-type') || '';
        const responseText = await res.text();

        // Reject if HTML landing page was returned with HTTP 200 (like LM Studio root or web UI)
        if (contentType.includes('text/html') || responseText.trim().startsWith('<!DOCTYPE html>') || responseText.trim().startsWith('<html')) {
          lastError = `Endpoint ${url} returned HTML landing page instead of OpenAI API JSON`;
          Logger.warn('PROVIDER', lastError);
          continue;
        }

        let parsedJson: any = null;
        try {
          parsedJson = JSON.parse(responseText);
        } catch {
          // Might be SSE stream
        }

        let parsedOutput = '';
        if (parsedJson) {
          parsedOutput =
            parsedJson.choices?.[0]?.message?.content ??
            parsedJson.choices?.[0]?.text ??
            parsedJson.response ??
            parsedJson.message?.content ??
            '';
          responseId = parsedJson.id;
          if (parsedJson.model) resolvedModel = parsedJson.model;
          inputTokens = parsedJson.usage?.prompt_tokens ?? parsedJson.prompt_eval_count;
          outputTokens = parsedJson.usage?.completion_tokens ?? parsedJson.eval_count;
        } else {
          // Fallback: Parse SSE streamed chunks
          const lines = responseText.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data:') && !trimmed.includes('[DONE]')) {
              try {
                const chunk = JSON.parse(trimmed.slice(5).trim());
                const delta = chunk.choices?.[0]?.delta?.content ?? chunk.choices?.[0]?.text ?? '';
                parsedOutput += delta;
                if (chunk.id) responseId = chunk.id;
                if (chunk.model) resolvedModel = chunk.model;
              } catch {}
            }
          }
        }

        if (!parsedOutput && !responseText.includes('choices') && !responseText.includes('message')) {
          lastError = `No completion choices returned from ${url}`;
          Logger.warn('PROVIDER', lastError);
          continue;
        }

        rawOutput = parsedOutput || responseText;
        successfulUrl = url;
        break;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        Logger.warn('PROVIDER', `Request to ${url} failed with: ${lastError}`);
      }
    }

    const durationMs = Date.now() - startTime;

    if (!successfulUrl || !rawOutput) {
      throw new Error(`Provider generation failed: ${lastError || 'Could not reach completion endpoint'}`);
    }

    const extracted = extractHtml(rawOutput);

    let tokensPerSecond: number | undefined;
    if (outputTokens && durationMs > 0) {
      tokensPerSecond = Math.round((outputTokens / (durationMs / 1000)) * 10) / 10;
    }

    Logger.info(
      'PROVIDER',
      `✓ Completion received from ${successfulUrl} in ${durationMs}ms (${outputTokens || 0} tokens, ${tokensPerSecond || 0} tok/s, HTML extracted: ${extracted.length} chars)`
    );

    return {
      rawOutput,
      extractedHtml: extracted,
      generationTimeMs: durationMs,
      inputTokens,
      outputTokens,
      tokensPerSecond,
      requestedModelId: request.modelId,
      resolvedModelId: resolvedModel,
      metadata: {
        providerId: config.id,
        baseUrl: config.baseUrl,
        endpointUrl: successfulUrl,
        responseId,
      },
    };
  }

  public async generateStream(
    request: GenerationRequest,
    config: ProviderConfig,
    onChunk: (delta: string, accumulated: string) => void,
    signal?: AbortSignal
  ): Promise<GenerationResult> {
    const candidateUrls = getCandidateChatUrls(config.baseUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
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
      stream: true,
    };

    if (typeof request.temperature === 'number') payload.temperature = request.temperature;
    if (typeof request.topP === 'number') payload.top_p = request.topP;
    if (typeof request.maxTokens === 'number') payload.max_tokens = request.maxTokens;
    if (typeof request.seed === 'number') payload.seed = request.seed;

    const startTime = Date.now();
    let successfulUrl = '';
    let lastError = '';
    let accumulated = '';
    let responseId: string | undefined;
    let resolvedModel = request.modelId;
    let inputTokens: number | undefined;
    let outputTokens: number | undefined;

    for (const url of candidateUrls) {
      if (signal?.aborted) throw new Error('Generation cancelled by user');

      try {
        Logger.info('PROVIDER', `Sending SSE streaming request to: ${url} (Model: ${request.modelId})`);
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          lastError = `HTTP ${res.status} at ${url}: ${errText.slice(0, 500)}`;
          Logger.warn('PROVIDER', `Streaming request to ${url} returned ${lastError}`);
          continue;
        }

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          lastError = `Endpoint ${url} returned HTML landing page instead of SSE stream`;
          Logger.warn('PROVIDER', lastError);
          continue;
        }

        if (!res.body) {
          lastError = `No response body received from ${url}`;
          continue;
        }

        successfulUrl = url;
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          if (signal?.aborted) {
            reader.cancel().catch(() => {});
            throw new Error('Generation cancelled by user');
          }

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line || line.startsWith(':')) continue;

            if (line.startsWith('data:')) {
              const dataStr = line.slice(5).trim();
              if (dataStr === '[DONE]') {
                break;
              }

              try {
                const chunk = JSON.parse(dataStr);
                const delta =
                  chunk.choices?.[0]?.delta?.content ??
                  chunk.choices?.[0]?.text ??
                  chunk.message?.content ??
                  chunk.response ??
                  '';

                if (chunk.id) responseId = chunk.id;
                if (chunk.model) resolvedModel = chunk.model;
                if (chunk.usage?.prompt_tokens) inputTokens = chunk.usage.prompt_tokens;
                if (chunk.usage?.completion_tokens) outputTokens = chunk.usage.completion_tokens;

                if (delta) {
                  accumulated += delta;
                  onChunk(delta, accumulated);
                }
              } catch {
                // Ignore malformed JSON chunks
              }
            } else if (line.startsWith('{') && line.endsWith('}')) {
              try {
                const chunk = JSON.parse(line);
                const delta = chunk.message?.content ?? chunk.response ?? '';
                if (chunk.model) resolvedModel = chunk.model;
                if (chunk.eval_count) outputTokens = chunk.eval_count;
                if (chunk.prompt_eval_count) inputTokens = chunk.prompt_eval_count;

                if (delta) {
                  accumulated += delta;
                  onChunk(delta, accumulated);
                }
              } catch {
                // Ignore
              }
            }
          }
        }

        if (buffer.trim()) {
          const line = buffer.trim();
          if (line.startsWith('data:') && !line.includes('[DONE]')) {
            try {
              const chunk = JSON.parse(line.slice(5).trim());
              const delta = chunk.choices?.[0]?.delta?.content ?? '';
              if (delta) {
                accumulated += delta;
                onChunk(delta, accumulated);
              }
            } catch {}
          }
        }

        break;
      } catch (err: unknown) {
        if (signal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
          throw new Error('Generation cancelled by user');
        }
        lastError = err instanceof Error ? err.message : String(err);
        Logger.warn('PROVIDER', `Streaming attempt failed at ${url}: ${lastError}`);
      }
    }

    const durationMs = Date.now() - startTime;

    if (!successfulUrl || !accumulated) {
      Logger.warn('PROVIDER', `Streaming returned no output (${lastError}). Falling back to non-streaming generate...`);
      return this.generate(request, config);
    }

    const extracted = extractHtml(accumulated);

    if (!outputTokens) {
      outputTokens = Math.max(1, Math.round(accumulated.length / 3.8));
    }
    if (!inputTokens) {
      inputTokens = Math.max(1, Math.round(request.promptText.length / 3.8));
    }

    let tokensPerSecond: number | undefined;
    if (outputTokens && durationMs > 0) {
      tokensPerSecond = Math.round((outputTokens / (durationMs / 1000)) * 10) / 10;
    }

    Logger.info(
      'PROVIDER',
      `✓ Stream completed from ${successfulUrl} in ${durationMs}ms (${outputTokens} tokens, ${tokensPerSecond || 0} tok/s, HTML extracted: ${extracted.length} chars)`
    );

    return {
      rawOutput: accumulated,
      extractedHtml: extracted,
      generationTimeMs: durationMs,
      inputTokens,
      outputTokens,
      tokensPerSecond,
      requestedModelId: request.modelId,
      resolvedModelId: resolvedModel,
      metadata: {
        providerId: config.id,
        baseUrl: config.baseUrl,
        endpointUrl: successfulUrl,
        responseId,
        streaming: true,
      },
    };
  }
}
