import { BookOpen, Target, FlaskConical } from "lucide-react";
import { Card, PageIntro, Badge, Term } from "../components/UI";
import { ResearchProgression } from "../components/ResearchProgression";
import { LiteratureComparison } from "../components/LiteratureComparison";
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
            Detection of Jailbreak Prompts Targeting Large Language Models
          </h2>
          <p>HMEG — Hierarchical Multi-Expert Guardrail</p>
        </div>
        <BookOpen size={80} />
      </section>
      <ResearchProgression />
      <Card title="Proposed Research Contribution">
        <p className="body-copy">
          The proposed HMEG architecture investigates a hierarchical
          jailbreak-detection framework in which heterogeneous machine-learning
          experts specialize in different characteristics of malicious prompts.
          Lightweight lexical and obfuscation experts perform initial screening.
          Prompts with uncertain confidence are routed to deeper semantic,
          anomaly, and instruction-manipulation experts. Their outputs are
          subsequently combined by a learned meta-classifier.
        </p>
      </Card>
      <Card title="Research questions">
        <ol className="research-questions">
          <li>
            <b>RQ1:</b> How do individual single-layer jailbreak detectors
            perform across different jailbreak categories?
          </li>
          <li>
            <b>RQ2:</b> Does combining heterogeneous specialized experts improve
            detection compared with individual classifiers?
          </li>
          <li>
            <b>RQ3:</b> Can confidence-aware hierarchical routing reduce
            computational cost while maintaining detection effectiveness?
          </li>
          <li>
            <b>RQ4:</b> How well does the proposed architecture generalize to
            unseen jailbreak attacks?
          </li>
        </ol>
      </Card>
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
          The training and evaluation controls invoke separate research modules.
          MiniLM is an optional pretrained neural embedding extractor with a
          classical Logistic Regression classifier; it is not trained end-to-end
          here. Language and dataset shift can affect generalization;
          category-specific performance should be reported alongside aggregate
          metrics.
        </p>
      </Card>
      <LiteratureComparison />
    </>
  );
}
