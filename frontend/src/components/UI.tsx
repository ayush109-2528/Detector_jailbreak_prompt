import type { ReactNode } from "react";
import { AlertCircle, ArrowUpRight, Info } from "lucide-react";
export function Card({
  title,
  subtitle,
  children,
  action,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="card-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Badge({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function DemoNote({
  children = "Demo Data · Illustrative values only. Not validated research findings.",
}: {
  children?: ReactNode;
}) {
  return (
    <div className="demo-note">
      <Info size={16} />
      <span>{children}</span>
    </div>
  );
}
export function ErrorBox({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div role="alert" className="error">
      <AlertCircle size={20} />
      <span>{message}</span>
      {retry && <button onClick={retry}>Retry</button>}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" /> Loading research data…
    </div>
  );
}
export function Stat({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: ReactNode;
}) {
  return (
    <div className="stat card">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
const definitions: Record<string, string> = {
  Accuracy: "The fraction of all evaluated prompts assigned the correct class.",
  "ROC-AUC":
    "Area under the receiver operating characteristic curve: how well scores rank jailbreak prompts above benign prompts across decision thresholds.",
  "Inference Time":
    "Measured computation time per prompt. Hardware, batch size, and which processing stages are timed must be documented.",
  "TF-IDF":
    "Term frequency–inverse document frequency weights words by how distinctive they are across documents.",
  "N-gram":
    "A sequence of n adjacent words or characters; useful for identifying local language patterns.",
  Precision:
    "Of prompts predicted to be jailbreaks, the fraction that are actually jailbreaks.",
  Recall: "Of all actual jailbreaks, the fraction the model detects.",
  F1: "The harmonic mean of precision and recall.",
  "False Positive Rate":
    "The fraction of benign prompts incorrectly flagged as jailbreaks.",
  Ensemble:
    "A method that combines predictions from multiple models into a final decision.",
};
export function Term({ name }: { name: string }) {
  return (
    <span className="term" tabIndex={0}>
      {name}
      <Info size={12} />
      <span role="tooltip">{definitions[name] || name}</span>
    </span>
  );
}
export function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-intro">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function ArrowLabel({ children }: { children: ReactNode }) {
  return (
    <span className="arrow-label">
      {children}
      <ArrowUpRight size={15} />
    </span>
  );
}
