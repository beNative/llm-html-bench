export interface GenerationRequest {
  promptText: string;
  modelId: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  seed?: number;
  reasoningEffort?: string;
  systemPrompt?: string;
}

export interface GenerationResult {
  rawOutput: string;
  extractedHtml: string;
  generationTimeMs: number;
  inputTokens?: number;
  outputTokens?: number;
  tokensPerSecond?: number;
  requestedModelId: string;
  resolvedModelId?: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderConfig {
  id: string;
  name: string;
  type: 'openai-compatible' | 'anthropic' | 'google' | 'custom';
  baseUrl: string;
  apiKey?: string;
  defaultModel?: string;
  enabled: boolean;
}

export interface LLMProvider {
  id: string;
  name: string;
  generate(request: GenerationRequest, config: ProviderConfig): Promise<GenerationResult>;
  testConnection(config: ProviderConfig): Promise<{ success: boolean; error?: string }>;
}
