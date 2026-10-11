import { BookOpen, Target, FlaskConical } from "lucide-react";
import { Card, PageIntro, Badge, Term } from "../components/UI";
export function ResearchInfo() {
  return (
    <>
      <PageIntro
        eyebrow="M.TECH DISSERTATION"
        title="Research information"
        description="The motivation, methodology, and scope behind the prototype."
      />
      <section className="research-hero">
        <div>
          <Badge>AI / MACHINE LEARNING / NLP / LLM SECURITY</Badge>
          <h2>
            Detection of Jailbreak Prompts Targeting Large Language Models Using
            Machine Learning
          </h2>
          <p>
            A lightweight ensemble guardrail built with classical machine
            learning and sparse text features.
          </p>
        </div>
        <BookOpen size={80} />
      </section>
      <div className="two-columns">
        <Card title="Research objective" action={<Target size={22} />}>
          <p className="body-copy">
            Develop a lightweight machine-learning ensemble guardrail capable of
            identifying jailbreak prompts before they reach an LLM.
          </p>
        </Card>
        <Card title="Research approach" action={<FlaskConical size={22} />}>
          <p className="body-copy">
            The proposed trained system uses specialized classifiers to learn
            different jailbreak patterns. Their probability estimates would be
            combined into a single benign/jailbreak decision. The system uses
            classical ML, NLP feature extraction, and ensemble decision-making.
          </p>
        </Card>
      </div>
      <Card title="Problem statement">
        <p className="body-copy">
          Large Language Models can be manipulated using jailbreak prompts that
          bypass their built-in safety mechanisms and cause harmful or
          unintended responses. Existing guardrail approaches can be
          computationally expensive or may not detect every type of jailbreak
          equally well. This research investigates a lightweight ensemble
          framework where multiple specialized machine-learning classifiers
          detect different jailbreak patterns and combine their predictions to
          produce a final benign/jailbreak decision.
        </p>
      </Card>
      <Card title="Proposed workflow">
        <div className="workflow-text">
          User prompt <span>→</span> NLP preprocessing <span>→</span>{" "}
          <Term name="TF-IDF" /> and <Term name="N-gram" /> representation{" "}
          <span>→</span> Multiple lightweight expert classifiers <span>→</span>{" "}
          <Term name="Ensemble" /> decision <span>→</span> Benign / Jailbreak{" "}
          <span>→</span> Allow / Block
        </div>
      </Card>
      <Card
        title="Evaluation metrics"
        subtitle="Hover or focus a term to explain it."
      >
        <div className="source-chips">
          {[
            "Accuracy",
            "Precision",
            "Recall",
            "F1",
            "ROC-AUC",
            "False Positive Rate",
            "Inference Time",
          ].map((n) => (
            <Badge tone="neutral" key={n}>
              <Term name={n} />
            </Badge>
          ))}
        </div>
        <p className="help-text">
          Quality and runtime should be measured on a documented held-out test
          set. Record the dataset version, split procedure, preprocessing,
          hardware, seeds, confidence intervals, and model configurations when
          reporting dissertation results.
        </p>
      </Card>
      <Card title="Scope & academic integrity">
        <p className="body-copy">
          This application is a research prototype. Demo scores and mock
          performance values are educational illustrations, not experimental
          findings. The allow/block result is displayed locally; it does not
          enforce a production guardrail or call an LLM. Actual effectiveness
          must be established through reproducible evaluation, including unseen
          attack families, benign false positives, and source leakage checks.
        </p>
        <p className="body-copy">
          Training and evaluation remain separate from the presentation
          interface. No deep-learning model is part of the proposed detector.
          Language and dataset shift can affect generalization;
          category-specific performance should be reported alongside aggregate
          metrics.
        </p>
      </Card>
    </>
  );
}
