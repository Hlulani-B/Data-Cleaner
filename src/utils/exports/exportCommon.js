/* Shared helpers for the column exporters (JSON / CSV / Python scripts). */

/**
 * Turn arbitrary text into a safe file-name slug.
 * Keeps letters, digits, dashes and underscores; collapses the rest.
 */
export function sanitizeFileName(name) {
  const slug = String(name ?? "")
    .trim()
    .replace(/[^\w\-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return slug || "column";
}

/** Strip a known upload extension so "sales.xlsx" becomes "sales". */
export function baseNameFromFile(filename) {
  return sanitizeFileName(String(filename || "export").replace(/\.(csv|xlsx|xls|json)$/i, ""));
}

/** Project rows down to the requested columns (missing cells become null). */
export function pickColumns(rows, columns) {
  return (rows || []).map((row) => {
    const out = {};
    for (const col of columns) out[col] = row[col] === undefined ? null : row[col];
    return out;
  });
}

/** Pull one column's values out of the rows, preserving row order. */
export function columnValues(rows, column) {
  return (rows || []).map((row) => (row[column] === undefined ? null : row[column]));
}

/**
 * Rough dtype guess used by the Python exporters.
 * Returns "int64", "float64", "bool" or "object".
 */
export function inferPandasDtype(values) {
  const present = (values || []).filter((v) => v !== null && v !== undefined && v !== "");
  if (present.length === 0) return "object";
  if (present.every((v) => typeof v === "boolean")) return "bool";
  if (present.every((v) => typeof v === "number" && Number.isFinite(v))) {
    return present.every((v) => Number.isInteger(v)) ? "int64" : "float64";
  }
  return "object";
}

/**
 * A JSON string literal, which is also a valid Python string literal.
 * JSON escapes (\", \\, \n, \uXXXX) are all legal inside a Python string.
 */
export function toPythonString(value) {
  return JSON.stringify(String(value));
}

/**
 * Download generated files in one click. Each file is saved on its own
 * (staggered anchor clicks) so no archive library is needed.
 */
export function downloadFiles(files, { staggerMs = 400 } = {}) {
  if (typeof document === "undefined" || typeof URL === "undefined" || !URL.createObjectURL) {
    throw new Error("Downloads are only available in the browser");
  }

  const list = Array.isArray(files) ? files : [files];

  return new Promise((resolve) => {
    list.forEach((file, index) => {
      setTimeout(() => {
        const blob = new Blob([file.content], { type: file.mime || "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = file.filename;
        anchor.rel = "noopener";
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        if (index === list.length - 1) resolve(list.length);
      }, index * staggerMs);
    });
  });
}
