export interface Expert {
  name: string;
  category: string;
  score: number;
  prediction: string;
}
export interface ExpertCatalog {
  demo_mode: boolean;
  mode_note: string;
  experts: {
    name: string;
    category: string;
    weight: number;
    purpose: string;
    demo_patterns: string[];
    artifact: string;
    estimator: string;
  }[];
}
export type Strategy =
  | "weighted_average"
  | "average_probability"
  | "majority_voting"
  | "maximum_confidence";
export interface Prediction {
  framework?: string;
  decision_layer?: number;
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
  record_id?: string;
  split?: string;
  verification_status?: string;
  license?: string;
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
  synthetic_samples?: number | null;
  original_samples?: number | null;
  verification?: Distribution[];
  jailbreak_categories?: Distribution[];
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
