import { useEffect, useRef, useState } from "react";
import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  ScatterChart, Scatter,
  ComposedChart,
  XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ── Theme (matches Data Cleaner screenshot) ──
const theme = {
  bg: "#FAF7F2",
  panel: "#FFFFFF",
  border: "#E8E1D4",
  text: "#4A3F35",
  textMuted: "#8B7D6B",
  accent: "#A0917E",
  accentDark: "#6B5D4F",
  grid: "#EFE9DE",
  palette: ["#A0917E", "#C4A783", "#8E9B7E", "#B08D6A", "#9CA8B5", "#C99B8E", "#7E8F9B", "#B8A98E"],
};

/**
 * ChartViewer
 *
 * Props:
 *   type    - one of: bar | histogram | pie | scatter | line | box | heatmap | stackedBar | area | bubble | violin
 *   params  - object passed straight through to POST /api/charts as { chart: type, ...params }
 *             e.g. { sheet, column, email, description } for bar/histogram/pie
 *                  { sheet, xColumn, yColumn, email, description } for scatter/line/area
 *                  { sheet, xColumn, yColumn, sizeColumn, email, description } for bubble
 *                  { sheet, categoryColumn, valueColumn, email, description } for box/violin
 *                  { sheet, columns, email, description } for heatmap
 *                  { sheet, categoryColumn, groupColumn, email, description } for stackedBar
 *   apiUrl  - optional override, defaults to "/api/charts"
 */
export default function ChartViewer({ type, params, apiUrl = "/api/charts" }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const chartRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchChart() {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chart: type, ...params }),
        });

        const json = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setError(json.error || "Something went wrong generating this chart");
          return;
        }

        // functions can return a plain string when validation fails (e.g. wrong column type)
        if (typeof json.data === "string") {
          setError(json.data);
          return;
        }

        setResult(json.data);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to reach the charts API");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (type && params) fetchChart();

    return () => {
      cancelled = true;
    };
  }, [type, JSON.stringify(params), apiUrl]);

  async function handleDownload() {
    if (!chartRef.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: theme.panel,
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `${(result?.title || type || "chart").replace(/\s+/g, "_").toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: 10,
        padding: "20px 24px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: theme.text,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          {result?.title && (
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: theme.text }}>
              {result.title}
            </h3>
          )}
          {result?.description && (
            <p style={{ margin: "4px 0 0", fontSize: 13, color: theme.textMuted, maxWidth: 520 }}>
              {result.description}
            </p>
          )}
        </div>

        <button
          onClick={handleDownload}
          disabled={!result || downloading}
          style={{
            background: theme.accent,
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 500,
            cursor: result ? "pointer" : "not-allowed",
            opacity: result ? 1 : 0.5,
            whiteSpace: "nowrap",
          }}
        >
          {downloading ? "Downloading..." : "Download PNG"}
        </button>
      </div>

      <div ref={chartRef} style={{ background: theme.panel, padding: 8 }}>
        {loading && <StatusMessage text="Loading chart..." theme={theme} />}
        {error && <StatusMessage text={error} theme={theme} isError />}
        {!loading && !error && result && <ChartBody type={type} result={result} theme={theme} />}
      </div>
    </div>
  );
}

function StatusMessage({ text, theme, isError }) {
  return (
    <div
      style={{
        padding: "32px 16px",
        textAlign: "center",
        fontSize: 13,
        color: isError ? "#B0564D" : theme.textMuted,
      }}
    >
      {text}
    </div>
  );
}

function ChartBody({ type, result, theme }) {
  const axisStyle = { fontSize: 12, fill: theme.textMuted };

  switch (type) {
    case "bar": {
      const data = Object.entries(result.values || {}).map(([name, value]) => ({ name, value }));
      return (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="name" tick={axisStyle} label={{ value: result.x_axis, position: "insideBottom", offset: -5, fill: theme.textMuted, fontSize: 12 }} />
            <YAxis tick={axisStyle} label={{ value: result.y_axis, angle: -90, position: "insideLeft", fill: theme.textMuted, fontSize: 12 }} />
            <Tooltip contentStyle={{ background: theme.panel, border: `1px solid ${theme.border}`, fontSize: 12 }} />
            <Bar dataKey="value" fill={theme.accent} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case "histogram": {
      const data = (result.bins || []).map((b) => ({
        label: `${b.bin_start.toFixed(1)}–${b.bin_end.toFixed(1)}`,
        count: b.count,
      }));
      return (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ ...axisStyle, fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} />
            <YAxis tick={axisStyle} label={{ value: result.y_axis, angle: -90, position: "insideLeft", fill: theme.textMuted, fontSize: 12 }} />
            <Tooltip contentStyle={{ background: theme.panel, border: `1px solid ${theme.border}`, fontSize: 12 }} />
            <Bar dataKey="count" fill={theme.accent} radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case "pie": {
      const data = Object.entries(result.values || {}).map(([name, value]) => ({ name, value }));
      return (
        <ResponsiveContainer width="100%" height={340}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
              {data.map((_, i) => (
                <Cell key={i} fill={theme.palette[i % theme.palette.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: theme.panel, border: `1px solid ${theme.border}`, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12, color: theme.textMuted }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    case "scatter": {
      const data = result.points || [];
      return (
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart>
            <CartesianGrid stroke={theme.grid} />
            <XAxis type="number" dataKey="x" tick={axisStyle} name={result.x_axis} label={{ value: result.x_axis, position: "insideBottom", offset: -5, fill: theme.textMuted, fontSize: 12 }} />
            <YAxis type="number" dataKey="y" tick={axisStyle} name={result.y_axis} label={{ value: result.y_axis, angle: -90, position: "insideLeft", fill: theme.textMuted, fontSize: 12 }} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: theme.panel, border: `1px solid ${theme.border}`, fontSize: 12 }} />
            <Scatter data={data} fill={theme.accent} />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    case "bubble": {
      const data = result.points || [];
      return (
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart>
            <CartesianGrid stroke={theme.grid} />
            <XAxis type="number" dataKey="x" tick={axisStyle} label={{ value: result.x_axis, position: "insideBottom", offset: -5, fill: theme.textMuted, fontSize: 12 }} />
            <YAxis type="number" dataKey="y" tick={axisStyle} label={{ value: result.y_axis, angle: -90, position: "insideLeft", fill: theme.textMuted, fontSize: 12 }} />
            <ZAxis type="number" dataKey="z" range={[60, 400]} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: theme.panel, border: `1px solid ${theme.border}`, fontSize: 12 }} />
            <Scatter data={data} fill={theme.accent} fillOpacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    case "line": {
      const data = result.points || [];
      return (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="x" tick={axisStyle} label={{ value: result.x_axis, position: "insideBottom", offset: -5, fill: theme.textMuted, fontSize: 12 }} />
            <YAxis tick={axisStyle} label={{ value: result.y_axis, angle: -90, position: "insideLeft", fill: theme.textMuted, fontSize: 12 }} />
            <Tooltip contentStyle={{ background: theme.panel, border: `1px solid ${theme.border}`, fontSize: 12 }} />
            <Line type="monotone" dataKey="y" stroke={theme.accentDark} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    case "area": {
      const data = result.points || [];
      return (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="x" tick={axisStyle} label={{ value: result.x_axis, position: "insideBottom", offset: -5, fill: theme.textMuted, fontSize: 12 }} />
            <YAxis tick={axisStyle} label={{ value: result.y_axis, angle: -90, position: "insideLeft", fill: theme.textMuted, fontSize: 12 }} />
            <Tooltip contentStyle={{ background: theme.panel, border: `1px solid ${theme.border}`, fontSize: 12 }} />
            <Area type="monotone" dataKey="y" stroke={theme.accentDark} fill={theme.accent} fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    case "stackedBar": {
      const data = result.bars || [];
      const keys = Array.from(
        new Set(data.flatMap((row) => Object.keys(row).filter((k) => k !== "name")))
      );
      return (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="name" tick={axisStyle} label={{ value: result.x_axis, position: "insideBottom", offset: -5, fill: theme.textMuted, fontSize: 12 }} />
            <YAxis tick={axisStyle} label={{ value: result.y_axis, angle: -90, position: "insideLeft", fill: theme.textMuted, fontSize: 12 }} />
            <Tooltip contentStyle={{ background: theme.panel, border: `1px solid ${theme.border}`, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12, color: theme.textMuted }} />
            {keys.map((key, i) => (
              <Bar key={key} dataKey={key} stackId="stack" fill={theme.palette[i % theme.palette.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case "box":
      return <BoxPlotBody result={result} theme={theme} />;

    case "heatmap":
      return <HeatmapBody result={result} theme={theme} />;

    case "violin":
      return <ViolinBody result={result} theme={theme} />;

    default:
      return <StatusMessage text={`Unsupported chart type: ${type}`} theme={theme} isError />;
  }
}

// Recharts has no native box plot — approximate with a floating stacked bar per category:
// an invisible base segment (min → q1) plus visible segments for q1→median, median→q3, and a whisker cap.
function BoxPlotBody({ result, theme }) {
  const data = (result.boxes || []).map((b) => ({
    category: b.category,
    base: b.min,
    lowerWhisker: b.q1 - b.min,
    lowerBox: b.median - b.q1,
    upperBox: b.q3 - b.median,
    upperWhisker: b.max - b.q3,
  }));

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data}>
        <CartesianGrid stroke={theme.grid} vertical={false} />
        <XAxis dataKey="category" tick={{ fontSize: 12, fill: theme.textMuted }} label={{ value: result.x_axis, position: "insideBottom", offset: -5, fill: theme.textMuted, fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12, fill: theme.textMuted }} label={{ value: result.y_axis, angle: -90, position: "insideLeft", fill: theme.textMuted, fontSize: 12 }} />
        <Tooltip contentStyle={{ background: theme.panel, border: `1px solid ${theme.border}`, fontSize: 12 }} />
        <Bar dataKey="base" stackId="box" fill="transparent" />
        <Bar dataKey="lowerWhisker" stackId="box" fill={theme.grid} />
        <Bar dataKey="lowerBox" stackId="box" fill={theme.accent} />
        <Bar dataKey="upperBox" stackId="box" fill={theme.accentDark} />
        <Bar dataKey="upperWhisker" stackId="box" fill={theme.grid} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// Recharts has no native heatmap — render a colored grid, cell shade driven by correlation value (-1 to 1).
function HeatmapBody({ result, theme }) {
  const columns = result.matrix ? Array.from(new Set(result.matrix.map((c) => c.x))) : [];
  const cellMap = {};
  (result.matrix || []).forEach((c) => {
    cellMap[`${c.x}|${c.y}`] = c.value;
  });

  function colorFor(value) {
    // -1 (cool) -> 0 (neutral cream) -> 1 (warm accent)
    if (value >= 0) {
      const t = value;
      return `rgba(160, 145, 126, ${0.15 + t * 0.75})`; // accent tint
    }
    const t = -value;
    return `rgba(156, 168, 181, ${0.15 + t * 0.75})`; // cool tint
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ padding: 6 }} />
            {columns.map((col) => (
              <th key={col} style={{ padding: 6, color: theme.textMuted, fontWeight: 500 }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {columns.map((rowCol) => (
            <tr key={rowCol}>
              <td style={{ padding: 6, color: theme.textMuted, fontWeight: 500, whiteSpace: "nowrap" }}>{rowCol}</td>
              {columns.map((colCol) => {
                const val = cellMap[`${rowCol}|${colCol}`] ?? 0;
                return (
                  <td
                    key={colCol}
                    title={val.toFixed(2)}
                    style={{
                      padding: 14,
                      textAlign: "center",
                      background: colorFor(val),
                      border: `1px solid ${theme.panel}`,
                      color: theme.text,
                      fontSize: 11,
                    }}
                  >
                    {val.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Recharts has no native violin plot — render each category's density bins as a small horizontal histogram.
function ViolinBody({ result, theme }) {
  const violins = result.violins || [];
  const maxCount = Math.max(1, ...violins.flatMap((v) => v.density.map((d) => d.count)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {violins.map((v) => (
        <div key={v.category}>
          <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>
            {v.category} <span style={{ color: theme.text }}>({v.min.toFixed(1)}–{v.max.toFixed(1)})</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 60 }}>
            {v.density.map((bin, i) => (
              <div
                key={i}
                title={`${bin.bin_start.toFixed(1)}–${bin.bin_end.toFixed(1)}: ${bin.count}`}
                style={{
                  flex: 1,
                  height: `${(bin.count / maxCount) * 100}%`,
                  background: theme.accent,
                  borderRadius: 2,
                  minHeight: bin.count > 0 ? 2 : 0,
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}