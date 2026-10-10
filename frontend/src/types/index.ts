export interface Expert {
  name: string;
  category: string;
  score: number;
  prediction: string;
}
export type Strategy =
  | "weighted_average"
  | "average_probability"
  | "majority_voting"
  | "maximum_confidence";
export interface Prediction {
  analysis_id?: number;
  prompt: string;
  normalized_prompt: string;
  prediction: string;
  label: number;
  action: string;
  ensemble_score: number;
  threshold: number;
  strategy: Strategy;
  weights: number[];
  demo_mode: boolean;
  mode_note: string;
  experts: Expert[];
  processing_steps: string[];
  inference_time_ms: number;
}
export interface ModelMetric {
  name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number | null;
  fpr: number;
  inference_time_ms: number;
  confusion_matrix: number[][];
}
export interface Metrics {
  demo_mode: boolean;
  evaluation_note: string;
  models: ModelMetric[];
}
export interface Sample {
  id: number;
  prompt: string;
  label: number;
  class_name: string;
  source: string;
  category: string;
}
export interface Distribution {
  name: string;
  value: number;
}
export interface Stats {
  dataset_file?: string;
  total: number;
  benign: number;
  jailbreak: number;
  demo_mode: boolean;
  splits: Record<string, number>;
  split_status: string;
  sources: Distribution[];
  categories: Distribution[];
  class_distribution: Distribution[];
}
