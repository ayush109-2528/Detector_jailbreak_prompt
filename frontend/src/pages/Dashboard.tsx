import { Link } from "react-router-dom";
import {
  ArrowRight,
  Database,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Target,
  Activity,
  Gauge,
  Timer,
  FlaskConical,
  ArrowUpRight,
} from "lucide-react";
import { useResearch } from "../hooks/ResearchContext";
import {
  Card,
  Stat,
  PageIntro,
  Badge,
  DemoNote,
  Loading,
  ErrorBox,
} from "../components/UI";
import { Donut, ModelChart } from "../charts/ResearchCharts";
export function Dashboard() {
  const { stats, metrics, recent, health } = useResearch();
  if (stats.error || metrics.error)
    return (
      <ErrorBox
        message={stats.error || metrics.error}
        retry={() => {
          stats.reload();
          metrics.reload();
        }}
      />
    );
  if (!stats.data || !metrics.data) return <Loading />;
  const s = stats.data,
    m = metrics.data,
    ensemble = m.models.find((m) => m.name === "Final Ensemble"),
    best = Math.max(...m.models.map((m) => m.accuracy));
  return (
    <>
      <PageIntro
        eyebrow="RESEARCH OVERVIEW"
        title="A clearer view of prompt security."
        description="Explore the data. Understand the experts. Inspect every decision."
        action={
          <Link className="button primary" to="/analyzer">
            <ScanIcon /> Analyze a prompt <ArrowUpRight size={17} />
          </Link>
        }
      />
      <div className="overview-banner">
        <div className="banner-symbol">
          <FlaskConical size={24} />
        </div>
        <div>
          <b>Lightweight models. A collective decision.</b>
          <p>
            A multi-expert ensemble for detecting jailbreak prompts before they
            reach an LLM.
          </p>
        </div>
        <Link to="/pipeline">
          Explore the pipeline <ArrowRight size={16} />
        </Link>
      </div>
      <div className="section-kicker">
        <span>AT A GLANCE</span>
        <Badge tone="neutral">
          {s.demo_mode ? "Demo dataset" : "Loaded dataset"} ·{" "}
          {m.demo_mode ? "Demo metrics" : "Loaded metrics"}
        </Badge>
      </div>
      <div className="stats-grid">
        <Stat
          label="Total dataset samples"
          value={s.total.toLocaleString()}
          note={
            s.demo_mode ? "Synthetic demonstration data" : "Loaded CSV records"
          }
          icon={<Database size={18} />}
        />
        <Stat
          label="Benign samples"
          value={s.benign}
          note={`${s.total ? ((s.benign / s.total) * 100).toFixed(0) : 0}% of dataset · Label 0`}
          icon={<ShieldCheck size={18} />}
        />
        <Stat
          label="Jailbreak samples"
          value={s.jailbreak}
          note={`${s.total ? ((s.jailbreak / s.total) * 100).toFixed(0) : 0}% of dataset · Label 1`}
          icon={<ShieldAlert size={18} />}
        />
        <Stat
          label="Expert models"
          value="04"
          note={
            health.data?.demo_mode
              ? "Four simulated expert roles"
              : "Four loaded expert classifiers"
          }
          icon={<Layers size={18} />}
        />
        <Stat
          label="Best model accuracy"
          value={`${(best * 100).toFixed(1)}%`}
          note={m.demo_mode ? "Demo Data · illustrative" : "Loaded evaluation"}
          icon={<Target size={18} />}
        />
        <Stat
          label="Ensemble accuracy"
          value={ensemble ? `${(ensemble.accuracy * 100).toFixed(1)}%` : "—"}
          note={m.demo_mode ? "Demo Data · illustrative" : "Loaded evaluation"}
          icon={<Activity size={18} />}
        />
        <Stat
          label="False positive rate"
          value={ensemble ? `${(ensemble.fpr * 100).toFixed(1)}%` : "—"}
          note={m.demo_mode ? "Demo Data · ensemble" : "Ensemble evaluation"}
          icon={<Gauge size={18} />}
        />
        <Stat
          label="Average inference time"
          value={ensemble ? `${ensemble.inference_time_ms} ms` : "—"}
          note={
            m.demo_mode ? "Demo Data · ensemble" : "Loaded evaluation timing"
          }
          icon={<Timer size={18} />}
        />
      </div>
      <div className="dashboard-charts">
        <Card
          title="Class distribution"
          subtitle="Composition of the loaded dataset"
          action={<Badge tone="neutral">{s.total} samples</Badge>}
        >
          <Donut data={s.class_distribution} total={s.total} />
        </Card>
        <Card
          title="Model performance"
          subtitle="Accuracy across baseline models and the ensemble"
          action={
            <Link className="text-link" to="/models">
              Compare models <ArrowUpRight size={14} />
            </Link>
          }
        >
          <ModelChart
            data={m.models.filter((x) => !x.name.startsWith("Expert"))}
          />
          {m.demo_mode && (
            <div className="chart-footnote">
              DEMO DATA · Illustrative evaluation results
            </div>
          )}
        </Card>
      </div>
      <Card
        title="From a prompt to a decision"
        subtitle="The research workflow, at a glance"
        action={<Badge>CLASSICAL MACHINE LEARNING</Badge>}
      >
        <div className="pipeline-strip">
          {[
            ["01", "Dataset"],
            ["02", "Preprocessing"],
            ["03", "TF-IDF / N-grams"],
            ["04", "ML experts"],
            ["05", "Ensemble"],
            ["06", "Benign / Jailbreak"],
            ["07", "Allow / Block"],
          ].map(([n, name], i) => (
            <div className="pipeline-step" key={n}>
              <span>{n}</span>
              <b>{name}</b>
              {i < 6 && <ArrowRight size={16} />}
            </div>
          ))}
        </div>
      </Card>
      <Card
        title="Recent prompt analyses"
        subtitle="Results from this presentation session"
        action={
          <Link className="text-link" to="/analyzer">
            Open analyzer <ArrowUpRight size={14} />
          </Link>
        }
      >
        {recent.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Prompt</th>
                  <th>Classification</th>
                  <th>Score</th>
                  <th>Action</th>
                  <th>Mode</th>
                </tr>
              </thead>
              <tbody>
                {recent.slice(0, 5).map((r, i) => (
                  <tr key={i}>
                    <td className="prompt-cell">{r.prompt}</td>
                    <td>
                      <Badge tone={r.label ? "red" : "green"}>
                        {r.prediction}
                      </Badge>
                    </td>
                    <td>{r.ensemble_score.toFixed(3)}</td>
                    <td>{r.action}</td>
                    <td>{r.demo_mode ? "Demo" : "Trained"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <ScanIcon />
            <b>Your next experiment starts here.</b>
            <p>
              Analyze a prompt to see the experts and their collective decision.
            </p>
            <Link to="/analyzer">
              Run your first analysis <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </Card>
      {m.demo_mode && <DemoNote />}
    </>
  );
}
function ScanIcon() {
  return <ShieldCheck size={18} />;
}
