import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import * as XLSX from "xlsx";
import EmptyValues from "./emptyvalues";
import { Values } from "../functions/user_choice/getValues";
import {
  trimData, cleanData, removeDuplicates, detectDatatypes,
  removeEmptyRows, fillEmptyValues, lowercaseColumn, uppercaseColumn, properCaseColumn,
  removeColumn, standardizeDates, convertType,
  splitColumn, joinColumns, concatenateColumns,
  mathSingleInPlace, mathSingleNewCol, mathCumulativeSum,
  mathTwoColumn, mathSumColumns, mathAverageColumns,
} from "../utils/cleaners";

const valuesOps = new Values();

/* ─── Client-side function runners ─── */
const FUNCTION_RUNNERS = {
  removeEmpty: (data) => removeEmptyRows(data),
  duplicates: (data) => removeDuplicates(data),
  lower: (data, col) => lowercaseColumn(data, col),
  upper: (data, col) => uppercaseColumn(data, col),
  proper: (data, col) => properCaseColumn(data, col),
  removeColumn: (data, col) => removeColumn(data, col),
  dateStandard: (data, col, extra) => standardizeDates(data, col, extra.format || "YYYY-MM-DD"),
  typeConversion: (data, col, extra) => convertType(data, col, extra.targetType || "string"),
  separate: (data, col, extra) => splitColumn(
    data, col, extra.delimiter || ",", Number(extra.occurrence) || 1,
    extra.newColumn1 || `${col}_1`, extra.newColumn2 || `${col}_2`
  ),
  join: (data, _col, extra) => joinColumns(
    data, (extra && Array.isArray(extra.selectedColumns) ? extra.selectedColumns : []), extra?.newColumn || "joined", extra?.delimiter || " "
  ),
  concatenate: (data, _col, extra) => concatenateColumns(
    data, (extra && Array.isArray(extra.selectedColumns) ? extra.selectedColumns : []), extra?.newColumn || "concatenated", extra?.customString || ""
  ),
  math: (data, _col, extra) => runMathOp(data, extra?.mathOp, extra),
  // Values operations (operate on a sheet-converted copy)
  getValues: (data, col) => {
    const sheet = XLSX.utils.json_to_sheet(data);
    const unique = valuesOps.getValues(sheet, col);
    // Return data unchanged — result shown as an alert/info
    return { __getValuesResult: unique, data };
  },
  replaceValues: (data, col, extra) => {
    const sheet = XLSX.utils.json_to_sheet(data);
    return XLSX.utils.sheet_to_json(valuesOps.replaceValues(sheet, col, extra.findValue ?? "", extra.replaceWith ?? ""), { defval: "" });
  },
  rewrite: (data, col, extra) => {
    const sheet = XLSX.utils.json_to_sheet(data);
    return XLSX.utils.sheet_to_json(valuesOps.rewrite(sheet, col, extra.findValue ?? "", extra.replaceWith ?? ""), { defval: "" });
  },
  removeRowWithValue: (data, col, extra) => {
    const sheet = XLSX.utils.json_to_sheet(data);
    return XLSX.utils.sheet_to_json(valuesOps.removeRowWithValue(sheet, col, extra.findValue ?? ""), { defval: "" });
  },
  fillEmpty: (data, col, extra) => fillEmptyValues(
    data, col, extra.strategy || "value", extra.customValue ?? ""
  ),
};

/* ─── Math Operations Catalogue ─── */
const MATH_OPS = [
  // Single-column in-place
  { key: "absolute", label: "Absolute Value", type: "singleInPlace" },
  { key: "ceil", label: "Ceiling", type: "singleInPlace" },
  { key: "floor", label: "Floor", type: "singleInPlace" },
  { key: "negate", label: "Negate", type: "singleInPlace" },
  { key: "round", label: "Round", type: "singleParam", paramLabel: "Decimals", paramDefault: 0 },
  { key: "addConstant", label: "Add Constant", type: "singleParam", paramLabel: "Value", paramDefault: 0 },
  { key: "multiplyConstant", label: "Multiply Constant", type: "singleParam", paramLabel: "Value", paramDefault: 1 },
  // Single-column → new column
  { key: "squareRoot", label: "Square Root", type: "singleNewCol" },
  { key: "power", label: "Power", type: "singleNewColParam", paramLabel: "Exponent", paramDefault: 2 },
  { key: "log", label: "Logarithm", type: "singleNewColParam", paramLabel: "Base", paramDefault: Math.E },
  { key: "cumulativeSum", label: "Cumulative Sum", type: "singleNewCol" },
  // Two-column → new column
  { key: "add", label: "Add Columns", type: "twoCol" },
  { key: "subtract", label: "Subtract Columns", type: "twoCol" },
  { key: "multiply", label: "Multiply Columns", type: "twoCol" },
  { key: "divide", label: "Divide Columns", type: "twoCol" },
  { key: "modulo", label: "Modulo", type: "twoCol" },
  { key: "min", label: "Min of Two", type: "twoCol" },
  { key: "max", label: "Max of Two", type: "twoCol" },
  { key: "percentageOf", label: "Percentage Of", type: "twoCol" },
  { key: "percentageChange", label: "Percentage Change", type: "twoCol" },
  // Multi-column → new column
  { key: "sumColumns", label: "Sum Columns", type: "multiCol" },
  { key: "averageColumns", label: "Average Columns", type: "multiCol" },
];

/* ─── Math Runner ─── */
function runMathOp(data, opKey, extra) {
  const op = MATH_OPS.find((o) => o.key === opKey);
  if (!op) throw new Error(`Unknown math operation: ${opKey}`);
  const col = extra?.column;
  const colA = extra?.columnA;
  const colB = extra?.columnB;
  const newCol = extra?.newColumn || `${opKey}_result`;
  const param = Number(extra?.paramValue);
  const cols = extra?.selectedColumns || [];

  switch (op.type) {
    case "singleInPlace":
      return mathSingleInPlace(data, col, opKey);
    case "singleParam":
      return mathSingleInPlace(data, col, opKey, param);
    case "singleNewCol":
      if (opKey === "cumulativeSum") return mathCumulativeSum(data, col, newCol);
      return mathSingleNewCol(data, col, newCol, opKey);
    case "singleNewColParam":
      return mathSingleNewCol(data, col, newCol, opKey, param);
    case "twoCol":
      return mathTwoColumn(data, colA, colB, newCol, opKey);
    case "multiCol":
      if (opKey === "sumColumns") return mathSumColumns(data, cols, newCol);
      return mathAverageColumns(data, cols, newCol);
    default:
      throw new Error(`Unsupported math type: ${op.type}`);
  }
}

const FUNCTIONS = [
  { key: "removeEmpty", label: "Remove Empty Rows", desc: "Remove rows where all values are empty", needsColumn: false },
  { key: "duplicates", label: "Remove Duplicates", desc: "Remove exact duplicate rows", needsColumn: false },
  { key: "lower", label: "Lowercase", desc: "Convert text to lowercase", needsColumn: true },
  { key: "upper", label: "Uppercase", desc: "Convert text to UPPERCASE", needsColumn: true },
  { key: "proper", label: "Proper Case", desc: "Capitalize First Letter Of Each Word", needsColumn: true },
  { key: "removeColumn", label: "Remove Column", desc: "Delete a column from the dataset", needsColumn: true },
  { key: "dateStandard", label: "Date Standardize", desc: "Standardize date format in a column", needsColumn: true },
  { key: "typeConversion", label: "Type Conversion", desc: "Convert column values to number, string, or boolean", needsColumn: true },
  { key: "separate", label: "Separate Column", desc: "Split one column into two by a delimiter", needsColumn: true },
  { key: "join", label: "Join Columns", desc: "Combine multiple columns with a delimiter", needsColumn: false, multiColumn: true },
  { key: "concatenate", label: "Concatenate Columns", desc: "Combine multiple columns without a delimiter", needsColumn: false, multiColumn: true },
  { key: "math", label: "Math Operations", desc: "Arithmetic, rounding, absolute, and more", needsColumn: false, isMath: true },
  // Values
  { key: "getValues", label: "Get Unique Values", desc: "Show all unique values in a column", needsColumn: true, isGetValues: true },
  { key: "replaceValues", label: "Replace Value", desc: "Replace exact cell value with another value", needsColumn: true, needsValueParams: true },
  { key: "rewrite", label: "Rewrite (Substring)", desc: "Replace a substring within cell values", needsColumn: true, needsValueParams: true },
  { key: "removeRowWithValue", label: "Remove Row by Value", desc: "Delete all rows where a column equals a value", needsColumn: true, needsRemoveValue: true },
  { key: "fillEmpty", label: "Fill Empty Values", desc: "Fill empty cells with mean, median, or a custom value", needsColumn: true, needsFillStrategy: true },
];

/* ─── Shared FileView component (used by both Excel and CSV) ─── */
export function FileView({ file, fileType, navLabel, sheetNames, activeSheet, onSheetChange }) {
  const [data, setData] = useState([]);
  const [history, setHistory] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [initialCleanDone, setInitialCleanDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [columnPicker, setColumnPicker] = useState(null); // { funcKey, endpoint }
  const [cleanStats, setCleanStats] = useState(null);
  const [extraParams, setExtraParams] = useState({}); // for date format, type target, separate params, etc.
  const [multiColumns, setMultiColumns] = useState([]); // for join / concatenate multi-column selection
  const [showEmptyValues, setShowEmptyValues] = useState(false); // toggle empty values inspector
  const [mathModal, setMathModal] = useState(null); // { step: 'pick'|'config', mathOp, mathDef }
  const [searchQuery, setSearchQuery] = useState(""); // search bar filter
  const [getValuesResult, setGetValuesResult] = useState(null); // { column, values[] }

  // Load sheet data when sheet changes
  useEffect(() => {
    if (file && file.sheets) {
      const sheetData = file.sheets[activeSheet] || [];
      setData(sheetData);
      setHistory([]);
      setDrafts([]);
      // Check persisted clean-done flag for this file + sheet
      const stored = JSON.parse(localStorage.getItem("dc_files") || "[]");
      const found = stored.find((f) => String(f.id) === String(file.id));
      const cleaned = found?.initialCleaned?.[activeSheet] || false;
      setInitialCleanDone(cleaned);
    }
  }, [file, activeSheet]);

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  // Filtered data based on search query
  const filteredData = searchQuery.trim()
    ? data.filter((row) => {
        const term = searchQuery.toLowerCase();
        return Object.values(row).some((val) =>
          String(val ?? "").toLowerCase().includes(term)
        );
      })
    : data;

  // Reset search when sheet changes
  useEffect(() => { setSearchQuery(""); }, [activeSheet]);

  // Save current file state back to localStorage + Neon
  const persistFile = useCallback(
    (newSheetData) => {
      const stored = JSON.parse(localStorage.getItem("dc_files") || "[]");
      let idx = stored.findIndex((f) => String(f.id) === String(file.id));

      // Fallback: match by filename + filetype (handles tempId → Neon ID swap)
      if (idx === -1 && file.filename) {
        idx = stored.findIndex(
          (f) => f.filename === file.filename && f.filetype === file.filetype
        );
      }

      // If file was loaded from Neon only, add it to localStorage
      if (idx === -1 && file.sheets) {
        stored.unshift({ ...file });
        idx = 0;
      }

      if (idx !== -1) {
        stored[idx].sheets[activeSheet] = newSheetData;
        localStorage.setItem("dc_files", JSON.stringify(stored));

        // Also save to Neon (fire-and-forget)
        const email = localStorage.getItem("dc_userEmail");
        if (email) {
          fetch("/api/files", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "update",
              fileId: Number(file.id),
              sheets: stored[idx].sheets,
              sheetNames: stored[idx].sheetNames,
            }),
          }).catch(() => {});
        }
      }
    },
    [file, activeSheet]
  );

  // Push current data to undo history
  const pushHistory = () => {
    setHistory((prev) => [...prev, JSON.parse(JSON.stringify(data))]);
  };

  // Save a draft snapshot
  const saveDraft = (label) => {
    setDrafts((prev) => [
      { label, data: JSON.parse(JSON.stringify(data)), timestamp: Date.now() },
      ...prev,
    ]);
  };

  /* ─── Initial Clean (client-side: trim + clean + duplicates + datatype) ─── */
  const runInitialClean = () => {
    pushHistory();
    const original = JSON.parse(JSON.stringify(data));
    let current = JSON.parse(JSON.stringify(data));

    const beforeRows = current.length;
    current = trimData(current);
    const afterTrim = current.length;
    current = cleanData(current);
    const afterClean = current.length;
    current = removeDuplicates(current);
    const afterDedup = current.length;
    current = detectDatatypes(current);

    const duplicatesRemoved = afterClean - afterDedup;
    const emptyRowsRemoved = beforeRows - afterTrim;
    const nullsCleaned = afterTrim - afterClean;

    setData(current);
    persistFile(current);
    saveDraft("Initial Clean");
    setInitialCleanDone(true);

    // Persist clean-done flag so it never runs again for this file + sheet
    const stored = JSON.parse(localStorage.getItem("dc_files") || "[]");
    const idx = stored.findIndex((f) => String(f.id) === String(file.id));
    if (idx !== -1) {
      if (!stored[idx].initialCleaned) stored[idx].initialCleaned = {};
      stored[idx].initialCleaned[activeSheet] = true;
      localStorage.setItem("dc_files", JSON.stringify(stored));
    }
    setCleanStats({
      rowsBefore: beforeRows,
      rowsAfter: current.length,
      emptyRowsRemoved: emptyRowsRemoved + nullsCleaned,
      duplicatesRemoved,
    });
  };

  /* ─── Apply a cleaning function (client-side) ─── */
  const applyFunction = (funcDef, column, extra = {}) => {
    try {
      pushHistory();
      const runner = FUNCTION_RUNNERS[funcDef.key];
      if (!runner) throw new Error(`Unknown function: ${funcDef.key}`);
      const result = funcDef.needsColumn ? runner(data, column, extra) : runner(data, null, extra);
      // getValues returns a special object — show result without modifying data
      if (result && result.__getValuesResult) {
        setHistory((prev) => prev.slice(0, -1)); // undo the premature history push
        const unique = result.__getValuesResult;
        setGetValuesResult({ column, values: unique });
        setColumnPicker(null);
        return;
      }
      setData(result);
      persistFile(result);
      saveDraft(funcDef.label + (column ? ` (${column})` : ""));
      setColumnPicker(null);
      setExtraParams({});
    } catch (err) {
      setError(err.message);
    }
  };

  /* ─── Undo last action ─── */
  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setData(prev);
    persistFile(prev);
  };

  /* ─── Jump to a draft ─── */
  const jumpToDraft = (draft) => {
    pushHistory();
    setData(JSON.parse(JSON.stringify(draft.data)));
    persistFile(draft.data);
  };

  /* ─── Handle function card click ─── */
  const handleFuncClick = (funcDef) => {
    setExtraParams({});
    if (funcDef.isMath) {
      setMathModal({ step: "pick" });
    } else if (funcDef.multiColumn) {
      setColumnPicker({ funcKey: funcDef.key, label: funcDef.label, multiColumn: true });
      setMultiColumns([]);
    } else if (funcDef.needsColumn) {
      setColumnPicker({ funcKey: funcDef.key, endpoint: funcDef.endpoint, label: funcDef.label });
    } else {
      applyFunction(funcDef);
    }
  };

  /* ─── Export current data as XLSX download (client-side) ─── */
  const exportFile = () => {
    try {
      const sheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
      XLSX.writeFile(workbook, file.filename || "export.xlsx");
    } catch (err) {
      setError("Export failed: " + err.message);
    }
  };

  return (
    <div className="app-layout">
      {/* Top Nav */}
      <nav className="top-nav">
        <div className="nav-tabs">
          <Link to="/" className="nav-tab">Data Cleaner</Link>
          <span className="nav-tab active">{navLabel}</span>
        </div>
        <div className="nav-actions">
          <button className="export-btn" onClick={exportFile} title="Download as XLSX">
            Export
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="file-layout">
        {/* Sheet sidebar (Excel only) */}
        {sheetNames && sheetNames.length > 1 && (
          <aside className="sheet-sidebar">
            <h3 className="sidebar-title">Sheets</h3>
            {sheetNames.map((name) => (
              <button
                key={name}
                className={`sheet-tab ${name === activeSheet ? "active" : ""}`}
                onClick={() => onSheetChange(name)}
              >
                {name}
              </button>
            ))}
          </aside>
        )}

        {/* Content Area */}
        <div className="file-content">
          {error && (
            <div className="error-bar">
              <span>{error}</span>
              <button onClick={() => setError(null)}>&times;</button>
            </div>
          )}

          {/* Search Bar */}
          {data.length > 0 && (
            <div className="search-bar">
              <span className="search-icon">&#128269;</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search all columns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <>
                  <span className="search-count">
                    {filteredData.length} of {data.length} rows
                  </span>
                  <button className="search-clear" onClick={() => setSearchQuery("")} title="Clear search">
                    &times;
                  </button>
                </>
              )}
            </div>
          )}

          {/* Data Table / Empty Values Inspector */}
          {showEmptyValues ? (
            <EmptyValues
              data={data}
              onUpdate={(newData) => {
                pushHistory();
                setData(newData);
                persistFile(newData);
                saveDraft("Remove Empty Values");
              }}
              onBack={() => setShowEmptyValues(false)}
            />
          ) : (
            <div className="table-wrap">
              {filteredData.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.slice(0, 50).map((row, i) => (
                      <tr key={i}>
                        {columns.map((col) => {
                          const cellVal = row[col] != null ? String(row[col]) : "";
                          const isMatch = searchQuery.trim() && cellVal.toLowerCase().includes(searchQuery.toLowerCase());
                          return (
                            <td key={col} className={isMatch ? "search-highlight" : ""}>
                              {cellVal}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="empty-msg">{searchQuery ? "No rows match your search" : "No data to display"}</p>
              )}
              {filteredData.length > 50 && (
                <p className="truncation-note">Showing first 50 of {filteredData.length} rows{searchQuery ? ` (${data.length} total)` : ""}</p>
              )}
            </div>
          )}

          {/* Clean Results Banner */}
          {cleanStats && (
            <div className="clean-results">
              <strong>Initial Clean Complete</strong>
              <div className="clean-stats">
                <span>{cleanStats.rowsBefore} rows &rarr; {cleanStats.rowsAfter} rows</span>
                {cleanStats.emptyRowsRemoved > 0 && (
                  <span className="stat-badge">{cleanStats.emptyRowsRemoved} empty rows removed</span>
                )}
                {cleanStats.duplicatesRemoved > 0 && (
                  <span className="stat-badge">{cleanStats.duplicatesRemoved} duplicates removed</span>
                )}
                {cleanStats.emptyRowsRemoved === 0 && cleanStats.duplicatesRemoved === 0 && (
                  <span className="stat-badge ok">Data was already clean</span>
                )}
              </div>
              <button className="dismiss-btn" onClick={() => setCleanStats(null)}>&times;</button>
            </div>
          )}

          {/* Get Unique Values Result Panel */}
          {getValuesResult && (
            <div className="clean-results get-values-results">
              <strong>Unique Values: {getValuesResult.column}</strong>
              <div className="get-values-list">
                {getValuesResult.values.length > 0 ? (
                  getValuesResult.values.map((val, i) => (
                    <span key={i} className="stat-badge">{String(val)}</span>
                  ))
                ) : (
                  <span className="stat-badge ok">No values found</span>
                )}
              </div>
              <button className="dismiss-btn" onClick={() => setGetValuesResult(null)}>&times;</button>
            </div>
          )}

          {/* Initial Clean Gate */}
          {!initialCleanDone ? (
            <div className="gate-section">
              <p className="gate-text">
                Run Initial Clean to unlock all functions.
                <br />
                <small>Applies: Trim, Clean, Remove Duplicates, Datatype Detection</small>
              </p>
              <button className="primary-btn" onClick={runInitialClean} disabled={loading}>
                {loading ? "Cleaning..." : "Initial Clean"}
              </button>
            </div>
          ) : (
            <>
              {/* Functions Grid */}
              <section className="functions-section">
                <h3 className="section-heading">Functions</h3>
                <div className="functions-grid">
                  {/* Empty Values Inspector */}
                  <button
                    className="func-card"
                    onClick={() => setShowEmptyValues(true)}
                    disabled={loading}
                  >
                    <span className="func-name">Empty Values</span>
                    <span className="func-desc">Inspect & remove rows with empty cells</span>
                  </button>
                  {FUNCTIONS.map((fn) => (
                    <button
                      key={fn.key}
                      className="func-card"
                      onClick={() => handleFuncClick(fn)}
                      disabled={loading}
                    >
                      <span className="func-name">{fn.label}</span>
                      <span className="func-desc">{fn.desc}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Drafts */}
              {drafts.length > 0 && (
                <section className="drafts-section">
                  <h3 className="section-heading">Drafts</h3>
                  <div className="drafts-list">
                    {drafts.map((d, i) => (
                      <button key={i} className="draft-chip" onClick={() => jumpToDraft(d)}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {/* Undo Bar */}
      <div className="undo-bar">
        <button className="undo-btn" onClick={undo} disabled={history.length === 0}>
          &#8630; Undo
        </button>
        <span className="history-count">{history.length} step{history.length !== 1 ? "s" : ""} back</span>
      </div>

      {/* Column Picker Modal */}
      {columnPicker && (
        <div className="modal-overlay" onClick={() => { setColumnPicker(null); setExtraParams({}); setMultiColumns([]); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {columnPicker.label}{columnPicker.multiColumn ? " — Choose columns" : " — Choose a column"}
            </h3>

            {/* ── Multi-column selection (join / concatenate) ── */}
            {columnPicker.multiColumn ? (
              <>
                <p className="modal-hint">Select two or more columns</p>
                <div className="column-grid">
                  {columns.map((col) => {
                    const selected = multiColumns.includes(col);
                    return (
                      <button
                        key={col}
                        className={`column-chip ${selected ? "selected" : ""}`}
                        onClick={() =>
                          setMultiColumns((prev) =>
                            selected ? prev.filter((c) => c !== col) : [...prev, col]
                          )
                        }
                      >
                        {col}
                      </button>
                    );
                  })}
                </div>

                {multiColumns.length >= 2 && (
                  <div className="selected-columns-preview">
                    <strong>Selected:</strong> {multiColumns.join(", ")}
                  </div>
                )}

                {/* Join extra params */}
                {columnPicker.funcKey === "join" && (
                  <div className="extra-params">
                    <label>
                      Delimiter:
                      <input
                        type="text"
                        value={extraParams.delimiter ?? " "}
                        onChange={(e) => setExtraParams({ ...extraParams, delimiter: e.target.value })}
                        placeholder=" "
                      />
                    </label>
                    <label>
                      New column name:
                      <input
                        type="text"
                        value={extraParams.newColumn ?? "joined"}
                        onChange={(e) => setExtraParams({ ...extraParams, newColumn: e.target.value })}
                        placeholder="joined"
                      />
                    </label>
                  </div>
                )}

                {/* Concatenate extra params */}
                {columnPicker.funcKey === "concatenate" && (
                  <div className="extra-params">
                    <label>
                      Custom string (optional):
                      <input
                        type="text"
                        value={extraParams.customString ?? ""}
                        onChange={(e) => setExtraParams({ ...extraParams, customString: e.target.value })}
                        placeholder="e.g. - or _"
                      />
                    </label>
                    <label>
                      New column name:
                      <input
                        type="text"
                        value={extraParams.newColumn ?? "concatenated"}
                        onChange={(e) => setExtraParams({ ...extraParams, newColumn: e.target.value })}
                        placeholder="concatenated"
                      />
                    </label>
                  </div>
                )}

                <button
                  className="primary-btn modal-apply-btn"
                  disabled={multiColumns.length < 2}
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === columnPicker.funcKey);
                    applyFunction(fn, null, { ...extraParams, selectedColumns: multiColumns });
                  }}
                >
                  Apply
                </button>
              </>
            ) : (
              <>
                {/* ── Single-column selection ── */}
                <div className="column-grid">
                  {columns.map((col) => (
                    <button
                      key={col}
                      className="column-chip"
                      onClick={() => {
                        const fn = FUNCTIONS.find((f) => f.key === columnPicker.funcKey);
                        if (fn.key === "separate" || fn.needsValueParams || fn.needsRemoveValue || fn.needsFillStrategy) {
                          // Open extra params instead of applying immediately
                          setColumnPicker((prev) => ({ ...prev, selectedColumn: col, showParams: true }));
                        } else {
                          applyFunction(fn, col, extraParams);
                        }
                      }}
                    >
                      {col}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Extra params for specific single-column functions */}
            {columnPicker.funcKey === "dateStandard" && (
              <div className="extra-params">
                <label>Date Format:</label>
                <select
                  value={extraParams.format || "YYYY-MM-DD"}
                  onChange={(e) => setExtraParams({ ...extraParams, format: e.target.value })}
                >
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                </select>
              </div>
            )}

            {columnPicker.funcKey === "typeConversion" && (
              <div className="extra-params">
                <label>Target Type:</label>
                <select
                  value={extraParams.targetType || "string"}
                  onChange={(e) => setExtraParams({ ...extraParams, targetType: e.target.value })}
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                </select>
              </div>
            )}

            {/* Separate column extra params */}
            {columnPicker.funcKey === "separate" && columnPicker.showParams && (
              <div className="extra-params">
                <p className="modal-hint">Splitting column: <strong>{columnPicker.selectedColumn}</strong></p>
                <label>
                  Delimiter:
                  <input
                    type="text"
                    value={extraParams.delimiter ?? ","}
                    onChange={(e) => setExtraParams({ ...extraParams, delimiter: e.target.value })}
                    placeholder=","
                  />
                </label>
                <label>
                  Occurrence (split at Nth delimiter):
                  <input
                    type="number"
                    min="1"
                    value={extraParams.occurrence ?? 1}
                    onChange={(e) => setExtraParams({ ...extraParams, occurrence: e.target.value })}
                  />
                </label>
                <label>
                  New column 1 name:
                  <input
                    type="text"
                    value={extraParams.newColumn1 ?? `${columnPicker.selectedColumn || ""}_1`}
                    onChange={(e) => setExtraParams({ ...extraParams, newColumn1: e.target.value })}
                    placeholder={`${columnPicker.selectedColumn}_1`}
                  />
                </label>
                <label>
                  New column 2 name:
                  <input
                    type="text"
                    value={extraParams.newColumn2 ?? `${columnPicker.selectedColumn || ""}_2`}
                    onChange={(e) => setExtraParams({ ...extraParams, newColumn2: e.target.value })}
                    placeholder={`${columnPicker.selectedColumn}_2`}
                  />
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === "separate");
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Replace Value / Rewrite extra params */}
            {(columnPicker.funcKey === "replaceValues" || columnPicker.funcKey === "rewrite") && columnPicker.selectedColumn && (
              <div className="extra-params">
                <p className="modal-hint">
                  {columnPicker.funcKey === "rewrite" ? "Substring to find:" : "Value to find:"}
                </p>
                <label>
                  Find:
                  <input
                    type="text"
                    value={extraParams.findValue ?? ""}
                    onChange={(e) => setExtraParams({ ...extraParams, findValue: e.target.value })}
                    placeholder="Value to find"
                  />
                </label>
                <label>
                  Replace with:
                  <input
                    type="text"
                    value={extraParams.replaceWith ?? ""}
                    onChange={(e) => setExtraParams({ ...extraParams, replaceWith: e.target.value })}
                    placeholder="Replacement value"
                  />
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  disabled={!extraParams.findValue}
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === columnPicker.funcKey);
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Remove Row by Value extra params */}
            {columnPicker.funcKey === "removeRowWithValue" && columnPicker.selectedColumn && (
              <div className="extra-params">
                <label>
                  Remove rows where <strong>{columnPicker.selectedColumn}</strong> equals:
                  <input
                    type="text"
                    value={extraParams.findValue ?? ""}
                    onChange={(e) => setExtraParams({ ...extraParams, findValue: e.target.value })}
                    placeholder="Value to match"
                  />
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  disabled={extraParams.findValue === undefined || extraParams.findValue === ""}
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === "removeRowWithValue");
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Fill Empty Values extra params */}
            {columnPicker.funcKey === "fillEmpty" && columnPicker.selectedColumn && (
              <div className="extra-params">
                <p className="modal-hint">Filling empty cells in: <strong>{columnPicker.selectedColumn}</strong></p>
                <label>
                  Strategy:
                  <select
                    value={extraParams.strategy || "value"}
                    onChange={(e) => setExtraParams({ ...extraParams, strategy: e.target.value })}
                  >
                    <option value="value">Custom value</option>
                    <option value="mean">Mean (numeric)</option>
                    <option value="median">Median (numeric)</option>
                  </select>
                </label>
                {(!extraParams.strategy || extraParams.strategy === "value") && (
                  <label>
                    Fill with:
                    <input
                      type="text"
                      value={extraParams.customValue ?? ""}
                      onChange={(e) => setExtraParams({ ...extraParams, customValue: e.target.value })}
                      placeholder="Value to insert"
                    />
                  </label>
                )}
                <button
                  className="primary-btn modal-apply-btn"
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === "fillEmpty");
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            <button className="modal-close" onClick={() => { setColumnPicker(null); setExtraParams({}); setMultiColumns([]); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ─── Math Operations Modal ─── */}
      {mathModal && (
        <div className="modal-overlay" onClick={() => { setMathModal(null); setExtraParams({}); setMultiColumns([]); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {mathModal.step === "pick" ? (
              <>
                <h3 className="modal-title">Math Operations</h3>
                <p className="modal-hint">Select an operation</p>
                <div className="column-grid">
                  {MATH_OPS.map((op) => (
                    <button
                      key={op.key}
                      className="column-chip"
                      onClick={() => {
                        setMathModal({ step: "config", mathOp: op.key, mathDef: op });
                        setMultiColumns([]);
                        setExtraParams({});
                      }}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <MathConfigStep
                mathDef={mathModal.mathDef}
                mathOp={mathModal.mathOp}
                columns={columns}
                data={data}
                multiColumns={multiColumns}
                setMultiColumns={setMultiColumns}
                extraParams={extraParams}
                setExtraParams={setExtraParams}
                onBack={() => { setMathModal({ step: "pick" }); setExtraParams({}); setMultiColumns([]); }}
                onApply={(extra) => {
                  const fn = FUNCTIONS.find((f) => f.key === "math");
                  applyFunction(fn, null, { ...extra, mathOp: mathModal.mathOp });
                  setMathModal(null);
                }}
              />
            )}
            <button className="modal-close" onClick={() => { setMathModal(null); setExtraParams({}); setMultiColumns([]); }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Math Config Step (column/param selection for chosen operation) ─── */
function MathConfigStep({ mathDef, mathOp, columns, data, multiColumns, setMultiColumns, extraParams, setExtraParams, onBack, onApply }) {
  const { type, paramLabel, paramDefault } = mathDef;
  const needsParam = type === "singleParam" || type === "singleNewColParam";
  const needsNewCol = ["singleNewCol", "singleNewColParam", "twoCol", "multiCol"].includes(type);
  const isTwoCol = type === "twoCol";
  const isMultiCol = type === "multiCol";

  return (
    <>
      <h3 className="modal-title">{mathDef.label}</h3>
      <button className="modal-back-btn" onClick={onBack} style={{ marginBottom: 12, cursor: "pointer", background: "none", border: "none", color: "var(--accent)", fontSize: 13 }}>
        &larr; Back to operations
      </button>

      {/* Single column picker */}
      {!isTwoCol && !isMultiCol && (
        <>
          <p className="modal-hint">Select a column</p>
          <div className="column-grid">
            {columns.map((col) => (
              <button key={col} className={`column-chip ${extraParams.column === col ? "selected" : ""}`}
                onClick={() => setExtraParams({ ...extraParams, column: col })}>
                {col}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Two-column picker */}
      {isTwoCol && (
        <>
          <p className="modal-hint">Select first column (A)</p>
          <div className="column-grid">
            {columns.map((col) => (
              <button key={col} className={`column-chip ${extraParams.columnA === col ? "selected" : ""}`}
                onClick={() => setExtraParams({ ...extraParams, columnA: col })}>
                {col}
              </button>
            ))}
          </div>
          <p className="modal-hint">Select second column (B)</p>
          <div className="column-grid">
            {columns.map((col) => (
              <button key={col} className={`column-chip ${extraParams.columnB === col ? "selected" : ""}`}
                onClick={() => setExtraParams({ ...extraParams, columnB: col })}>
                {col}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Multi-column picker */}
      {isMultiCol && (
        <>
          <p className="modal-hint">Select two or more columns</p>
          <div className="column-grid">
            {columns.map((col) => {
              const selected = multiColumns.includes(col);
              return (
                <button key={col} className={`column-chip ${selected ? "selected" : ""}`}
                  onClick={() => setMultiColumns((prev) => selected ? prev.filter((c) => c !== col) : [...prev, col])}>
                  {col}
                </button>
              );
            })}
          </div>
          {multiColumns.length >= 2 && (
            <div className="selected-columns-preview">
              <strong>Selected:</strong> {multiColumns.join(", ")}
            </div>
          )}
        </>
      )}

      {/* Extra params */}
      {needsParam && (
        <div className="extra-params">
          <label>
            {paramLabel}:
            <input type="number" value={extraParams.paramValue ?? paramDefault}
              onChange={(e) => setExtraParams({ ...extraParams, paramValue: e.target.value })} />
          </label>
        </div>
      )}

      {/* New column name */}
      {needsNewCol && (
        <div className="extra-params">
          <label>
            New column name:
            <input type="text" value={extraParams.newColumn ?? `${mathOp}_result`}
              onChange={(e) => setExtraParams({ ...extraParams, newColumn: e.target.value })}
              placeholder={`${mathOp}_result`} />
          </label>
        </div>
      )}

      {/* Apply button */}
      <button className="primary-btn modal-apply-btn"
        disabled={
          (!isTwoCol && !isMultiCol && !extraParams.column) ||
          (isTwoCol && (!extraParams.columnA || !extraParams.columnB)) ||
          (isMultiCol && multiColumns.length < 2)
        }
        onClick={() => {
          const extra = { ...extraParams };
          if (isMultiCol) extra.selectedColumns = multiColumns;
          onApply(extra);
        }}
      >
        Apply {mathDef.label}
      </button>
    </>
  );
}

/* ─── Excel File Component ─── */
function ExcelFile() {
  const { fileId } = useParams();
  const [file, setFile] = useState(null);
  const [activeSheet, setActiveSheet] = useState("");

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("dc_files") || "[]");
    let found = stored.find((f) => String(f.id) === String(fileId));

    // Fallback: ID not found (tempId may have been replaced by Neon sync)
    // Try the most recent Excel file in localStorage
    if (!found) {
      const excelFiles = stored.filter((f) => f.filetype === "excel");
      if (excelFiles.length > 0) {
        found = excelFiles.sort((a, b) => {
          const ta = new Date(a.createdAt || 0).getTime();
          const tb = new Date(b.createdAt || 0).getTime();
          return tb - ta;
        })[0];
      }
    }

    if (found) {
      setFile(found);
      setActiveSheet(found.sheetNames[0] || "");
    } else {
      // Last resort: try loading from Neon
      fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get", fileId: Number(fileId) }),
      })
        .then((r) => r.json())
        .then((res) => {
          if (res.file) {
            const f = { ...res.file, id: String(res.file.id) };
            setFile(f);
            setActiveSheet(f.sheetNames[0] || "");
          }
        })
        .catch(() => {});
    }
  }, [fileId]);

  if (!file) {
    return (
      <div className="app-layout">
        <nav className="top-nav">
          <div className="nav-tabs">
            <Link to="/" className="nav-tab">Data Cleaner</Link>
            <span className="nav-tab active">Excel</span>
          </div>
        </nav>
        <main className="dashboard-main">
          <p className="empty-msg">File not found. <Link to="/">Go back</Link></p>
        </main>
      </div>
    );
  }

  return (
    <FileView
      file={file}
      fileType="excel"
      navLabel="Excel"
      sheetNames={file.sheetNames}
      activeSheet={activeSheet}
      onSheetChange={setActiveSheet}
    />
  );
}

export default ExcelFile;
