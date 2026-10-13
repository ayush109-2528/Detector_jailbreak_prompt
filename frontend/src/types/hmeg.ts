export interface RoutingConfig {
  low_threshold: number;
  high_threshold: number;
  lexical_weight: number;
  threshold: number;
}
export interface HmegExpert {
  key: string;
  name: string;
  category: string;
  score: number | null;
  status: "executed" | "simulated" | "skipped" | "unavailable" | "ablated";
  inference_time_ms: number;
  prediction: string | null;
}
export interface HmegResult {
  analysis_id?: number;
  prompt: string;
  prediction: string;
  label: number;
  action: string;
  framework: string;
  strategy: string;
  final_probability: number;
  fast_score: number | null;
  meta_classifier_score: number | null;
  decision_layer: number;
  routed_to_layer_2: boolean;
  routing_decision: string;
  routing_thresholds: RoutingConfig;
  experts: HmegExpert[];
  experts_executed: number;
  total_inference_time_ms: number;
  demo_mode: boolean;
  reduced_expert_set: boolean;
  mode_note: string;
}
export interface HmegCatalog {
  standalone_experts?: string[];
  trained: boolean;
  training_available: boolean;
  preferred_meta: string | null;
  unavailable: Record<string, string>;
  artifact_error?: string;
  experts: {
    key: string;
    name: string;
    layer: number;
    features: string;
    status: string;
    estimator: string | null;
  }[];
}
export interface Experiment {
  experiment_id: string;
  run_id: string;
  model_name: string;
  model_type: string;
  study: string;
  metrics: Record<string, number | null>;
  confusion_matrix: number[][];
  roc_data: { fpr: number; tpr: number; threshold: number | null }[];
  routing_thresholds: RoutingConfig;
  dataset_sources: string[];
  test_sources: string[];
  timestamp: string;
  partition: string;
  samples: number;
  model_size_bytes: number;
  reduced_expert_set: boolean;
  evaluation_note: string;
  [key: string]: unknown;
}
