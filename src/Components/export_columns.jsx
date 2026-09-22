import { useEffect, useMemo, useState } from "react";
import { EXPORT_FORMATS, buildExportFiles, downloadFiles, previewFile } from "../utils/exports/columnExporter";

/* ─── Export Columns modal: pick columns → pick formats → download ─── */
function ExportColumnsModal({ columns = [], rows = [], filename, onClose }) {
  const [selected, setSelected] = useState(columns);
  const [formats, setFormats] = useState(["csv"]);
  const [combine, setCombine] = useState(true);
  const [jsonOrient, setJsonOrient] = useState("records");
  const [pythonSource, setPythonSource] = useState("inline");
  const [includeStats, setIncludeStats] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  /* Close on Escape */
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const wantsScript = formats.some((f) => ["pandas", "numpy"].includes(f));

  const files = useMemo(
    () =>
      buildExportFiles(rows, selected, {
        formats,
        combine,
        jsonOrient,
        pythonSource,
        includeStats,
        filename,
      }),
    [rows, selected, formats, combine, jsonOrient, pythonSource, includeStats, filename]
  );

  const preview = useMemo(() => previewFile(files), [files]);

  const toggleColumn = (col) =>
    setSelected((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]));

  const toggleFormat = (key) =>
    setFormats((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));

  const handleDownload = async () => {
    if (!files.length) return;
    setBusy(true);
    setMessage("");
    try {
      const count = await downloadFiles(files);
      setMessage(`Downloaded ${count} file${count === 1 ? "" : "s"} — check your browser downloads.`);
    } catch (err) {
      setMessage(err.message || "Download failed");
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(files.map((f) => f.content).join("\n\n"));
      setMessage("Copied to clipboard");
      setTimeout(() => setMessage(""), 2000);
    } catch {
      setMessage("Clipboard not available in this browser");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal export-columns-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Export Columns</h3>

        {/* ── 1. Columns ── */}
        <p className="modal-hint">1. Choose the columns to export</p>
        <div className="export-toolbar">
          <button className="link-btn" onClick={() => setSelected(columns)}>
            Select all
          </button>
          <button className="link-btn" onClick={() => setSelected([])}>
            Clear
          </button>
          <span className="export-count">{selected.length} selected</span>
        </div>
        <div className="column-grid export-column-grid">
          {columns.map((col) => (
            <button
              key={col}
              className={`column-chip ${selected.includes(col) ? "selected" : ""}`}
              onClick={() => toggleColumn(col)}
            >
              {col}
            </button>
          ))}
        </div>

        {/* ── 2. Formats (multi-select) ── */}
        <p className="modal-hint">2. Choose one or more output formats</p>
        <div className="format-grid">
          {EXPORT_FORMATS.map((fmt) => {
            const on = formats.includes(fmt.key);
            return (
              <button
                key={fmt.key}
                className={`format-chip ${on ? "selected" : ""}`}
                onClick={() => toggleFormat(fmt.key)}
                title={fmt.hint}
              >
                <span className="format-chip-label">
                  {on ? "☑" : "☐"} {fmt.label}
                </span>
                <span className="format-chip-hint">
                  {fmt.script ? `${fmt.hint} (.py)` : `${fmt.hint} (.${fmt.key === "json" ? "json" : "csv"})`}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── 3. Grouping ── */}
        <p className="modal-hint">3. How should the files be grouped?</p>
        <div className="radio-row">
          <label className="radio-option">
            <input type="radio" checked={combine} onChange={() => setCombine(true)} />
            <span>All columns together (one file per format)</span>
          </label>
          <label className="radio-option">
            <input type="radio" checked={!combine} onChange={() => setCombine(false)} />
            <span>One file per column ({selected.length} × {formats.length} files)</span>
          </label>
        </div>

        {/* ── 4. Options ── */}
        <div className="extra-params export-options">
          {formats.includes("json") && (
            <label>
              JSON shape:
              <select value={jsonOrient} onChange={(e) => setJsonOrient(e.target.value)}>
                <option value="records">records — [{"{ col: value }"}]</option>
                <option value="columns">columns — {"{ col: [values] }"}</option>
              </select>
            </label>
          )}
          {wantsScript && (
            <label>
              Script data source:
              <select value={pythonSource} onChange={(e) => setPythonSource(e.target.value)}>
                <option value="inline">embed data in the script</option>
                <option value="csv">read the exported CSV</option>
                <option value="json">read the exported JSON</option>
              </select>
            </label>
          )}
          {wantsScript && (
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={includeStats}
                onChange={(e) => setIncludeStats(e.target.checked)}
              />
              Include summary stats in the script
            </label>
          )}
        </div>

        {pythonSource !== "inline" && wantsScript && !formats.includes("csv") && !formats.includes("json") && (
          <p className="export-warning">
            The script reads an exported file — also tick CSV or JSON so that file exists.
          </p>
        )}

        {/* ── File list + preview ── */}
        <div className="export-filelist">
          {files.map((file) => (
            <span key={file.filename} className="export-file-chip">
              {file.filename}
            </span>
          ))}
          {files.length === 0 && <span className="export-empty">Nothing selected yet</span>}
        </div>

        {preview && (
          <details className="export-preview-box">
            <summary>Preview {files[0]?.filename}</summary>
            <pre className="export-preview">{preview}</pre>
          </details>
        )}

        {message && <p className="export-message">{message}</p>}

        <div className="export-actions">
          <button className="secondary-btn" onClick={handleCopy} disabled={!files.length}>
            Copy
          </button>
          <button
            className="primary-btn"
            onClick={handleDownload}
            disabled={!files.length || busy}
          >
            {busy
              ? "Downloading…"
              : `Download ${files.length} file${files.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportColumnsModal;
