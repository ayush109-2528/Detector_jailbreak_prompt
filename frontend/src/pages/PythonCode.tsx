import { useState, useRef, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { Card, PageIntro, DemoNote } from "../components/UI";
const examples = [
  [
    "A",
    "Loading a dataset",
    "Separate the prompt text from its binary class label.",
    `import pandas as pd\n\ndata = pd.read_csv("jailbreak_dataset.csv")\nX = data["prompt"]\ny = data["label"]`,
  ],
  [
    "B",
    "Train / test split",
    "An introductory two-way split; the research pipeline also reserves validation data.",
    `from sklearn.model_selection import train_test_split\n\nX_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size=0.2, random_state=42, stratify=y\n)`,
  ],
  [
    "C",
    "TF-IDF representation",
    "Fit the vocabulary on training data only. Transform validation and test data with the same fitted object.",
    `from sklearn.feature_extraction.text import TfidfVectorizer\n\nvectorizer = TfidfVectorizer(ngram_range=(1, 2))\nX_train_tfidf = vectorizer.fit_transform(X_train)`,
  ],
  [
    "D",
    "Logistic regression",
    "A lightweight classical machine-learning baseline.",
    `from sklearn.linear_model import LogisticRegression\n\nmodel = LogisticRegression(max_iter=1000)\nmodel.fit(X_train_tfidf, y_train)`,
  ],
  [
    "E",
    "Predicting a new prompt",
    "Use the fitted vectorizer before asking the model for a label.",
    `prompt_features = vectorizer.transform(["What is cloud computing?"])\nprediction = model.predict(prompt_features)`,
  ],
  [
    "F",
    "Ensemble concept",
    "This educational example uses a simple average. The application defaults to a weighted average.",
    `expert_scores = [\n    expert1_score, expert2_score,\n    expert3_score, expert4_score\n]\nthreshold = 0.5\nensemble_score = sum(expert_scores) / len(expert_scores)\nprediction = "jailbreak" if ensemble_score >= threshold else "benign"`,
  ],
];
function Highlight({ code }: { code: string }) {
  const tokens = code.split(
    /("[^"\n]*"|\b(?:import|from|as|if|else)\b|\b\d+(?:\.\d+)?\b)/g,
  );
  return (
    <>
      {tokens.map((token, i) => (
        <span
          key={i}
          className={
            token.startsWith('"')
              ? "syntax-string"
              : /^(import|from|as|if|else)$/.test(token)
                ? "syntax-keyword"
                : /^\d/.test(token)
                  ? "syntax-number"
                  : ""
          }
        >
          {token}
        </span>
      ))}
    </>
  );
}
export function PythonCode() {
  const [copied, setCopied] = useState("");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(resetTimer.current), []);
  async function copy(id: string, code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(id);
      clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopied("unavailable");
    }
  }
  return (
    <>
      <PageIntro
        eyebrow="IMPLEMENTATION NOTES"
        title="The workflow, in Python"
        description="Short, readable examples for explaining the methodology during your viva."
      />
      <DemoNote>
        These code snippets are displayed only to explain the machine-learning
        workflow proposed for the research prototype. Backend inference code is
        maintained separately; a complete research training script has not yet
        been implemented.
      </DemoNote>
      {copied === "unavailable" && (
        <p role="status">
          Clipboard unavailable. Select and copy the snippet manually.
        </p>
      )}
      <div className="two-columns code-grid">
        {examples.map(([id, title, description, code]) => (
          <Card key={id} title={`${id}. ${title}`} subtitle={description}>
            <div className="code-toolbar">
              <span>PYTHON · EDUCATIONAL EXAMPLE</span>
              <button
                aria-label={`Copy ${title}`}
                onClick={() => copy(id, code)}
              >
                {copied === id ? <Check size={14} /> : <Copy size={14} />}{" "}
                {copied === id ? "Copied" : "Copy"}
              </button>
            </div>
            <pre>
              <code>
                <Highlight code={code} />
              </code>
            </pre>
          </Card>
        ))}
      </div>
      <p className="help-text">
        These excerpts illustrate the concepts and are not a complete training
        script. The final snippet assumes four expert scores have already been
        computed.
      </p>
    </>
  );
}
