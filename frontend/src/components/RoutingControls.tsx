import type { RoutingConfig } from "../types/hmeg";
export function RoutingControls({
  value,
  onChange,
  disabled = false,
}: {
  value: RoutingConfig;
  onChange: (v: RoutingConfig) => void;
  disabled?: boolean;
}) {
  return (
    <div className="settings-grid">
      {(
        [
          ["low_threshold", "Low threshold"],
          ["high_threshold", "High threshold"],
          ["lexical_weight", "Layer 1 lexical weight"],
          ["threshold", "Final fusion threshold"],
        ] as const
      ).map(([key, label]) => (
        <label key={key}>
          {label} <b>{value[key].toFixed(2)}</b>
          <input
            aria-label={label}
            disabled={disabled}
            type="range"
            min="0"
            max="1"
            step=".01"
            value={value[key]}
            onChange={(e) =>
              onChange({ ...value, [key]: Number(e.target.value) })
            }
          />
        </label>
      ))}
      {value.low_threshold >= value.high_threshold && (
        <p role="alert">Low threshold must be below high threshold.</p>
      )}
    </div>
  );
}
