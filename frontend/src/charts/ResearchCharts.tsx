import { memo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import type { Distribution, ModelMetric } from "../types";
export const COLORS = [
  "#5266eb",
  "#22b8a7",
  "#8b7bea",
  "#48b6da",
  "#e8a35a",
  "#e77892",
];
const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  color: "var(--text)",
};
export function Donut({
  data,
  total,
}: {
  data: Distribution[];
  total: number;
}) {
  return (
    <div className="donut-wrap">
      <div className="donut-chart">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={70}
              outerRadius={92}
              paddingAngle={4}
              stroke="none"
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <strong>{total.toLocaleString()}</strong>
          <small>TOTAL SAMPLES</small>
        </div>
      </div>
      <div className="chart-legend">
        {data.map((d, i) => (
          <div key={d.name}>
            <i style={{ background: COLORS[i % COLORS.length] }} />
            <span>{d.name}</span>
            <b>{d.value}</b>
            <small>{total ? ((100 * d.value) / total).toFixed(0) : 0}%</small>
          </div>
        ))}
      </div>
    </div>
  );
}
function DistributionChartView({ data }: { data: Distribution[] }) {
  const horizontal = data.length > 2;
  return (
    <ResponsiveContainer
      width="100%"
      height={horizontal ? Math.max(230, data.length * 42) : 230}
    >
      <BarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ bottom: 25, left: horizontal ? 0 : -20, right: 10 }}
      >
        <CartesianGrid
          vertical={false}
          stroke="var(--border)"
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey={horizontal ? undefined : "name"}
          type={horizontal ? "number" : "category"}
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "var(--muted)" }}
          interval={0}
          tickFormatter={(s) => String(s).replaceAll("_", " ")}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type={horizontal ? "category" : "number"}
          dataKey={horizontal ? "name" : undefined}
          width={horizontal ? 125 : 60}
          interval={0}
          tickFormatter={
            horizontal
              ? (s) => {
                  const label = String(s).replaceAll("_", " ");
                  return label.length > 19 ? `${label.slice(0, 18)}…` : label;
                }
              : undefined
          }
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar
          dataKey="value"
          name="Samples"
          radius={horizontal ? [0, 5, 5, 0] : [5, 5, 0, 0]}
          maxBarSize={65}
        >
          {data.map((d, i) => (
            <Cell key={d.name} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
export function ModelChart({
  data,
  metric = "accuracy",
  grouped = false,
}: {
  data: ModelMetric[];
  metric?: string;
  grouped?: boolean;
}) {
  const keys = grouped ? ["accuracy", "precision", "recall", "f1"] : [metric];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: -18, right: 10, bottom: 10 }}>
        <CartesianGrid
          vertical={false}
          stroke="var(--border)"
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="name"
          tickFormatter={(s) =>
            s === "Logistic Regression"
              ? "Log. Reg."
              : s === "Support Vector Machine"
                ? "SVM"
                : s === "Random Forest"
                  ? "RF"
                  : s.replace("Final ", "")
          }
          tick={{ fontSize: 10, fill: "var(--muted)" }}
          interval={0}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={metric === "inference_time_ms" ? ["auto", "auto"] : [0, 1]}
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => (typeof v === "number" ? v.toFixed(3) : v)}
        />
        {grouped && (
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        )}
        {keys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            fill={COLORS[i]}
            radius={[4, 4, 0, 0]}
            maxBarSize={42}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// Stable data props keep dataset pagination from restarting chart rendering.
export const DistributionChart = memo(DistributionChartView);
