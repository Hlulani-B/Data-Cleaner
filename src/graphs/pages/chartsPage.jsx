import { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import ChartViewer from "./charts";

// ── Theme (matches Data Cleaner) ──
const theme = {
  bg: "#FAF7F2",
  panel: "#FFFFFF",
  border: "#E8E1D4",
  text: "#4A3F35",
  textMuted: "#8B7D6B",
  accent: "#A0917E",
  accentDark: "#6B5D4F",
  grid: "#EFE9DE",
};

// Chart types and the column inputs they need
const CHART_TYPES = [
  { key: "bar", label: "Bar Chart", needs: ["column"], stringCol: true },
  { key: "histogram", label: "Histogram", needs: ["column"], numericCol: true },
  { key: "pie", label: "Pie Chart", needs: ["column"], stringCol: true },
  { key: "scatter", label: "Scatter Plot", needs: ["xColumn", "yColumn"], numericCol: true },
  { key: "line", label: "Line Graph", needs: ["xColumn", "yColumn"], yNumeric: true },
  { key: "area", label: "Area Chart", needs: ["xColumn", "yColumn"], yNumeric: true },
  { key: "box", label: "Box Plot", needs: ["categoryColumn", "valueColumn"], valueNumeric: true },
  { key: "violin", label: "Violin Plot", needs: ["categoryColumn", "valueColumn"], valueNumeric: true },
  { key: "heatmap", label: "Heatmap", needs: ["columns"], numericCol: true, multi: true },
  { key: "stackedBar", label: "Stacked Bar", needs: ["categoryColumn", "groupColumn"], stringCol: true },
  { key: "bubble", label: "Bubble Chart", needs: ["xColumn", "yColumn", "sizeColumn"], numericCol: true },
];

export default function ChartsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sheet, filePath, columns, email } = location.state || {};

  const [selectedChart, setSelectedChart] = useState("bar");
  const [columnMap, setColumnMap] = useState({}); // { column: "Name", xColumn: "Age", ... }
  const [multiColumns, setMultiColumns] = useState([]); // for heatmap
  const [generatedCharts, setGeneratedCharts] = useState([]); // { id, type, params, title }
  const [savedCharts, setSavedCharts] = useState([]); // loaded from DB
  const [loadingSaved, setLoadingSaved] = useState(true);

  // Load saved charts from DB on mount
  useEffect(() => {
    if (!email || !filePath) return;
    let cancelled = false;

    async function loadSaved() {
      setLoadingSaved(true);
      try {
        const res = await fetch(
          `/api/fetchcharts?email=${encodeURIComponent(email)}&filepath=${encodeURIComponent(filePath)}`
        );
        if (!res.ok) throw new Error("Failed to load saved charts");
        const json = await res.json();
        if (!cancelled) {
          setSavedCharts(json.charts || []);
        }
      } catch (err) {
        console.error("Error loading saved charts:", err);
      } finally {
        if (!cancelled) setLoadingSaved(false);
      }
    }

    loadSaved();
    return () => { cancelled = true; };
  }, [email, filePath]);

  // Detect numeric vs string columns
  const { numericCols, stringCols } = useMemo(() => {
    if (!sheet || sheet.length === 0) return { numericCols: [], stringCols: columns };
    const num = [];
    const str = [];
    columns.forEach((col) => {
      const val = sheet.find((r) => r[col] != null && r[col] !== "")?.[col];
      if (typeof val === "number") num.push(col);
      else str.push(col);
    });
    return { numericCols: num, stringCols: str };
  }, [sheet, columns]);

  const chartDef = CHART_TYPES.find((c) => c.key === selectedChart);

  // Get available columns based on chart type requirements
  const availableColumns = useMemo(() => {
    if (!chartDef) return columns;
    if (chartDef.numericCol) return numericCols;
    if (chartDef.stringCol) return stringCols;
    if (chartDef.yNumeric) return columns; // x can be anything, y must be numeric
    if (chartDef.valueNumeric) return columns; // category can be anything, value must be numeric
    return columns;
  }, [chartDef, columns, numericCols, stringCols]);

  const handleColumnChange = (param, value) => {
    setColumnMap((prev) => ({ ...prev, [param]: value }));
  };

  const handleGenerate = () => {
    const params = { sheet, email, filePath };

    if (selectedChart === "heatmap") {
      if (multiColumns.length < 2) return alert("Select at least 2 numeric columns for heatmap");
      params.columns = multiColumns;
    } else {
      // Validate all needed columns are selected
      for (const need of chartDef.needs) {
        if (!columnMap[need]) return alert(`Please select a column for "${need}"`);
        params[need] = columnMap[need];
      }
    }

    const chartEntry = {
      id: Date.now(),
      type: selectedChart,
      params,
      title: `${chartDef.label} — ${Object.values(columnMap).join(" vs ") || multiColumns.join(", ")}`,
    };

    setGeneratedCharts((prev) => [chartEntry, ...prev]);
  };

  // No data passed — show error
  if (!sheet || !columns || columns.length === 0) {
    return (
      <div style={{ minHeight: "100vh", background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ textAlign: "center", color: theme.text }}>
          <h2>No data to visualise</h2>
          <p style={{ color: theme.textMuted }}>Please go back and select a file first.</p>
          <button onClick={() => navigate("/")} style={{ background: theme.accentDark, color: "#fff", border: "none", borderRadius: 6, padding: "10px 24px", fontSize: 14, cursor: "pointer" }}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, fontFamily: "system-ui, -apple-system, sans-serif", color: theme.text }}>
      {/* Top Nav */}
      <nav style={{ background: theme.panel, borderBottom: `1px solid ${theme.border}`, padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/" style={{ color: theme.accentDark, textDecoration: "none", fontWeight: 600, fontSize: 16 }}>Data Cleaner & Visualiser</Link>
          <span style={{ color: theme.textMuted, fontSize: 14 }}>/</span>
          <span style={{ fontSize: 14, color: theme.textMuted }}>{filePath}</span>
        </div>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "none", color: theme.accent, fontSize: 14, cursor: "pointer" }}>
          &larr; Back
        </button>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>
        {/* Dataset Info */}
        <section style={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "12px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: theme.textMuted }}>Dataset:</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{sheet.length.toLocaleString()} rows</span>
          <span style={{ fontSize: 13, color: theme.textMuted }}>&times;</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{columns.length} columns</span>
          <span style={{ fontSize: 12, color: theme.textMuted, marginLeft: "auto" }}>{filePath}</span>
        </section>

        {/* Chart Type Picker */}
        <section style={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 600 }}>Choose Chart Type</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CHART_TYPES.map((ct) => (
              <button
                key={ct.key}
                onClick={() => { setSelectedChart(ct.key); setColumnMap({}); setMultiColumns([]); }}
                style={{
                  background: selectedChart === ct.key ? theme.accentDark : theme.panel,
                  color: selectedChart === ct.key ? "#fff" : theme.text,
                  border: `1px solid ${selectedChart === ct.key ? theme.accentDark : theme.border}`,
                  borderRadius: 6,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {ct.label}
              </button>
            ))}
          </div>
        </section>

        {/* Column Picker */}
        <section style={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 600 }}>Select Columns</h2>

          {selectedChart === "heatmap" ? (
            <div>
              <p style={{ fontSize: 13, color: theme.textMuted, margin: "0 0 8px" }}>Select 2 or more numeric columns for correlation heatmap:</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {numericCols.map((col) => {
                  const selected = multiColumns.includes(col);
                  return (
                    <button
                      key={col}
                      onClick={() => setMultiColumns((prev) => selected ? prev.filter((c) => c !== col) : [...prev, col])}
                      style={{
                        background: selected ? theme.accentDark : theme.panel,
                        color: selected ? "#fff" : theme.text,
                        border: `1px solid ${selected ? theme.accentDark : theme.border}`,
                        borderRadius: 6,
                        padding: "6px 14px",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      {col}
                    </button>
                  );
                })}
              </div>
              {numericCols.length === 0 && (
                <p style={{ color: "#B0564D", fontSize: 13 }}>No numeric columns detected. Heatmap requires numeric data.</p>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              {chartDef?.needs.map((param) => (
                <div key={param} style={{ minWidth: 180 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 4, color: theme.textMuted }}>
                    {param.replace(/([A-Z])/g, " $1").trim()}
                  </label>
                  <select
                    value={columnMap[param] || ""}
                    onChange={(e) => handleColumnChange(param, e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 6,
                      border: `1px solid ${theme.border}`,
                      fontSize: 13,
                      background: theme.panel,
                      color: theme.text,
                    }}
                  >
                    <option value="">-- select --</option>
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleGenerate}
            style={{
              marginTop: 16,
              background: theme.accentDark,
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "10px 24px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Generate Chart
          </button>
        </section>

        {/* Saved Charts from DB */}
        {loadingSaved && (
          <section style={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: theme.textMuted, textAlign: "center" }}>Loading saved charts...</p>
          </section>
        )}
        {!loadingSaved && savedCharts.length > 0 && (
          <section style={{ marginBottom: 20 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 600 }}>Saved Charts ({savedCharts.length})</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {savedCharts.map((sc) => (
                <ChartViewer key={`saved-${sc.id}`} type={sc.type} savedData={sc} />
              ))}
            </div>
          </section>
        )}

        {/* Generated Charts */}
        {generatedCharts.length > 0 && (
          <section>
            <h2 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 600 }}>Newly Generated</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {generatedCharts.map((gc) => (
                <ChartViewer key={gc.id} type={gc.type} params={gc.params} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
