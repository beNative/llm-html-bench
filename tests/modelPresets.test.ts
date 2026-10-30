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

  it('includes the latest 2026 frontier models across all Frontier Cloud Labs', () => {
    // Anthropic Opus 5.5 & Sonnet 5.5
    const opus55 = MODEL_TEMPLATES.find((t) => t.id === 'claude-opus-5-5');
    expect(opus55).toBeDefined();
    expect(opus55?.isReasoningModel).toBe(true);
    expect(opus55?.contextWindow).toBe('1M');

    // OpenAI GPT-6 Astra & GPT-6.1 Sol
    const gpt6Astra = MODEL_TEMPLATES.find((t) => t.id === 'gpt-6-astra');
    expect(gpt6Astra).toBeDefined();
    expect(gpt6Astra?.isReasoningModel).toBe(true);

    const gpt61Sol = MODEL_TEMPLATES.find((t) => t.id === 'gpt-6-1-sol');
    expect(gpt61Sol).toBeDefined();
    expect(gpt61Sol?.isReasoningModel).toBe(true);

    // Google Gemini 4 Argon & 3.8 Flash
    const gemini4 = MODEL_TEMPLATES.find((t) => t.id === 'gemini-4-argon');
    expect(gemini4).toBeDefined();
    expect(gemini4?.contextWindow).toBe('4M');

    const gemini38 = MODEL_TEMPLATES.find((t) => t.id === 'gemini-3-8-flash');
    expect(gemini38).toBeDefined();

    // DeepSeek V4.1 Flash
    const dsV41 = MODEL_TEMPLATES.find((t) => t.id === 'deepseek-v4-1-flash');
    expect(dsV41).toBeDefined();
    expect(dsV41?.contextWindow).toBe('1M');

    // xAI Grok 4.7
    const grok47 = MODEL_TEMPLATES.find((t) => t.id === 'grok-4-7');
    expect(grok47).toBeDefined();
    expect(grok47?.isReasoningModel).toBe(true);

    // Meta Muse Spark 1.3
    const museSpark = MODEL_TEMPLATES.find((t) => t.id === 'meta-muse-spark-1-3');
    expect(museSpark).toBeDefined();

    // Mistral Medium 3.5 & Devstral 2
    expect(MODEL_TEMPLATES.find((t) => t.id === 'mistral-medium-3-5')).toBeDefined();
    expect(MODEL_TEMPLATES.find((t) => t.id === 'devstral-2')).toBeDefined();

    // Alibaba Qwen 3.8-Omni-Flash & QwQ-32B
    expect(MODEL_TEMPLATES.find((t) => t.id === 'qwen-3-8-omni-flash')).toBeDefined();
    expect(MODEL_TEMPLATES.find((t) => t.id === 'qwq-32b-thinking')).toBeDefined();

    // MiniMax M3.1 Flash
    expect(MODEL_TEMPLATES.find((t) => t.id === 'minimax-m3-1-flash')).toBeDefined();

    // Cohere Command A+
    expect(MODEL_TEMPLATES.find((t) => t.id === 'cohere-command-a-plus')).toBeDefined();

    // Microsoft MAI-Thinking-1
    expect(MODEL_TEMPLATES.find((t) => t.id === 'microsoft-mai-thinking-1')).toBeDefined();

    // Amazon Nova 2 Pro
    expect(MODEL_TEMPLATES.find((t) => t.id === 'amazon-nova-2-pro')).toBeDefined();

    // Zhipu GLM-5.3
    expect(MODEL_TEMPLATES.find((t) => t.id === 'glm-5-3')).toBeDefined();

    // October 2026 Top-Tier Releases
    const gemini4Carbon = MODEL_TEMPLATES.find((t) => t.id === 'gemini-4-carbon');
    expect(gemini4Carbon).toBeDefined();
    expect(gemini4Carbon?.isTopTier).toBe(true);
    expect(gemini4Carbon?.aaIntelligenceIndex).toBeGreaterThanOrEqual(98.5);

    const gpt61Terra = MODEL_TEMPLATES.find((t) => t.id === 'gpt-6-1-terra');
    expect(gpt61Terra).toBeDefined();
    expect(gpt61Terra?.isTopTier).toBe(true);

    const dsV41Flash1017 = MODEL_TEMPLATES.find((t) => t.id === 'deepseek-v4-1-flash-1017');
    expect(dsV41Flash1017).toBeDefined();
    expect(dsV41Flash1017?.isTopTier).toBe(true);

    const museWonder = MODEL_TEMPLATES.find((t) => t.id === 'meta-muse-wonder-full');
    expect(museWonder).toBeDefined();
    expect(museWonder?.isTopTier).toBe(true);

    const mistralLarge4 = MODEL_TEMPLATES.find((t) => t.id === 'mistral-large-4');
    expect(mistralLarge4).toBeDefined();
    expect(mistralLarge4?.isTopTier).toBe(true);

    const qwen38FlashNext = MODEL_TEMPLATES.find((t) => t.id === 'qwen-3-8-flash-next');
    expect(qwen38FlashNext).toBeDefined();
    expect(qwen38FlashNext?.isTopTier).toBe(true);

    const kimiK31Pro = MODEL_TEMPLATES.find((t) => t.id === 'kimi-k3-1-pro');
    expect(kimiK31Pro).toBeDefined();
    expect(kimiK31Pro?.isTopTier).toBe(true);
    expect(MODEL_TEMPLATES.find((t) => t.id === 'kimi-k3-1-pro-highspeed')).toBeDefined();

    const mimoV26Pro = MODEL_TEMPLATES.find((t) => t.id === 'mimo-v2-6-pro');
    expect(mimoV26Pro).toBeDefined();
    expect(mimoV26Pro?.isTopTier).toBe(true);

    // Ensure a substantial set of top-tier models are flagged for auto-import
    const topTierCount = MODEL_TEMPLATES.filter((t) => t.isTopTier).length;
    expect(topTierCount).toBeGreaterThanOrEqual(15);
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
