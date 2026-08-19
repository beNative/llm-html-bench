import { describe, it, expect } from 'vitest';
import {
  MODEL_TEMPLATES,
  PROVIDER_CATEGORIES,
  ARCHITECTURE_PRESETS,
  QUANTIZATION_CATEGORIES,
} from '../src/shared/constants/modelPresets';

describe('Model Presets & Templates', () => {
  it('contains valid curated model templates with essential attributes', () => {
    expect(MODEL_TEMPLATES.length).toBeGreaterThan(10);

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

  it('includes DeepSeek R1 and Claude 3.7 Sonnet with reasoning flags', () => {
    const r1 = MODEL_TEMPLATES.find((t) => t.id === 'deepseek-r1');
    expect(r1).toBeDefined();
    expect(r1?.isReasoningModel).toBe(true);
    expect(r1?.aaIntelligenceIndex).toBeGreaterThan(80);

    const c37 = MODEL_TEMPLATES.find((t) => t.id === 'claude-3-7-sonnet');
    expect(c37).toBeDefined();
    expect(c37?.isReasoningModel).toBe(true);
    expect(c37?.aaIntelligenceIndex).toBeGreaterThan(85);
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
