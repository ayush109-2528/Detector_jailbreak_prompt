import { useState } from "react";
import { Card, PageIntro, Badge, DemoNote } from "../components/UI";
import { EnsembleFlow } from "../components/EnsembleFlow";
const stages = [
  [
    "Dataset collection",
    "Collect licensed, attributable prompts with both classes represented.",
    "Research sources",
    "Raw labeled CSV",
  ],
  [
    "Data cleaning",
    "Normalize Unicode and whitespace while preserving useful attack signals.",
    "Raw prompts",
    "Normalized prompts",
  ],
  [
    "Label verification",
    "Review class definitions and inspect ambiguous or mislabeled examples.",
    "Candidate labels",
    "Verified labels",
  ],
  [
    "Duplicate removal",
    "Deduplicate before splitting; group paraphrases and source families to reduce leakage.",
    "Verified rows",
    "Unique grouped records",
  ],
  [
    "Train / validation / test split",
    "Use training data for fitting, validation for tuning, and an untouched test set for reporting.",
    "Unique records",
    "70 / 15 / 15 planned split",
  ],
  [
    "TF-IDF feature extraction",
    "Learn a sparse vocabulary and inverse document frequencies on training data only.",
    "Training prompts",
    "Fitted feature transformer",
  ],
  [
    "Word N-grams",
    "Capture adjacent word sequences with word unigrams and bigrams.",
    "Normalized text",
    "Word feature vectors",
  ],
  [
    "Character N-grams",
    "Capture local spelling patterns with character sequences of length 3 to 5.",
    "Normalized text",
    "Character feature vectors",
  ],
  [
    "Expert model training",
    "Fit lightweight classifiers on documented category-focused datasets containing benign negatives.",
    "Sparse features + labels",
    "Four trained experts",
  ],
  [
    "Hyperparameter tuning",
    "Select model settings and calibrate probabilities using validation data or training-only cross-validation.",
    "Candidate estimators",
    "Selected calibrated experts",
  ],
  [
    "Ensemble construction",
    "Combine expert outputs with an explicit strategy, weights, and decision threshold.",
    "Four expert scores",
    "Ensemble decision",
  ],
  [
    "Evaluation",
    "Evaluate once on held-out data and record quality, false positives, and measured latency.",
    "Untouched test set",
    "Metrics and confusion matrices",
  ],
];
export function TrainingPipeline() {
  const [selected, setSelected] = useState(0);
  return (
    <>
      <PageIntro
        eyebrow="METHODOLOGY"
        title="The training pipeline"
        description="From curated prompts to a lightweight, interpretable ensemble guardrail."
        action={<Badge>12 RESEARCH STAGES</Badge>}
      />
      <DemoNote>
        Workflow specification · Selecting a stage explains its role. This page
        does not launch or claim completed model training.
      </DemoNote>
      <div className="pipeline-page">
        <div className="stage-grid">
          {stages.map(([title, description, input, output], i) => (
            <button
              key={title}
              className={`stage-card ${i === selected ? "selected" : ""}`}
              onClick={() => setSelected(i)}
            >
              <div className="stage-head">
                <span>{String(i + 1).padStart(2, "0")}</span>
                <Badge tone="neutral">Planned</Badge>
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
              <div className="stage-io">
                <small>INPUT</small>
                <span>{input}</span>
                <small>OUTPUT</small>
                <span>{output}</span>
              </div>
            </button>
          ))}
        </div>
        <div>
          <Card
            title={`Stage ${selected + 1} · ${stages[selected][0]}`}
            subtitle={stages[selected][1]}
          >
            <div className="selected-stage">
              <b>Input</b>
              <p>{stages[selected][2]}</p>
              <b>Output</b>
              <p>{stages[selected][3]}</p>
            </div>
          </Card>
          <Card
            title="Conceptual flow"
            subtitle="Click a stage to highlight its place in the workflow."
          >
            <EnsembleFlow
              stage={
                selected < 1
                  ? 0
                  : selected < 5
                    ? 2
                    : selected < 8
                      ? 4
                      : selected < 10
                        ? 5
                        : selected === 10
                          ? 6
                          : 7
              }
            />
          </Card>
        </div>
      </div>
    </>
  );
}
