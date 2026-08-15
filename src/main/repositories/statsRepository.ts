import Database from 'better-sqlite3';
import { BenchmarkStats, ModelRanking, CategoryStat, ModelRun } from '../../shared/types/entities';

export class StatsRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  public getBenchmarkStats(): BenchmarkStats {
    const promptCount = (this.db.prepare('SELECT COUNT(*) as c FROM prompts').get() as { c: number }).c;
    const modelCount = (this.db.prepare('SELECT COUNT(*) as c FROM models').get() as { c: number }).c;
    const runCount = (this.db.prepare('SELECT COUNT(*) as c FROM model_runs').get() as { c: number }).c;
    const outputCount = (this.db.prepare('SELECT COUNT(*) as c FROM outputs').get() as { c: number }).c;
    const evalCount = (this.db.prepare('SELECT COUNT(*) as c FROM evaluations WHERE overall_score IS NOT NULL').get() as { c: number }).c;
    const compCount = (this.db.prepare('SELECT COUNT(*) as c FROM head_to_head_comparisons').get() as { c: number }).c;

    // Model Rankings
    const models = this.db
      .prepare(`
        SELECT 
          m.id as model_id,
          m.display_name,
          m.provider,
          COUNT(DISTINCT mr.id) as run_count,
          COUNT(DISTINCT pv.prompt_id) as prompt_count,
          ROUND(COALESCE(AVG(e.overall_score), 0), 2) as avg_overall,
          ROUND(COALESCE(AVG(e.visual_score), 0), 2) as avg_visual,
          ROUND(COALESCE(AVG(e.prompt_adherence_score), 0), 2) as avg_adherence,
          ROUND(COALESCE(AVG(e.functionality_score), 0), 2) as avg_functionality,
          ROUND(COALESCE(AVG(e.code_quality_score), 0), 2) as avg_code_quality,
          ROUND(COALESCE(AVG(e.creativity_score), 0), 2) as avg_creativity
        FROM models m
        LEFT JOIN model_runs mr ON m.id = mr.model_id
        LEFT JOIN prompt_versions pv ON mr.prompt_version_id = pv.id
        LEFT JOIN evaluations e ON mr.id = e.model_run_id
        GROUP BY m.id
        ORDER BY avg_overall DESC, run_count DESC
      `)
      .all() as (Omit<ModelRanking, 'head_to_head_wins' | 'head_to_head_losses' | 'head_to_head_ties' | 'win_rate'>)[];

    const modelRankings: ModelRanking[] = models.map((m) => {
      // Calculate pairwise wins/losses
      const leftWins = (
        this.db
          .prepare(`
            SELECT COUNT(*) as c 
            FROM head_to_head_comparisons h 
            JOIN model_runs mr ON h.left_run_id = mr.id 
            WHERE mr.model_id = ? AND h.winner = 'left'
          `)
          .get(m.model_id) as { c: number }
      ).c;

      const rightWins = (
        this.db
          .prepare(`
            SELECT COUNT(*) as c 
            FROM head_to_head_comparisons h 
            JOIN model_runs mr ON h.right_run_id = mr.id 
            WHERE mr.model_id = ? AND h.winner = 'right'
          `)
          .get(m.model_id) as { c: number }
      ).c;

      const leftLosses = (
        this.db
          .prepare(`
            SELECT COUNT(*) as c 
            FROM head_to_head_comparisons h 
            JOIN model_runs mr ON h.left_run_id = mr.id 
            WHERE mr.model_id = ? AND h.winner = 'right'
          `)
          .get(m.model_id) as { c: number }
      ).c;

      const rightLosses = (
        this.db
          .prepare(`
            SELECT COUNT(*) as c 
            FROM head_to_head_comparisons h 
            JOIN model_runs mr ON h.right_run_id = mr.id 
            WHERE mr.model_id = ? AND h.winner = 'left'
          `)
          .get(m.model_id) as { c: number }
      ).c;

      const ties = (
        this.db
          .prepare(`
            SELECT COUNT(*) as c 
            FROM head_to_head_comparisons h 
            JOIN model_runs mr ON (h.left_run_id = mr.id OR h.right_run_id = mr.id)
            WHERE mr.model_id = ? AND h.winner = 'tie'
          `)
          .get(m.model_id) as { c: number }
      ).c;

      const totalWins = leftWins + rightWins;
      const totalLosses = leftLosses + rightLosses;
      const totalMatches = totalWins + totalLosses + ties;
      const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

      return {
        ...m,
        head_to_head_wins: totalWins,
        head_to_head_losses: totalLosses,
        head_to_head_ties: ties,
        win_rate: winRate,
      };
    });

    // Category stats
    const categoryStats = this.db
      .prepare(`
        SELECT 
          p.category,
          COUNT(DISTINCT p.id) as prompt_count,
          COUNT(DISTINCT mr.id) as run_count,
          ROUND(COALESCE(AVG(e.overall_score), 0), 2) as avg_score
        FROM prompts p
        LEFT JOIN prompt_versions pv ON p.id = pv.prompt_id
        LEFT JOIN model_runs mr ON pv.id = mr.prompt_version_id
        LEFT JOIN evaluations e ON mr.id = e.model_run_id
        GROUP BY p.category
        ORDER BY prompt_count DESC
      `)
      .all() as CategoryStat[];

    // Recent runs
    const recentRuns = this.db
      .prepare(`
        SELECT 
          mr.*,
          p.name as prompt_name,
          p.id as prompt_id,
          pv.version as prompt_version,
          m.model_name,
          m.display_name as model_display_name,
          m.provider
        FROM model_runs mr
        JOIN prompt_versions pv ON mr.prompt_version_id = pv.id
        JOIN prompts p ON pv.prompt_id = p.id
        JOIN models m ON mr.model_id = m.id
        ORDER BY mr.started_at DESC
        LIMIT 10
      `)
      .all() as ModelRun[];

    return {
      total_prompts: promptCount,
      total_models: modelCount,
      total_runs: runCount,
      total_outputs: outputCount,
      total_evaluations: evalCount,
      total_comparisons: compCount,
      model_rankings: modelRankings,
      category_stats: categoryStats,
      recent_runs: recentRuns,
    };
  }
}
