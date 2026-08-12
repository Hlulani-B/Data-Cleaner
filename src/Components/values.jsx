import { useState } from "react";
import * as XLSX from "xlsx";
import { Values } from "../functions/user_choice/getValues";

const valuesOps = new Values();

const MODES = [
  { key: "getValues", label: "Get Unique Values", desc: "Show every distinct value in a column" },
  { key: "replaceValues", label: "Replace Value", desc: "Replace an exact cell value with another" },
  { key: "rewrite", label: "Rewrite (Substring)", desc: "Replace a substring inside cell values" },
  { key: "removeRowWithValue", label: "Remove Row by Value", desc: "Delete rows where a column matches a value" },
];

export default function ValuesPanel({ data, columns, onChange }) {
  const [mode, setMode] = useState("getValues");
  const [column, setColumn] = useState("");
  const [findValue, setFindValue] = useState("");
  const [replaceWith, setReplaceWith] = useState("");
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");

  const resetResult = () => {
    setResult(null);
    setMessage("");
  };

  const handleColumnChange = (e) => {
    setColumn(e.target.value);
    resetResult();
  };

  const handleModeChange = (next) => {
    setMode(next);
    resetResult();
  };

  const handleGetValues = () => {
    if (!column) {
      setMessage("Please choose a column first.");
      return;
    }
    const sheet = XLSX.utils.json_to_sheet(data);
    const unique = valuesOps.getValues(sheet, column);
    setResult({ type: "values", column, values: unique });
    setMessage("");
  };

  const handleApply = () => {
    if (!column) {
      setMessage("Please choose a column first.");
      return;
    }
    if (mode !== "getValues" && findValue === "") {
      setMessage("Please enter the value to match.");
      return;
    }

    const sheet = XLSX.utils.json_to_sheet(data);
    let nextSheet;
    let summary = "";

    if (mode === "replaceValues") {
      nextSheet = valuesOps.replaceValues(sheet, column, findValue, replaceWith);
      summary = `Replaced "${findValue}" with "${replaceWith}" in ${column}`;
    } else if (mode === "rewrite") {
      nextSheet = valuesOps.rewrite(sheet, column, findValue, replaceWith);
      summary = `Rewrote "${findValue}" to "${replaceWith}" in ${column}`;
    } else if (mode === "removeRowWithValue") {
      nextSheet = valuesOps.removeRowWithValue(sheet, column, findValue);
      summary = `Removed rows where ${column} equals "${findValue}"`;
    } else {
      return;
    }

    const nextData = XLSX.utils.sheet_to_json(nextSheet, { defval: "" });
    onChange(nextData, summary);
    setMessage(summary);
    setResult(null);
  };

  return (
    <div className="values-panel">
      <h3 className="section-heading">Values</h3>

      <div className="values-modes">
        {MODES.map((m) => (
          <button
            key={m.key}
            className={`mode-chip ${mode === m.key ? "active" : ""}`}
            onClick={() => handleModeChange(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="mode-desc">{MODES.find((m) => m.key === mode)?.desc}</p>

      <div className="values-controls">
        <label>
          Column:
          <select value={column} onChange={handleColumnChange}>
            <option value="">Select a column</option>
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </label>

        {mode !== "getValues" && (
          <>
            <label>
              {mode === "removeRowWithValue" ? "Remove rows where value equals:" : "Find:"}
              <input
                type="text"
                value={findValue}
                onChange={(e) => setFindValue(e.target.value)}
                placeholder="Value to match"
              />
            </label>

            {mode !== "removeRowWithValue" && (
              <label>
                Replace with:
                <input
                  type="text"
                  value={replaceWith}
                  onChange={(e) => setReplaceWith(e.target.value)}
                  placeholder="New value"
                />
              </label>
            )}
          </>
        )}

        {mode === "getValues" ? (
          <button className="primary-btn" onClick={handleGetValues} disabled={!column}>
            Show Unique Values
          </button>
        ) : (
          <button className="primary-btn" onClick={handleApply} disabled={!column || findValue === ""}>
            Apply
          </button>
        )}
      </div>

      {message && <p className="values-message">{message}</p>}

      {result?.type === "values" && (
        <div className="values-result">
          <strong>Unique values in {result.column}</strong>
          <div className="values-list">
            {result.values.length > 0 ? (
              result.values.map((val, i) => (
                <span key={i} className="value-badge">
                  {String(val)}
                </span>
              ))
            ) : (
              <span className="value-badge empty">No values found</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
