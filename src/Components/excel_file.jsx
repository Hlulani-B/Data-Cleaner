import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import * as XLSX from "xlsx";
import EmptyValues from "./emptyvalues";
import {
  trimData, cleanData, removeDuplicates, detectDatatypes,
  removeEmptyRows, lowercaseColumn, uppercaseColumn, properCaseColumn,
  removeColumn, standardizeDates, convertType,
  splitColumn, joinColumns, concatenateColumns,
} from "../utils/cleaners";

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
    data, extra.selectedColumns || [], extra.newColumn || "joined", extra.delimiter || " "
  ),
  concatenate: (data, _col, extra) => concatenateColumns(
    data, extra.selectedColumns || [], extra.newColumn || "concatenated", extra.customString || ""
  ),
};

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

  // Save current file state back to localStorage + Neon
  const persistFile = useCallback(
    (newSheetData) => {
      const stored = JSON.parse(localStorage.getItem("dc_files") || "[]");
      let idx = stored.findIndex((f) => String(f.id) === String(file.id));

      // If file was loaded from Neon only, add it to localStorage
      if (idx === -1 && file.sheets) {
        stored.unshift({ ...file });
        idx = 0;
        localStorage.setItem("dc_files", JSON.stringify(stored));
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
      const newData = funcDef.needsColumn ? runner(data, column, extra) : runner(data, null, extra);
      setData(newData);
      persistFile(newData);
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
    if (funcDef.multiColumn) {
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
              {data.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        {columns.map((col) => (
                          <td key={col}>{row[col] != null ? String(row[col]) : ""}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="empty-msg">No data to display</p>
              )}
              {data.length > 10 && (
                <p className="truncation-note">Showing first 10 of {data.length} rows</p>
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
                        if (fn.key === "separate") {
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

            <button className="modal-close" onClick={() => { setColumnPicker(null); setExtraParams({}); setMultiColumns([]); }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Excel File Component ─── */
function ExcelFile() {
  const { fileId } = useParams();
  const [file, setFile] = useState(null);
  const [activeSheet, setActiveSheet] = useState("");

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("dc_files") || "[]");
    const found = stored.find((f) => String(f.id) === String(fileId));
    if (found) {
      setFile(found);
      setActiveSheet(found.sheetNames[0] || "");
    } else {
      // Fallback: try loading from Neon
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
