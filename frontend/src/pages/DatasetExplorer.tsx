import { useState, useMemo } from "react";
import { Updating } from "../components/Updating";
import { Search, ChevronLeft, ChevronRight, Database } from "lucide-react";
import { api } from "../api/client";
import { useResource } from "../hooks/useResource";
import { useResearch } from "../hooks/ResearchContext";
import {
  Card,
  PageIntro,
  Badge,
  DemoNote,
  Loading,
  ErrorBox,
} from "../components/UI";
import { DistributionChart } from "../charts/ResearchCharts";
export function DatasetExplorer() {
  const { stats } = useResearch();
  const [search, setSearch] = useState(""),
    [label, setLabel] = useState(""),
    [source, setSource] = useState(""),
    [category, setCategory] = useState(""),
    [page, setPage] = useState(1);
  const params = new URLSearchParams({
    search,
    source,
    category,
    page: String(page),
    page_size: "8",
  });
  if (label !== "") params.set("label", label);
  const rows = useResource(() => api.samples(params), params.toString());
  const s = stats.data;
  const displayedPage = rows.data?.page ?? page;
  const attackCategories = useMemo(
    () =>
      s?.jailbreak_categories ??
      s?.categories.filter((c) => !c.name.startsWith("benign")) ??
      [],
    [s],
  );
  function change(set: (v: string) => void, v: string) {
    set(v);
    setPage(1);
  }
  return (
    <>
      <PageIntro
        eyebrow="DATA & PROVENANCE"
        title="Dataset explorer"
        description="Inspect candidate training data: labels, sources, and attack categories. Importing a dataset does not train the models."
        action={
          <Badge tone="neutral">
            <Database size={13} /> CSV-ready dataset
          </Badge>
        }
      />
      {s?.demo_mode && (
        <DemoNote>
          Demo Data · These {s.total} prompts are synthetic examples, not
          records from the named external datasets.
        </DemoNote>
      )}
      {stats.error && <ErrorBox message={stats.error} retry={stats.reload} />}{" "}
      {!!s?.synthetic_samples && (
        <DemoNote>
          Augmented research dataset: {s.synthetic_samples.toLocaleString()}{" "}
          synthetic variants and {s.original_samples?.toLocaleString()} original
          records. Source names identify parent provenance; these are not
          300,000 independently collected attacks. Training keeps parent
          families separate.
        </DemoNote>
      )}
      {s?.dataset_file && (
        <p className="help-text" style={{ marginBottom: 16 }}>
          Loaded dataset: <strong>{s.dataset_file}</strong>
        </p>
      )}
      {!!s?.verification?.length && (
        <Card
          title="Imported dataset provenance"
          subtitle="Verification statuses are supplied by the CSV author; this application has not independently verified the sources."
        >
          <div className="source-chips">
            {s.verification.map((v) => (
              <Badge tone="neutral" key={v.name}>
                {v.value} · {v.name.replaceAll("_", " ")}
              </Badge>
            ))}
          </div>
          <p className="help-text">
            Labels and recorded train / validation / test splits are preserved.
            Harmful-behavior and proxy examples are not necessarily explicit
            jailbreak attempts; evaluate those categories separately. Importing
            data does not train the experts or replace Demo Data metrics.
          </p>
        </Card>
      )}
      {s && (
        <>
          <div className="mini-stats">
            {[
              ["Total samples", s.total],
              ["Benign", s.benign],
              ["Jailbreak", s.jailbreak],
              [
                "Benign / jailbreak",
                `${s.total ? ((s.benign / s.total) * 100).toFixed(0) : 0}% / ${s.total ? ((s.jailbreak / s.total) * 100).toFixed(0) : 0}%`,
              ],
              ...Object.entries(s.splits).map(([k, v]) => [
                `${k} (${s.split_status})`,
                v,
              ]),
            ].map(([k, v]) => (
              <div key={k}>
                <small>{k}</small>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
          <div className="three-columns">
            <Card title="Class balance">
              <DistributionChart data={s.class_distribution} />
            </Card>
            <Card title="Dataset sources">
              <DistributionChart data={s.sources} />
            </Card>
            <Card title="Jailbreak categories">
              <DistributionChart data={attackCategories} />
            </Card>
          </div>
        </>
      )}
      <Card
        title="Prompt collection"
        subtitle="Label 0 = benign · Label 1 = jailbreak"
      >
        <div className="filters">
          <label className="search-field">
            <Search size={17} />
            <input
              aria-label="Search prompts"
              value={search}
              onChange={(e) => change(setSearch, e.target.value)}
              placeholder="Search prompt text…"
            />
          </label>
          <select
            aria-label="Filter class"
            value={label}
            onChange={(e) => change(setLabel, e.target.value)}
          >
            <option value="">All classes</option>
            <option value="0">Benign</option>
            <option value="1">Jailbreak</option>
          </select>
          <select
            aria-label="Filter source"
            value={source}
            onChange={(e) => change(setSource, e.target.value)}
          >
            <option value="">All sources</option>
            {s?.sources.map((d) => (
              <option key={d.name}>{d.name}</option>
            ))}
          </select>
          <select
            aria-label="Filter category"
            value={category}
            onChange={(e) => change(setCategory, e.target.value)}
          >
            <option value="">All categories</option>
            {s?.categories.map((d) => (
              <option key={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
        <Updating active={rows.fetching && !!rows.data} />
        {rows.error && <ErrorBox message={rows.error} retry={rows.reload} />}
        {rows.loading ? (
          <Loading />
        ) : (
          <>
            <div
              className="table-scroll dataset-results"
              aria-busy={rows.fetching}
            >
              <table>
                <thead>
                  <tr>
                    {[
                      "ID",
                      "Prompt",
                      "Label",
                      "Class name",
                      "Dataset source",
                      "Jailbreak category",
                    ].map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.data?.items.map((r) => (
                    <tr key={r.id}>
                      <td className="mono">{String(r.id).padStart(3, "0")}</td>
                      <td className="prompt-cell">
                        {r.prompt}
                        {r.verification_status && (
                          <details>
                            <summary>Record provenance</summary>
                            <p className="help-text">
                              ID: {r.record_id} · Split: {r.split}
                              <br />
                              Verification: {r.verification_status}
                              <br />
                              License: {r.license || "Not supplied"}
                            </p>
                          </details>
                        )}
                      </td>
                      <td>{r.label}</td>
                      <td>
                        <Badge tone={r.label ? "red" : "green"}>
                          {r.class_name}
                        </Badge>
                      </td>
                      <td>{r.source}</td>
                      <td>{r.category.replaceAll("_", " ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.data?.items.length && (
                <div className="empty-state">
                  No prompts match these filters.
                </div>
              )}
            </div>
            <div className="pagination">
              <span>
                {rows.data?.total || 0} matching samples · Page {displayedPage}{" "}
                of {Math.max(1, Math.ceil((rows.data?.total || 0) / 8))}
              </span>
              <div>
                <button
                  aria-label="Previous page"
                  disabled={
                    displayedPage === 1 || rows.fetching || !!rows.error
                  }
                  onClick={() => setPage(displayedPage - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  aria-label="Next page"
                  disabled={
                    rows.fetching ||
                    !!rows.error ||
                    displayedPage * 8 >= (rows.data?.total || 0)
                  }
                  onClick={() => setPage(displayedPage + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
      <Card
        title="Research Dataset Sources"
        subtitle="Research sources to document and audit; the loaded CSV supplies each record's provenance."
      >
        <div className="source-chips">
          {[
            "Gandalf Ignore Instructions",
            "AdvBench Harmful Behaviors",
            "In-the-Wild Jailbreak Prompts",
            "Alpaca",
            "Puffin",
            "Awesome ChatGPT Prompts",
          ].map((x) => (
            <Badge tone="neutral" key={x}>
              {x}
            </Badge>
          ))}
        </div>
        <p className="help-text">
          These names identify research sources; the loaded file records the
          provenance of each prompt. To add a future CSV, place it in
          backend/data, set DATASET_FILE to its absolute path, and restart the
          API. Both source/category/split and
          source_dataset/attack_category/research_split column names are
          supported. Files are not automatically merged, so overlapping
          collections are not counted twice.
        </p>
      </Card>
    </>
  );
}
