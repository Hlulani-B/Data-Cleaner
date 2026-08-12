import { useState, useMemo } from "react";

/**
 * EmptyValues — inspect, highlight, and remove rows with empty/missing values.
 *
 * Props:
 *   data      — array of row objects (the current sheet data)
 *   onUpdate  — callback(newData) after rows are removed
 *   onBack    — optional callback to go back / close
 */
export default function EmptyValues({ data, onUpdate, onBack }) {
  const [selectedRows, setSelectedRows] = useState(new Set());

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  // Find rows with at least one empty cell
  const { emptyRowIndices, emptyCellMap, stats } = useMemo(() => {
    const indices = [];
    const cellMap = {}; // "row-col" → true if empty
    let totalEmptyCells = 0;
    let fullyEmptyRows = 0;

    data.forEach((row, i) => {
      let rowHasEmpty = false;
      let rowAllEmpty = true;

      columns.forEach((col) => {
        const val = row[col];
        const isEmpty = val === undefined || val === null || val === "" ||
                        (typeof val === "string" && val.trim() === "");
        if (isEmpty) {
          cellMap[`${i}-${col}`] = true;
          totalEmptyCells++;
          rowHasEmpty = true;
        } else {
          rowAllEmpty = false;
        }
      });

      if (rowHasEmpty) indices.push(i);
      if (rowAllEmpty) fullyEmptyRows++;
    });

    return {
      emptyRowIndices: indices,
      emptyCellMap: cellMap,
      stats: {
        totalRows: data.length,
        rowsWithEmpty: indices.length,
        fullyEmptyRows,
        totalEmptyCells,
      },
    };
  }, [data, columns]);

  const toggleRow = (idx) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAllEmpty = () => {
    setSelectedRows(new Set(emptyRowIndices));
  };

  const selectFullyEmpty = () => {
    const fullyEmpty = new Set();
    data.forEach((row, i) => {
      const allEmpty = columns.every((col) => {
        const val = row[col];
        return val === undefined || val === null || val === "" ||
               (typeof val === "string" && val.trim() === "");
      });
      if (allEmpty) fullyEmpty.add(i);
    });
    setSelectedRows(fullyEmpty);
  };

  const clearSelection = () => setSelectedRows(new Set());

  const removeSelected = () => {
    if (selectedRows.size === 0) return;
    const newData = data.filter((_, i) => !selectedRows.has(i));
    setSelectedRows(new Set());
    onUpdate(newData);
  };

  const removeAllEmpty = () => {
    const newData = data.filter((row) =>
      columns.some((col) => {
        const val = row[col];
        return val !== undefined && val !== null && val !== "" &&
               !(typeof val === "string" && val.trim() === "");
      })
    );
    setSelectedRows(new Set());
    onUpdate(newData);
  };

  return (
    <div className="empty-values-wrap">
      {/* Header */}
      <div className="ev-header">
        <h3 className="section-heading">Empty & Missing Values</h3>
        {onBack && (
          <button className="ev-back-btn" onClick={onBack}>&larr; Back</button>
        )}
      </div>

      {/* Stats */}
      <div className="ev-stats">
        <span className="ev-stat">
          <strong>{stats.totalRows}</strong> total rows
        </span>
        <span className="ev-stat warn">
          <strong>{stats.rowsWithEmpty}</strong> rows with empty cells
        </span>
        <span className="ev-stat danger">
          <strong>{stats.fullyEmptyRows}</strong> fully empty rows
        </span>
        <span className="ev-stat">
          <strong>{stats.totalEmptyCells}</strong> empty cells total
        </span>
      </div>

      {/* Actions */}
      <div className="ev-actions">
        <button className="ev-btn" onClick={selectAllEmpty}>
          Select all rows with empties
        </button>
        <button className="ev-btn" onClick={selectFullyEmpty}>
          Select fully empty rows only
        </button>
        <button className="ev-btn" onClick={clearSelection} disabled={selectedRows.size === 0}>
          Clear selection
        </button>
        <button
          className="ev-btn ev-btn-danger"
          onClick={removeSelected}
          disabled={selectedRows.size === 0}
        >
          Remove {selectedRows.size > 0 ? `${selectedRows.size} selected` : "selected"} rows
        </button>
        <button
          className="ev-btn ev-btn-danger"
          onClick={removeAllEmpty}
          disabled={stats.rowsWithEmpty === 0}
        >
          Remove all empty rows
        </button>
      </div>

      {/* Table */}
      <div className="table-wrap">
        {data.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th className="ev-check-col">#</th>
                {columns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const hasEmpty = emptyRowIndices.includes(i);
                const isSelected = selectedRows.has(i);
                return (
                  <tr
                    key={i}
                    className={`${hasEmpty ? "ev-row-empty" : ""} ${isSelected ? "ev-row-selected" : ""}`}
                    onClick={() => hasEmpty && toggleRow(i)}
                    style={{ cursor: hasEmpty ? "pointer" : "default" }}
                  >
                    <td className="ev-check-col">
                      {hasEmpty && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(i)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col}
                        className={emptyCellMap[`${i}-${col}`] ? "ev-cell-empty" : ""}
                      >
                        {row[col] != null ? String(row[col]) : ""}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="empty-msg">No data to display</p>
        )}
        {data.length > 50 && (
          <p className="truncation-note">Showing all {data.length} rows</p>
        )}
      </div>
    </div>
  );
}
