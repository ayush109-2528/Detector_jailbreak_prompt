import { useState, useEffect } from "react";
import { NavLink, Outlet, useLocation, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Database,
  Workflow,
  ChartNoAxesCombined,
  ScanText,
  Network,
  Code2,
  BookOpen,
  ShieldCheck,
  Sun,
  Moon,
  Menu,
  ArrowUpRight,
  FlaskConical,
} from "lucide-react";
import { useResearch } from "../hooks/ResearchContext";
import { Badge } from "./UI";
const nav = [
  ["/", "Dashboard", LayoutDashboard],
  ["/dataset", "Dataset Explorer", Database],
  ["/pipeline", "Training Pipeline", Workflow],
  ["/models", "Model Comparison", ChartNoAxesCombined],
  ["/analyzer", "Live Prompt Analyzer", ScanText],
  ["/ensemble", "Ensemble Visualization", Network],
  ["/code", "Python Code", Code2],
  ["/research", "Research Information", BookOpen],
] as const;
export function Layout() {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(
    () => localStorage.getItem("research-theme") === "dark",
  );
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [location.pathname]);
  const { health, reconnect } = useResearch();
  function toggle() {
    setDark((v) => {
      localStorage.setItem("research-theme", v ? "light" : "dark");
      return !v;
    });
  }
  return (
    <div className={`app ${dark ? "dark" : ""}`}>
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <Link className="brand" to="/">
          <div className="brand-icon">
            <ShieldCheck size={27} />
          </div>
          <div>
            sentinel<span>RESEARCH LAB</span>
          </div>
        </Link>
        <div className="workspace-tag">
          <FlaskConical size={16} />
          <div>
            M.Tech Dissertation<small>Machine Learning · NLP Security</small>
          </div>
        </div>
        <div className="nav-caption">RESEARCH WORKSPACE</div>
        <nav>
          {nav.map(([path, name, Icon]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                isActive ? "nav-item selected" : "nav-item"
              }
            >
              <Icon size={18} />
              <span>{name}</span>
              {path === "/analyzer" && <i className="live-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="research-note">
            <span className="tiny-label">BUILT FOR RESEARCH</span>
            <h3>
              Small models.
              <br />
              Stronger guardrails.
            </h3>
            <p>Exploring lightweight experts for safer language models.</p>
            <Link to="/research">
              About the research <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="sidebar-footer">
            <span className="avatar">MT</span>
            <div>
              Research Prototype<small>Academic demonstration · v1.0</small>
            </div>
          </div>
        </div>
      </aside>
      {open && (
        <button
          aria-label="Close navigation"
          className="nav-overlay"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button menu-button"
              aria-label="Open navigation"
              onClick={() => setOpen(!open)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <span>/</span>
            <b>{nav.find((n) => n[0] === location.pathname)?.[1] || "Page"}</b>
          </div>
          <div className="header-actions">
            {health.error && <button className="button secondary" onClick={reconnect}>Reconnect</button>}
            <span className="system-state">
              <i className={health.error ? "offline" : "live-dot"} />
              {health.error
                ? "API offline"
                : health.loading
                  ? "Connecting…"
                  : "API connected"}
            </span>
            <Badge tone={health.data?.demo_mode ? "amber" : "blue"}>
              {health.error
                ? "Unavailable"
                : health.data
                  ? health.data.demo_mode
                    ? "Demo Mode"
                    : "Trained Models"
                  : "Checking mode"}
            </Badge>
            <button
              className="icon-button theme-toggle"
              onClick={toggle}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>
        <main>
          <Outlet />
        </main>
        <footer className="main-footer">
          <span>
            Detection of Jailbreak Prompts · M.Tech Research Prototype
          </span>
          <span>
            Classical ML <i /> Explainable workflow <i /> Ensemble learning
          </span>
        </footer>
      </div>
    </div>
  );
}
