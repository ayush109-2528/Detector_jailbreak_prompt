import { Link } from "react-router-dom";
export function ResearchProgression() {
  return (
    <div className="research-progression" aria-label="Research progression">
      {[
        ["A", "Single guardrail", "One detector as a baseline", "/models"],
        ["B", "Specialized experts", "Five detection mechanisms", "/ensemble"],
        [
          "C",
          "Flat multi-expert ensemble",
          "All available experts on every prompt",
          "/analyzer",
        ],
        ["D", "HMEG", "Confidence routing + learned fusion", "/ensemble"],
      ].map(([level, title, text, path]) => (
        <Link key={level} to={path}>
          <span className="badge blue">LEVEL {level}</span>
          <h3>{title}</h3>
          <p>{text}</p>
        </Link>
      ))}
    </div>
  );
}
