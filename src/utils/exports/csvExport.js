/* CSV exporter — builds CSV payloads from the selected columns of the dataset. */

import { pickColumns, sanitizeFileName } from "./exportCommon";

const CSV_MIME = "text/csv;charset=utf-8";

/** Quote a cell only when it contains a comma, quote or newline. */
export function toCsvCell(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/** Build a CSV table (header + rows) for the given columns. */
export function rowsToCsv(rows, columns) {
  const header = columns.map(toCsvCell).join(",");
  const lines = (rows || []).map((row) => columns.map((col) => toCsvCell(row[col])).join(","));
  return [header, ...lines].join("\n");
}

/**
 * Build the CSV download(s) for a column selection.
 *
 * @param {object[]} rows      full dataset (array of row objects)
 * @param {string[]} columns   columns to export
 * @param {object}   options
 * @param {boolean}  options.combine  true  -> one file holding all columns
 *                                    false -> one CSV file per column
 * @param {string}   options.baseName file-name prefix (usually the upload name)
 * @returns {{filename: string, content: string, mime: string}[]}
 */
export function buildCsvFiles(rows, columns, options = {}) {
  const { combine = true, baseName = "export" } = options;
  const cols = columns || [];

  if (cols.length === 0) return [];

  if (combine) {
    return [
      {
        filename: `${sanitizeFileName(baseName)}_combined.csv`,
        content: rowsToCsv(pickColumns(rows, cols), cols),
        mime: CSV_MIME,
      },
    ];
  }

  return cols.map((col) => ({
    filename: `${sanitizeFileName(baseName)}_${sanitizeFileName(col)}.csv`,
    content: rowsToCsv(rows, [col]),
    mime: CSV_MIME,
  }));
}
