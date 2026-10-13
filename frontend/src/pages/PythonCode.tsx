import { useState, useRef, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { Card, PageIntro, DemoNote } from "../components/UI";
import { examples } from "./pythonExamples";
import { explanations } from "./pythonExplanations";
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
        description="A detailed walkthrough of data preparation, five specialized experts, hierarchical routing, learned fusion, evaluation and reviewed-label learning."
      />
      <DemoNote>
        These code snippets are displayed only to explain the machine-learning
        workflow proposed for the research prototype. Backend inference code is
        maintained separately in backend/ml. Snippets are educational excerpts,
        not a standalone script; variables carry conceptual context between
        sections. Training currently runs in the PC worker. The website displays
        results and collects reviews. Optional experts are reported as
        unavailable when absent.
      </DemoNote>
      <Card
        title="Navigate the implementation"
        subtitle="Single guardrail → specialized experts → flat ensemble → HMEG"
      >
        <nav aria-label="Python walkthrough sections" className="two-columns">
          {examples.map(([id, title]) => (
            <a key={id} href={`#python-${id}`}>
              {id}. {title}
            </a>
          ))}
        </nav>
      </Card>
      {copied === "unavailable" && (
        <p role="status">
          Clipboard unavailable. Select and copy the snippet manually.
        </p>
      )}
      <div className="two-columns code-grid">
        {examples.map(([id, title, description, code]) => (
          <section key={id} id={`python-${id}`} style={{ scrollMarginTop: 90 }}>
            <Card title={`${id}. ${title}`} subtitle={description}>
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
              <details className="code-understanding">
                <summary>Understand this code</summary>
                <div className="code-understanding-body">
                  <h3>What happens step by step</h3>
                  <ol>
                    {explanations[id].steps.map(([statement, explanation]) => (
                      <li key={statement}>
                        <code>{statement}</code>
                        <p>{explanation}</p>
                      </li>
                    ))}
                  </ol>
                  <p><strong>Output: </strong>{explanations[id].output}</p>
                  <p><strong>Remember: </strong>{explanations[id].takeaway}</p>
                </div>
              </details>
            </Card>
          </section>
        ))}
      </div>
      <p className="help-text">
        These excerpts illustrate the concepts and are not a complete training
        script. A five-expert architecture can run a reduced fitted expert set;
        missing scores must never be presented as executed predictions.
      </p>
    </>
  );
}
