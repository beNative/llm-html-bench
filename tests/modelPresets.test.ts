import { describe, it, expect } from 'vitest';
import {
  MODEL_TEMPLATES,
  PROVIDER_CATEGORIES,
  ARCHITECTURE_PRESETS,
  QUANTIZATION_CATEGORIES,
} from '../src/shared/constants/modelPresets';

describe('Model Presets & Templates', () => {
  it('contains valid curated model templates with essential attributes', () => {
    expect(MODEL_TEMPLATES.length).toBeGreaterThanOrEqual(35);

    for (const t of MODEL_TEMPLATES) {
      expect(t.id).toBeDefined();
      expect(t.name).toBeDefined();
      expect(t.provider).toBeDefined();
      expect(t.modelName).toBeDefined();
      expect(t.displayName).toBeDefined();
      expect(t.architecture).toBeDefined();
      expect(t.quantization).toBeDefined();
      expect(['cloud', 'local']).toContain(t.localOrCloud);
    }
  });

  it('includes Claude Opus 5, GPT-5.6 Sol, DeepSeek-V4-Pro, Gemini 3.1 Pro, and Grok 4.6 with reasoning flags', () => {
    const opus5 = MODEL_TEMPLATES.find((t) => t.id === 'claude-opus-5');
    expect(opus5).toBeDefined();
    expect(opus5?.isReasoningModel).toBe(true);
    expect(opus5?.aaIntelligenceIndex).toBeGreaterThan(95);

    const gpt56 = MODEL_TEMPLATES.find((t) => t.id === 'gpt-5-6-sol');
    expect(gpt56).toBeDefined();
    expect(gpt56?.isReasoningModel).toBe(true);
    expect(gpt56?.aaIntelligenceIndex).toBeGreaterThan(95);

    const v4pro = MODEL_TEMPLATES.find((t) => t.id === 'deepseek-v4-pro');
    expect(v4pro).toBeDefined();
    expect(v4pro?.isReasoningModel).toBe(true);
    expect(v4pro?.aaIntelligenceIndex).toBeGreaterThan(90);

    const gemini31 = MODEL_TEMPLATES.find((t) => t.id === 'gemini-3-1-pro');
    expect(gemini31).toBeDefined();
    expect(gemini31?.isReasoningModel).toBe(true);
    expect(gemini31?.aaIntelligenceIndex).toBeGreaterThan(90);

    const grok46 = MODEL_TEMPLATES.find((t) => t.id === 'grok-4-6');
    expect(grok46).toBeDefined();
    expect(grok46?.isReasoningModel).toBe(true);

    const kimiK3 = MODEL_TEMPLATES.find((t) => t.id === 'kimi-k3');
    expect(kimiK3).toBeDefined();
    expect(kimiK3?.isReasoningModel).toBe(true);
  });

  it('has comprehensive provider and architecture categories', () => {
    expect(PROVIDER_CATEGORIES.length).toBeGreaterThanOrEqual(3);
    const providers = PROVIDER_CATEGORIES.flatMap((c) => c.providers);
    expect(providers).toContain('Anthropic');
    expect(providers).toContain('OpenAI');
    expect(providers).toContain('DeepSeek');
    expect(providers).toContain('Ollama');
    expect(providers).toContain('LM Studio');

    const archLabels = ARCHITECTURE_PRESETS.map((a) => a.label);
    expect(archLabels).toContain('Transformer (Decoder-only Dense)');
    expect(archLabels).toContain('Mixture of Experts (MoE)');
    expect(archLabels).toContain('Reasoning / Thinking Model');

    const quantCats = QUANTIZATION_CATEGORIES.map((q) => q.category);
    expect(quantCats.length).toBeGreaterThanOrEqual(3);
  });
});
