import { useState } from "react";
import { getOverview } from "../functions/user_choice/getOverview";

/* A small pill showing a type name + how many cells had it. */
function TypePill({ kind, count }) {
  return (
    <span className={`ov-type ov-type-${kind}`}>
      {kind} <em>{count}</em>
    </span>
  );
}

/**
 * Overview — read-only dataset inspector.
 * Shows detected value types per column, null / empty values per column,
 * and duplicate values (both whole-row and per-column).
 *
 * Props:
 *   data     — array of row objects (current sheet data)
 *   onClose  — close handler
 */
export default function Overview({ data, onClose }) {
  const overview = getOverview(data);
  const [tab, setTab] = useState("columns"); // columns | nulls | duplicates

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal overview-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Dataset Overview</h3>

        <div className="ov-summary">
          <div className="ov-stat">
            <span className="ov-stat-num">{overview.totalRows.toLocaleString()}</span>
            <span className="ov-stat-label">rows</span>
          </div>
          <div className="ov-stat">
            <span className="ov-stat-num">{overview.totalColumns}</span>
            <span className="ov-stat-label">columns</span>
          </div>
          <div className={`ov-stat ${overview.nullValues.clean ? "" : "warn"}`}>
            <span className="ov-stat-num">{overview.nullValues.total}</span>
            <span className="ov-stat-label">null / empty cells</span>
          </div>
          <div className={`ov-stat ${overview.duplicates.rowCount ? "warn" : ""}`}>
            <span className="ov-stat-num">{overview.duplicates.rowCount}</span>
            <span className="ov-stat-label">duplicate rows</span>
          </div>
        </div>

        <div className="ov-tabs">
          <button className={`ov-tab ${tab === "columns" ? "active" : ""}`} onClick={() => setTab("columns")}>
            Column Types
          </button>
          <button className={`ov-tab ${tab === "nulls" ? "active" : ""}`} onClick={() => setTab("nulls")}>
            Null Values ({overview.nullValues.columns.length})
          </button>
          <button className={`ov-tab ${tab === "duplicates" ? "active" : ""}`} onClick={() => setTab("duplicates")}>
            Duplicates
          </button>
        </div>

        <div className="ov-body">
          {overview.totalRows === 0 && <p className="empty-msg">No data to analyse yet.</p>}

          {tab === "columns" && overview.totalRows > 0 && (
            <table className="ov-table">
              <thead>
                <tr>
                  <th>Column</th>
                  <th>Detected types</th>
                  <th>Unique</th>
                  <th>Nulls</th>
                </tr>
              </thead>
              <tbody>
                {overview.columns.map((c) => (
                  <tr key={c.column}>
                    <td className="ov-col-name">{c.column}</td>
                    <td>
                      <span className="ov-types">
                        {Object.entries(c.typeCounts).map(([kind, count]) => (
                          <TypePill key={kind} kind={kind} count={count} />
                        ))}
                      </span>
                      {c.isMixed && <span className="ov-mixed-flag">mixed types</span>}
                    </td>
                    <td>{c.uniqueCount.toLocaleString()}</td>
                    <td className={c.nullCount ? "ov-warn-cell" : ""}>
                      {c.nullCount} ({c.nullPercent}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "nulls" && overview.totalRows > 0 && (
            overview.nullValues.clean ? (
              <p className="ov-clean">✓ No null or empty values detected in any column.</p>
            ) : (
              <ul className="ov-list">
                {overview.nullValues.columns.map((c) => (
                  <li key={c.column}>
                    <strong>{c.column}</strong> — {c.count} empty cell{c.count === 1 ? "" : "s"} ({c.percent}%)
                  </li>
                ))}
              </ul>
            )
          )}

          {tab === "duplicates" && overview.totalRows > 0 && (
            overview.duplicates.clean ? (
              <p className="ov-clean">✓ No duplicate rows or repeated values detected.</p>
            ) : (
              <>
                {overview.duplicates.rowCount > 0 && (
                  <div className="ov-block">
                    <h4 className="ov-block-title">
                      Duplicate rows — {overview.duplicates.rowCount} extra copies in {overview.duplicates.rowGroups.length} group(s)
                    </h4>
                    <p className="ov-hint">Rows that appear more than once (identical across all columns):</p>
                    <ul className="ov-list">
                      {overview.duplicates.rowGroups.map((g, i) => (
                        <li key={i}>
                          <span className="ov-dup-count">×{g.count}</span>{" "}
                          {g.sample.map((v) => (v === null ? "∅" : v)).join(" | ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {overview.duplicates.columns.length > 0 && (
                  <div className="ov-block">
                    <h4 className="ov-block-title">Repeated values per column</h4>
                    <ul className="ov-list">
                      {overview.duplicates.columns.map((c) => (
                        <li key={c.column}>
                          <strong>{c.column}</strong> — {c.count} repeated value{c.count === 1 ? "" : "s"}:{" "}
                          {c.groups.map((g) => `${g.value} (×${g.count})`).join(", ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )
          )}
        </div>

        <button className="modal-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
