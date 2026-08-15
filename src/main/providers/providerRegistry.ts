import { LLMProvider } from '../../shared/types/providers';
import { OpenAICompatibleProvider } from './openaiProvider';

export class ProviderRegistry {
  private static providers: Map<string, LLMProvider> = new Map();

  public static initialize(): void {
    const openai = new OpenAICompatibleProvider();
    this.providers.set(openai.id, openai);
  }

  public static getProvider(_type: string): LLMProvider | undefined {
    if (this.providers.size === 0) {
      this.initialize();
    }
    // For now openai-compatible handles general OpenAI endpoints, OpenRouter, LM Studio, Ollama, vLLM
    return this.providers.get('openai-compatible');
  }

  public static registerProvider(provider: LLMProvider): void {
    this.providers.set(provider.id, provider);
  }
}
