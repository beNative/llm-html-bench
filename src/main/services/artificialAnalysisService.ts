import { ArtificialAnalysisModelBenchmark } from '../../shared/types/ipc';
import { MODEL_TEMPLATES, ModelPresetTemplate } from '../../shared/constants/modelPresets';
import { ModelRepository } from '../repositories/modelRepository';
import { SettingsService } from './settingsService';
import { Logger } from '../utils/logger';

const norm = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export class ArtificialAnalysisService {
  private modelRepository: ModelRepository;
  private settingsService?: SettingsService;

  constructor(modelRepository: ModelRepository, settingsService?: SettingsService) {
    this.modelRepository = modelRepository;
    this.settingsService = settingsService;
  }

  private buildCuratedBenchmarks(): ArtificialAnalysisModelBenchmark[] {
    return MODEL_TEMPLATES.map((t) => ({
      modelId: t.aaModelId || t.id,
      name: t.displayName,
      provider: t.provider,
      intelligenceIndex: t.aaIntelligenceIndex,
      evaluations: t.aaEvaluations ? { ...t.aaEvaluations } : undefined,
      contextWindow: t.contextWindow,
      isReasoningModel: t.isReasoningModel,
      isTopTier: Boolean(t.isTopTier),
      notes: t.notes,
    }));
  }

  private mergeWithCuratedTemplates(
    liveModels: ArtificialAnalysisModelBenchmark[]
  ): ArtificialAnalysisModelBenchmark[] {
    const curated = this.buildCuratedBenchmarks();
    const mergedMap = new Map<string, ArtificialAnalysisModelBenchmark>();

    for (const c of curated) {
      mergedMap.set(norm(c.modelId), { ...c });
    }

    // Sort live models by intelligence index descending to mark top 15 live models as top-tier
    const sortedLive = [...liveModels].sort(
      (a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0)
    );
    const topLiveIds = new Set(sortedLive.slice(0, 15).map((m) => norm(m.modelId)));

    for (const live of liveModels) {
      const liveIdNorm = norm(live.modelId);
      const liveNameNorm = norm(live.name);

      // Find matching curated entry by modelId or display name
      let matchedKey: string | undefined;
      if (mergedMap.has(liveIdNorm)) {
        matchedKey = liveIdNorm;
      } else {
        for (const [k, existing] of mergedMap.entries()) {
          const exNameNorm = norm(existing.name);
          if (
            exNameNorm === liveNameNorm ||
            (liveNameNorm.length >= 6 &&
              (exNameNorm.includes(liveNameNorm) || liveNameNorm.includes(exNameNorm)))
          ) {
            matchedKey = k;
            break;
          }
        }
      }

      const isTop = topLiveIds.has(liveIdNorm) || Boolean(live.isTopTier);

      if (matchedKey) {
        const existing = mergedMap.get(matchedKey)!;
        mergedMap.set(matchedKey, {
          ...existing,
          intelligenceIndex: live.intelligenceIndex ?? existing.intelligenceIndex,
          evaluations: {
            ...existing.evaluations,
            ...Object.fromEntries(
              Object.entries(live.evaluations || {}).filter(([, v]) => v !== undefined && v !== null)
            ),
          },
          contextWindow: live.contextWindow || existing.contextWindow,
          isTopTier: existing.isTopTier || isTop,
        });
      } else if (live.name && live.intelligenceIndex !== undefined) {
        mergedMap.set(liveIdNorm || liveNameNorm, {
          ...live,
          isTopTier: isTop,
        });
      }
    }

    return Array.from(mergedMap.values()).sort(
      (a, b) => (b.intelligenceIndex ?? 0) - (a.intelligenceIndex ?? 0)
    );
  }

  private mapApiItemToBenchmark(item: any): ArtificialAnalysisModelBenchmark | null {
    if (!item || typeof item !== 'object') return null;
    const modelId = item.slug || item.id || item.model_id || item.name;
    const name = item.name || item.model_name || item.title || item.id;
    if (!modelId && !name) return null;

    const evals = item.evaluations || item.metrics || item.scores || {};
    const pricing = item.pricing || {};

    const rawIntel =
      evals.artificial_analysis_intelligence_index ??
      evals.intelligence_index ??
      item.artificial_analysis_intelligence_index ??
      item.intelligence_index ??
      item.intelligenceIndex ??
      item.score;

    const rawCoding =
      evals.artificial_analysis_coding_index ??
      evals.coding_index ??
      evals.coding ??
      evals.livecodebench ??
      evals.humaneval ??
      item.coding_index ??
      item.coding;

    const rawMath =
      evals.artificial_analysis_math_index ??
      evals.math_index ??
      evals.math ??
      evals.aime ??
      evals.math_500 ??
      item.math_index ??
      item.math;

    const rawGpqa = evals.gpqa ?? evals.gpqa_diamond ?? item.gpqa;
    const throughputTokSec =
      item.median_output_tokens_per_second ??
      item.output_tokens_per_second ??
      evals.throughputTokSec ??
      item.speed ??
      item.tokens_per_second;

    const priceInputPer1M =
      pricing.price_1m_input_tokens ??
      item.price_1m_input_tokens ??
      evals.priceInputPer1M;
    const priceOutputPer1M =
      pricing.price_1m_output_tokens ??
      item.price_1m_output_tokens ??
      evals.priceOutputPer1M;

    const provider =
      item.model_creator?.name ||
      item.creator?.name ||
      item.provider ||
      item.creator ||
      item.organization ||
      'Unknown';

    let contextWindow: string | undefined;
    if (typeof item.context_window === 'number' && item.context_window > 0) {
      contextWindow =
        item.context_window >= 1_000_000
          ? `${Math.round(item.context_window / 1_000_000)}M`
          : `${Math.round(item.context_window / 1000)}k`;
    } else if (typeof item.context_window === 'string') {
      contextWindow = item.context_window;
    }

    return {
      modelId: String(modelId),
      name: String(name),
      provider: String(provider),
      intelligenceIndex: typeof rawIntel === 'number' ? rawIntel : undefined,
      evaluations: {
        gpqa: typeof rawGpqa === 'number' ? rawGpqa : undefined,
        math: typeof rawMath === 'number' ? rawMath : undefined,
        coding: typeof rawCoding === 'number' ? rawCoding : undefined,
        throughputTokSec: typeof throughputTokSec === 'number' ? throughputTokSec : undefined,
        priceInputPer1M: typeof priceInputPer1M === 'number' ? priceInputPer1M : undefined,
        priceOutputPer1M: typeof priceOutputPer1M === 'number' ? priceOutputPer1M : undefined,
      },
      contextWindow,
      notes: item.description || item.notes,
    };
  }

  /**
   * Attempt keyless public Artificial Analysis feeds (GitHub daily AA mirror + public endpoint)
   */
  private async fetchKeylessPublicFeeds(): Promise<ArtificialAnalysisModelBenchmark[]> {
    const collected = new Map<string, ArtificialAnalysisModelBenchmark>();

    const upsert = (b: ArtificialAnalysisModelBenchmark) => {
      const k = norm(b.modelId || b.name);
      if (!k) return;
      const existing = collected.get(k);
      if (!existing) {
        collected.set(k, b);
      } else {
        collected.set(k, {
          ...existing,
          intelligenceIndex: b.intelligenceIndex ?? existing.intelligenceIndex,
          evaluations: {
            ...existing.evaluations,
            ...Object.fromEntries(
              Object.entries(b.evaluations || {}).filter(([, v]) => v !== undefined)
            ),
          },
        });
      }
    };

    const extractItems = (json: any): any[] => {
      if (Array.isArray(json)) return json;
      if (json && typeof json === 'object') {
        for (const key of ['data', 'models', 'leaderboard', 'items', 'entries', 'rankings']) {
          if (Array.isArray(json[key])) return json[key];
        }
      }
      return [];
    };

    const publicFeedUrls: Array<{ url: string; metric: 'intelligence' | 'coding' | 'math' }> = [
      {
        url: 'https://raw.githubusercontent.com/EvanZhouDev/ai-model-index/main/data/llm/aa-intelligence.json',
        metric: 'intelligence',
      },
      {
        url: 'https://raw.githubusercontent.com/EvanZhouDev/ai-model-index/main/data/llm/aa-coding.json',
        metric: 'coding',
      },
      {
        url: 'https://raw.githubusercontent.com/EvanZhouDev/ai-model-index/main/data/llm/aa-math.json',
        metric: 'math',
      },
    ];

    await Promise.allSettled(
      publicFeedUrls.map(async ({ url, metric }) => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 6000);
        try {
          const res = await fetch(url, {
            headers: { Accept: 'application/json' },
            signal: ctrl.signal,
          });
          if (!res.ok) return;
          const json = await res.json();
          const items = extractItems(json);
          for (const raw of items) {
            const mapped = this.mapApiItemToBenchmark(raw);
            if (!mapped) continue;
            const numericScore =
              typeof raw.score === 'number'
                ? raw.score
                : typeof raw.value === 'number'
                ? raw.value
                : undefined;

            if (metric === 'intelligence' && numericScore !== undefined && mapped.intelligenceIndex === undefined) {
              mapped.intelligenceIndex = numericScore;
            } else if (metric === 'coding' && numericScore !== undefined) {
              mapped.evaluations = { ...mapped.evaluations, coding: numericScore };
            } else if (metric === 'math' && numericScore !== undefined) {
              mapped.evaluations = { ...mapped.evaluations, math: numericScore };
            }
            upsert(mapped);
          }
        } finally {
          clearTimeout(timer);
        }
      })
    );

    return Array.from(collected.values());
  }

  /**
   * Fetch all models from:
   * 1) Artificial Analysis Official REST API v2 (/api/v2/data/llms/models) when API key is available
   * 2) Keyless Public Artificial Analysis JSON Feeds (GitHub daily mirror)
   * 3) Curated Offline Snapshot (October 2026 Frontier Models)
   */
  public async fetchModels(apiKey?: string): Promise<{
    success: boolean;
    models: ArtificialAnalysisModelBenchmark[];
    source: 'live-api' | 'public-feed' | 'curated-snapshot';
    error?: string;
  }> {
    const storedKey = this.settingsService?.getArtificialAnalysisConfig().apiKey;
    const effectiveKey = (apiKey && apiKey.trim()) || (storedKey && storedKey.trim()) || '';

    // 1. Official Artificial Analysis v2 API (if API key provided)
    if (effectiveKey) {
      const endpoints = [
        'https://artificialanalysis.ai/api/v2/data/llms/models',
        'https://artificialanalysis.ai/api/v2/language/models',
      ];

      for (const endpoint of endpoints) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        try {
          const response = await fetch(endpoint, {
            headers: {
              'x-api-key': effectiveKey,
              Accept: 'application/json',
            },
            signal: ctrl.signal,
          });

          if (response.ok) {
            const json = (await response.json()) as any;
            const items = Array.isArray(json) ? json : json.data || json.models || [];
            const liveModels: ArtificialAnalysisModelBenchmark[] = items
              .map((item: any) => this.mapApiItemToBenchmark(item))
              .filter((m: ArtificialAnalysisModelBenchmark | null): m is ArtificialAnalysisModelBenchmark => m !== null);

            if (liveModels.length > 0) {
              Logger.info(
                'AA',
                `Fetched ${liveModels.length} live models from Artificial Analysis API (${endpoint})`
              );
              return {
                success: true,
                models: this.mergeWithCuratedTemplates(liveModels),
                source: 'live-api',
              };
            }
          }
        } catch (err: any) {
          Logger.warn('AA', `Artificial Analysis API endpoint ${endpoint} failed: ${err.message}`);
        } finally {
          clearTimeout(timer);
        }
      }
    }

    // 2. Keyless public Artificial Analysis JSON mirror
    try {
      const publicModels = await this.fetchKeylessPublicFeeds();
      if (publicModels.length > 0) {
        Logger.info(
          'AA',
          `Fetched ${publicModels.length} models from public Artificial Analysis leaderboard feed`
        );
        return {
          success: true,
          models: this.mergeWithCuratedTemplates(publicModels),
          source: 'public-feed',
        };
      }
    } catch (err: any) {
      Logger.debug('AA', `Public AA mirror fetch skipped: ${err.message}`);
    }

    // 3. Curated offline snapshot (October 2026 Frontier Models)
    return {
      success: true,
      models: this.buildCuratedBenchmarks(),
      source: 'curated-snapshot',
    };
  }

  /**
   * Find benchmark stats matching a model by identifier or name
   */
  public async findBenchmarkForModel(
    modelName: string,
    provider?: string,
    apiKey?: string
  ): Promise<{ success: boolean; benchmark?: ArtificialAnalysisModelBenchmark; error?: string }> {
    const res = await this.fetchModels(apiKey);
    if (!res.success || !res.models) {
      return { success: false, error: res.error || 'Failed to retrieve benchmark dataset' };
    }

    const match = this.matchModelFromList(modelName, provider, res.models);
    return { success: true, benchmark: match };
  }

  private matchModelFromList(
    modelName: string,
    provider: string | undefined,
    benchmarks: ArtificialAnalysisModelBenchmark[]
  ): ArtificialAnalysisModelBenchmark | undefined {
    const targetNorm = norm(modelName);
    const targetProvider = norm(provider);
    if (!targetNorm) return undefined;

    // 1. Exact match by modelId or name
    let match = benchmarks.find(
      (m) => norm(m.modelId) === targetNorm || norm(m.name) === targetNorm
    );

    // 2. Substring matching with provider
    if (!match) {
      match = benchmarks.find((m) => {
        const mNorm = norm(m.name);
        const idNorm = norm(m.modelId);
        return (
          (mNorm.includes(targetNorm) ||
            targetNorm.includes(mNorm) ||
            idNorm.includes(targetNorm) ||
            targetNorm.includes(idNorm)) &&
          (!targetProvider ||
            norm(m.provider).includes(targetProvider) ||
            targetProvider.includes(norm(m.provider)))
        );
      });
    }

    // 3. Fallback to name partial without provider
    if (!match) {
      match = benchmarks.find((m) => {
        const mNorm = norm(m.name);
        const idNorm = norm(m.modelId);
        return (
          mNorm.includes(targetNorm) ||
          targetNorm.includes(mNorm) ||
          idNorm.includes(targetNorm) ||
          targetNorm.includes(idNorm)
        );
      });
    }

    return match;
  }

  /**
   * Sync all existing models with Artificial Analysis benchmark stats AND optionally
   * auto-register / update the latest released top-tier frontier models in the catalog.
   */
  public async syncAllModels(
    apiKeyOrOptions?: string | { apiKey?: string; importTopTier?: boolean }
  ): Promise<{
    success: boolean;
    updatedCount: number;
    addedCount: number;
    source: 'live-api' | 'public-feed' | 'curated-snapshot';
    message?: string;
  }> {
    const options =
      typeof apiKeyOrOptions === 'string'
        ? { apiKey: apiKeyOrOptions }
        : apiKeyOrOptions || {};

    const storedConfig = this.settingsService?.getArtificialAnalysisConfig();
    const effectiveApiKey = options.apiKey ?? storedConfig?.apiKey;
    const shouldImportTopTier =
      options.importTopTier !== undefined
        ? options.importTopTier
        : storedConfig?.autoImportTopTier ?? true;

    const res = await this.fetchModels(effectiveApiKey);
    if (!res.success || !res.models) {
      return {
        success: false,
        updatedCount: 0,
        addedCount: 0,
        source: 'curated-snapshot',
        message: res.error || 'Could not fetch benchmark data',
      };
    }

    const existingModels = this.modelRepository.getModels();
    let updatedCount = 0;
    let addedCount = 0;
    const touchedModelIds = new Set<string>();

    // 1. Update all existing models in SQLite database with latest AA benchmark scores
    for (const model of existingModels) {
      const match =
        this.matchModelFromList(model.aa_model_id || model.model_name, model.provider, res.models) ||
        this.matchModelFromList(model.display_name, model.provider, res.models);

      if (match) {
        this.modelRepository.updateModel(model.id, {
          aaIntelligenceIndex: match.intelligenceIndex,
          aaEvaluationsJson: match.evaluations ? JSON.stringify(match.evaluations) : undefined,
          aaModelId: match.modelId,
          contextWindow: model.context_window || match.contextWindow,
        });
        touchedModelIds.add(model.id);
        updatedCount++;
      }
    }

    // 2. Automatically add/update latest released top-tier models if enabled
    if (shouldImportTopTier) {
      const currentModels = this.modelRepository.getModels();
      const topTierTemplates: ModelPresetTemplate[] = MODEL_TEMPLATES.filter((t) => t.isTopTier);

      for (const tpl of topTierTemplates) {
        const liveMatch = this.matchModelFromList(
          tpl.aaModelId || tpl.modelName,
          tpl.provider,
          res.models
        );

        const existing = currentModels.find(
          (m) =>
            norm(m.model_name) === norm(tpl.modelName) ||
            norm(m.display_name) === norm(tpl.displayName) ||
            (m.aa_model_id && norm(m.aa_model_id) === norm(tpl.aaModelId || tpl.id))
        );

        const intelIndex = liveMatch?.intelligenceIndex ?? tpl.aaIntelligenceIndex;
        const evalsObj = liveMatch?.evaluations
          ? { ...tpl.aaEvaluations, ...liveMatch.evaluations }
          : tpl.aaEvaluations;

        if (!existing) {
          this.modelRepository.createModel({
            provider: tpl.provider,
            modelName: tpl.modelName,
            displayName: tpl.displayName,
            modelFamily: tpl.modelFamily,
            parameterCount: tpl.parameterCount,
            architecture: tpl.architecture,
            quantization: tpl.quantization,
            localOrCloud: tpl.localOrCloud,
            contextWindow: liveMatch?.contextWindow || tpl.contextWindow,
            isReasoningModel: tpl.isReasoningModel,
            aaIntelligenceIndex: intelIndex,
            aaEvaluationsJson: evalsObj ? JSON.stringify(evalsObj) : undefined,
            aaModelId: tpl.aaModelId || tpl.id,
            notes: tpl.notes,
          });
          addedCount++;
        } else if (!touchedModelIds.has(existing.id)) {
          this.modelRepository.updateModel(existing.id, {
            aaIntelligenceIndex: intelIndex,
            aaEvaluationsJson: evalsObj ? JSON.stringify(evalsObj) : undefined,
            aaModelId: tpl.aaModelId || tpl.id,
            contextWindow: existing.context_window || tpl.contextWindow,
          });
          touchedModelIds.add(existing.id);
          updatedCount++;
        }
      }

      // Also import any brand-new top-10 live models discovered from Artificial Analysis API/Feed not in templates
      const refreshedModels = this.modelRepository.getModels();
      const topLiveNew = res.models
        .filter((m) => m.isTopTier && m.intelligenceIndex !== undefined && m.provider !== 'Unknown')
        .slice(0, 12);

      for (const live of topLiveNew) {
        const alreadyExists = refreshedModels.some(
          (m) =>
            norm(m.model_name) === norm(live.modelId) ||
            norm(m.display_name) === norm(live.name) ||
            (m.aa_model_id && norm(m.aa_model_id) === norm(live.modelId))
        );

        if (!alreadyExists && live.provider && live.provider !== 'Unknown') {
          this.modelRepository.createModel({
            provider: live.provider,
            modelName: live.modelId,
            displayName: live.name,
            parameterCount: 'Proprietary Cloud',
            architecture: live.isReasoningModel
              ? 'Reasoning / Thinking Model'
              : 'Transformer (Decoder-only Dense)',
            quantization: 'None / Cloud Native',
            localOrCloud: 'cloud',
            contextWindow: live.contextWindow || '1M',
            isReasoningModel: live.isReasoningModel ?? true,
            aaIntelligenceIndex: live.intelligenceIndex,
            aaEvaluationsJson: live.evaluations ? JSON.stringify(live.evaluations) : undefined,
            aaModelId: live.modelId,
            notes: live.notes || 'Auto-imported top-tier frontier model from Artificial Analysis.',
          });
          addedCount++;
        }
      }
    }

    if (this.settingsService) {
      this.settingsService.saveArtificialAnalysisConfig({
        ...(options.apiKey !== undefined ? { apiKey: options.apiKey } : {}),
        lastSyncedAt: new Date().toISOString(),
        lastSyncSource: res.source,
      });
    }

    const sourceLabel =
      res.source === 'live-api'
        ? 'Artificial Analysis Live API v2'
        : res.source === 'public-feed'
        ? 'Artificial Analysis Public Leaderboard Feed'
        : 'Artificial Analysis Oct 2026 Frontier Dataset';

    const parts: string[] = [];
    if (addedCount > 0) parts.push(`${addedCount} new top-tier models added`);
    if (updatedCount > 0) parts.push(`${updatedCount} models updated`);
    const summary = parts.length > 0 ? parts.join(', ') : 'All top-tier models already up to date';

    return {
      success: true,
      updatedCount,
      addedCount,
      source: res.source,
      message: `${summary} via ${sourceLabel}.`,
    };
  }
}
