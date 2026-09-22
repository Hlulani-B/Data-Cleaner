/*
 * Dataset Overview — a read-only analysis that walks every column and reports:
 *   • detected value types per column (int, float, string, boolean, date, null/empty)
 *   • null / empty values per column (count + percentage)
 *   • duplicate rows (count) and duplicate values per column
 * The result is a plain summary object rendered by the UI inspector.
 */

/** Classify a single cell into one of the value-type buckets. */
export function classifyValue(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string" && value.trim() === "") return "empty";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") {
    if (Number.isNaN(value) || !Number.isFinite(value)) return "invalid";
    return Number.isInteger(value) ? "int" : "float";
  }
  if (value instanceof Date) return "date";
  if (typeof value === "string") {
    const t = value.trim();
    // a numeric string that survives Number() is still a string here — data
    // typing happens after the initial clean, but mixed columns should show it.
    if (/^-?\d+$/.test(t)) return "int";
    if (/^-?\d*\.\d+$/.test(t)) return "float";
    return "string";
  }
  return "string";
}

/** True when a cell should be counted as null / missing. */
function isBlank(value) {
  const kind = classifyValue(value);
  return kind === "null" || kind === "empty";
}

/** Count how many times each stringified cell appears, skipping blanks. */
function tally(values) {
  const counts = new Map();
  for (const v of values) {
    if (isBlank(v)) continue;
    const key = String(v).trim();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

/** Stable key for a whole row, used for duplicate-row detection. */
function rowKey(row, columns) {
  return JSON.stringify(columns.map((c) => (row[c] === undefined ? null : String(row[c]).trim())));
}

/**
 * Build the overview for a parsed dataset.
 *
 * @param {object[]} data   array of row objects
 * @returns {{
 *   totalRows: number, totalColumns: number, columns: object[],
 *   nullValues: { total: number, columns: object[], clean: boolean },
 *   duplicates: { rowCount: number, rowGroups: object[], columns: object[] },
 * }}
 */
export function getOverview(data) {
  const rows = Array.isArray(data) ? data : [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  // Column summaries — types, nulls, duplicates, unique counts
  const columnReports = columns.map((col) => {
    const values = rows.map((row) => row[col]);

    const typeCounts = {};
    let blankCount = 0;
    for (const v of values) {
      const kind = classifyValue(v);
      typeCounts[kind] = (typeCounts[kind] || 0) + 1;
      if (kind === "null" || kind === "empty") blankCount += 1;
    }

    const valueCounts = tally(values);
    const dupValueGroups = [...valueCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
    // surplus copies beyond the first occurrence
    const duplicateValueCount = dupValueGroups.reduce((sum, g) => sum + (g.count - 1), 0);

    const kinds = Object.keys(typeCounts).filter((k) => k !== "null" && k !== "empty");

    return {
      column: col,
      typeCounts,
      // e.g. "int, string" — the data types actually present in this column
      types: kinds.length > 0 ? kinds.join(", ") : "empty",
      isMixed: kinds.length > 1,
      nullCount: blankCount,
      nullPercent: rows.length ? Math.round((blankCount / rows.length) * 100) : 0,
      uniqueCount: valueCounts.size,
      duplicateValueGroups: dupValueGroups.slice(0, 5),
      duplicateValueCount,
    };
  });

  // Row-level duplicates (whole row identical across all columns)
  const keyCounts = new Map();
  for (const row of rows) {
    const key = rowKey(row, columns);
    keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
  }
  const rowGroups = [...keyCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => ({ key, count, sample: JSON.parse(key) }));
  const duplicateRowCount = rowGroups.reduce((sum, g) => sum + (g.count - 1), 0);

  // Roll up all null columns into one block so the UI can flag "no nulls"
  const nullColumns = columnReports
    .filter((c) => c.nullCount > 0)
    .map((c) => ({ column: c.column, count: c.nullCount, percent: c.nullPercent }));
  const totalNulls = nullColumns.reduce((sum, c) => sum + c.count, 0);

  // Which columns have duplicate values
  const dupColumns = columnReports
    .filter((c) => c.duplicateValueCount > 0)
    .map((c) => ({ column: c.column, count: c.duplicateValueCount, groups: c.duplicateValueGroups }));

  return {
    totalRows: rows.length,
    totalColumns: columns.length,
    columns: columnReports,
    nullValues: {
      total: totalNulls,
      columns: nullColumns,
      clean: totalNulls === 0,
    },
    duplicates: {
      rowCount: duplicateRowCount,
      rowGroups: rowGroups.slice(0, 20),
      columns: dupColumns,
      clean: duplicateRowCount === 0 && dupColumns.length === 0,
    },
  };
}

export default getOverview;
