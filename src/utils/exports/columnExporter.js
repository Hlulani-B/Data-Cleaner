/*
 * Column export orchestrator — one place that turns a format selection into
 * the concrete files the "Export Columns" modal offers for download.
 */

import { buildCsvFiles } from "./csvExport";
import { buildJsonFiles } from "./jsonExport";
import { buildPythonFiles } from "./pythonExport";
import { baseNameFromFile } from "./exportCommon";

export { downloadFiles } from "./exportCommon";

/** Formats offered in the UI. `script: true` means "returns code, not data". */
export const EXPORT_FORMATS = [
  { key: "csv", label: "CSV", hint: "Spreadsheet-ready table", script: false },
  { key: "json", label: "JSON", hint: "Records or column arrays", script: false },
  { key: "pandas", label: "Pandas script", hint: "Python .py using pandas", script: true },
  { key: "numpy", label: "NumPy script", hint: "Python .py using numpy arrays", script: true },
];

/**
 * Build every requested file for the current selection.
 *
 * @param {object[]} rows      dataset rows
 * @param {string[]} columns   selected columns
 * @param {object}   options
 * @param {string[]} options.formats    any of csv | json | pandas | numpy
 * @param {boolean}  options.combine    true -> one file per format
 *                                       false -> one file per column per format
 * @param {"records"|"columns"} options.jsonOrient
 * @param {"inline"|"csv"|"json"} options.pythonSource  how the script loads data
 * @param {boolean} options.includeStats
 * @param {string}  options.filename    original upload name (used as file prefix)
 */
export function buildExportFiles(rows, columns, options = {}) {
  const {
    formats = ["csv"],
    combine = true,
    jsonOrient = "records",
    pythonSource = "inline",
    includeStats = true,
    filename = "export",
  } = options;

  const baseName = baseNameFromFile(filename);
  const cols = columns || [];
  if (!cols.length) return [];

  const files = [];

  if (formats.includes("csv")) {
    files.push(...buildCsvFiles(rows, cols, { combine, baseName }));
  }

  if (formats.includes("json")) {
    files.push(...buildJsonFiles(rows, cols, { combine, baseName, orient: jsonOrient }));
  }

  if (formats.includes("pandas")) {
    files.push(
      ...buildPythonFiles(rows, cols, {
        combine,
        baseName,
        library: "pandas",
        source: pythonSource,
        includeStats,
      }),
    );
  }

  if (formats.includes("numpy")) {
    files.push(
      ...buildPythonFiles(rows, cols, {
        combine,
        baseName,
        library: "numpy",
        source: pythonSource,
        includeStats,
      }),
    );
  }

  return files;
}

/** Short text preview of the first generated file (used inside the modal). */
export function previewFile(files, maxChars = 1200) {
  const first = Array.isArray(files) ? files[0] : files;
  if (!first) return "";
  const text = first.content || "";
  return text.length > maxChars ? `${text.slice(0, maxChars)}\n…` : text;
}
