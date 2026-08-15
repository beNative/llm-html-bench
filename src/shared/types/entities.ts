export interface Prompt {
  id: string;
  name: string;
  description: string | null;
  category: string;
  archived: number; // 0 or 1
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  collections?: Collection[];
  latest_version?: PromptVersion;
  version_count?: number;
  run_count?: number;
  last_tested_at?: string | null;
}

export interface PromptVersion {
  id: string;
  prompt_id: string;
  version: number;
  prompt_text: string;
  notes: string | null;
  created_at: string;
  run_count?: number;
}

export interface Model {
  id: string;
  provider: string;
  model_name: string;
  display_name: string;
  model_version: string | null;
  model_family: string | null;
  parameter_count: string | null;
  architecture: string | null;
  quantization: string | null;
  local_or_cloud: 'local' | 'cloud' | null;
  notes: string | null;
  created_at: string;
  run_count?: number;
  prompt_count?: number;
  avg_overall_score?: number | null;
  avg_visual_score?: number | null;
  avg_adherence_score?: number | null;
  avg_functionality_score?: number | null;
  avg_code_quality_score?: number | null;
  avg_creativity_score?: number | null;
}

export interface ModelRun {
  id: string;
  prompt_version_id: string;
  model_id: string;
  run_number: number;
  temperature: number | null;
  top_p: number | null;
  top_k: number | null;
  max_tokens: number | null;
  seed: number | null;
  reasoning_effort: string | null;
  context_length: number | null;
  generation_time_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  tokens_per_second: number | null;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  metadata_json: string | null;
  app_version: string;
  provenance: 'manual-paste' | 'api' | 'import';
  requested_model_id: string | null;
  resolved_model_id: string | null;
  // Joined convenience fields
  prompt_name?: string;
  prompt_id?: string;
  prompt_version?: number;
  prompt_text?: string;
  model_name?: string;
  model_display_name?: string;
  provider?: string;
  output?: Output;
  evaluation?: Evaluation;
  screenshots?: Screenshot[];
}

export type OutputType = 'html' | 'markdown' | 'text' | 'other';

export interface Output {
  id: string;
  model_run_id: string;
  output_type: OutputType;
  raw_output: string;
  html: string;
  is_modified: number; // 0 or 1
  original_output_id: string | null;
  created_at: string;
}

export interface Evaluation {
  id: string;
  model_run_id: string;
  visual_score: number | null; // 1-10
  prompt_adherence_score: number | null; // 1-10
  functionality_score: number | null; // 1-10
  code_quality_score: number | null; // 1-10
  creativity_score: number | null; // 1-10
  overall_score: number | null; // 1-10 (calculated or manual)
  is_manual_overall: number; // 0 or 1
  favorite: number; // 0 or 1
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type HeadToHeadWinner = 'left' | 'right' | 'tie';
export type HeadToHeadReason =
  | 'Visual Design'
  | 'Functionality'
  | 'Prompt Adherence'
  | 'Performance'
  | 'Code Quality'
  | 'Overall Preference';

export interface HeadToHeadComparison {
  id: string;
  prompt_version_id: string;
  left_run_id: string;
  right_run_id: string;
  winner: HeadToHeadWinner;
  dimension_reason: HeadToHeadReason;
  notes: string | null;
  created_at: string;
  // Joined fields
  left_model_name?: string;
  right_model_name?: string;
  prompt_name?: string;
}

export interface Tag {
  id: string;
  name: string;
  created_at: string;
  prompt_count?: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  prompt_count?: number;
}

export interface Screenshot {
  id: string;
  model_run_id: string;
  file_path: string;
  viewport_width: number;
  viewport_height: number;
  created_at: string;
}

export interface BenchmarkStats {
  total_prompts: number;
  total_models: number;
  total_runs: number;
  total_outputs: number;
  total_evaluations: number;
  total_comparisons: number;
  model_rankings: ModelRanking[];
  category_stats: CategoryStat[];
  recent_runs: ModelRun[];
}

export interface ModelRanking {
  model_id: string;
  display_name: string;
  provider: string;
  run_count: number;
  prompt_count: number;
  avg_overall: number;
  avg_visual: number;
  avg_adherence: number;
  avg_functionality: number;
  avg_code_quality: number;
  avg_creativity: number;
  head_to_head_wins: number;
  head_to_head_losses: number;
  head_to_head_ties: number;
  win_rate: number;
}

export interface CategoryStat {
  category: string;
  prompt_count: number;
  run_count: number;
  avg_score: number;
}
