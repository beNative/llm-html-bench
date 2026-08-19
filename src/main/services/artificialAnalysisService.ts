import { ArtificialAnalysisModelBenchmark } from '../../shared/types/ipc';
import { MODEL_TEMPLATES } from '../../shared/constants/modelPresets';
import { ModelRepository } from '../repositories/modelRepository';

export class ArtificialAnalysisService {
  private modelRepository: ModelRepository;

  constructor(modelRepository: ModelRepository) {
    this.modelRepository = modelRepository;
  }

  /**
   * Fetch all models from Artificial Analysis live API, or fallback to offline curated benchmark list
   */
  public async fetchModels(apiKey?: string): Promise<{ success: boolean; models: ArtificialAnalysisModelBenchmark[]; error?: string }> {
    if (apiKey && apiKey.trim()) {
      try {
        const response = await fetch('https://artificialanalysis.ai/api/v2/language/models', {
          headers: {
            'x-api-key': apiKey.trim(),
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          const json = (await response.json()) as any;
          const items = Array.isArray(json) ? json : json.data || json.models || [];
          const models: ArtificialAnalysisModelBenchmark[] = items.map((item: any) => ({
            modelId: item.id || item.slug || item.name,
            name: item.name || item.id,
            provider: item.model_creator?.name || item.provider || 'Unknown',
            intelligenceIndex: item.evaluations?.intelligence_index || item.intelligence_index || undefined,
            evaluations: {
              gpqa: item.evaluations?.gpqa,
              math: item.evaluations?.math || item.evaluations?.aime,
              coding: item.evaluations?.coding || item.evaluations?.humaneval,
              throughputTokSec: item.median_output_tokens_per_second || item.speed,
              priceInputPer1M: item.pricing?.price_1m_input_tokens,
              priceOutputPer1M: item.pricing?.price_1m_output_tokens,
            },
            contextWindow: item.context_window ? `${Math.round(item.context_window / 1000)}k` : undefined,
            notes: item.description,
          }));

          if (models.length > 0) {
            return { success: true, models };
          }
        }
      } catch (err: any) {
        console.warn('Artificial Analysis API fetch failed, falling back to curated offline database:', err.message);
      }
    }

    // Curated offline snapshot
    const offlineModels: ArtificialAnalysisModelBenchmark[] = MODEL_TEMPLATES.map((t) => ({
      modelId: t.aaModelId || t.id,
      name: t.displayName,
      provider: t.provider,
      intelligenceIndex: t.aaIntelligenceIndex,
      evaluations: t.aaEvaluations,
      contextWindow: t.contextWindow,
      notes: t.notes,
    }));

    return { success: true, models: offlineModels };
  }

  /**
   * Find benchmark stats matching a model by identifier or name
   */
  public async findBenchmarkForModel(modelName: string, provider?: string, apiKey?: string): Promise<{ success: boolean; benchmark?: ArtificialAnalysisModelBenchmark; error?: string }> {
    const res = await this.fetchModels(apiKey);
    if (!res.success || !res.models) {
      return { success: false, error: res.error || 'Failed to retrieve benchmark dataset' };
    }

    const norm = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const targetNorm = norm(modelName);
    const targetProvider = norm(provider);

    // 1. Exact match by modelId or name
    let match = res.models.find(
      (m) => norm(m.modelId) === targetNorm || norm(m.name) === targetNorm
    );

    // 2. Substring matching
    if (!match) {
      match = res.models.find((m) => {
        const mNorm = norm(m.name);
        const idNorm = norm(m.modelId);
        return (
          (mNorm.includes(targetNorm) || targetNorm.includes(mNorm) || idNorm.includes(targetNorm) || targetNorm.includes(idNorm)) &&
          (!targetProvider || norm(m.provider).includes(targetProvider) || targetProvider.includes(norm(m.provider)))
        );
      });
    }

    // 3. Fallback to name partial without provider
    if (!match) {
      match = res.models.find((m) => {
        const mNorm = norm(m.name);
        const idNorm = norm(m.modelId);
        return mNorm.includes(targetNorm) || targetNorm.includes(mNorm) || idNorm.includes(targetNorm) || targetNorm.includes(idNorm);
      });
    }

    return { success: true, benchmark: match };
  }

  /**
   * Sync all models in the repository with Artificial Analysis benchmark stats
   */
  public async syncAllModels(apiKey?: string): Promise<{ success: boolean; updatedCount: number; message?: string }> {
    const models = this.modelRepository.getModels();
    const res = await this.fetchModels(apiKey);
    if (!res.success || !res.models) {
      return { success: false, updatedCount: 0, message: res.error || 'Could not fetch benchmark data' };
    }

    let updatedCount = 0;
    for (const model of models) {
      const matchRes = await this.findBenchmarkForModel(model.model_name, model.provider, apiKey);
      if (matchRes.benchmark) {
        const b = matchRes.benchmark;
        this.modelRepository.updateModel(model.id, {
          aaIntelligenceIndex: b.intelligenceIndex,
          aaEvaluationsJson: b.evaluations ? JSON.stringify(b.evaluations) : undefined,
          aaModelId: b.modelId,
          contextWindow: model.context_window || b.contextWindow,
        });
        updatedCount++;
      }
    }

    return {
      success: true,
      updatedCount,
      message: `Successfully synchronized ${updatedCount} of ${models.length} models with Artificial Analysis benchmarks.`,
    };
  }
}
