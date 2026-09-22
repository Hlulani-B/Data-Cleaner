/* JSON exporter — writes the selected columns as JSON payloads. */

import { columnValues, pickColumns, sanitizeFileName } from "./exportCommon";

const JSON_MIME = "application/json;charset=utf-8";

/**
 * Serialise rows + columns into a JSON string.
 *
 * orient "records": [{ "price": 12, "total": 30 }, ...]   (pandas .to_dict("records"))
 * orient "columns": { "price": [12, ...], "total": [30, ...] }
 */
export function rowsToJson(rows, columns, { orient = "records", indent = 2 } = {}) {
  if (orient === "columns") {
    const out = {};
    for (const col of columns) out[col] = columnValues(rows, col);
    return JSON.stringify(out, null, indent);
  }
  return JSON.stringify(pickColumns(rows, columns), null, indent);
}

/**
 * Build the JSON download(s) for a column selection.
 *
 * @param {object[]} rows
 * @param {string[]} columns
 * @param {object}   options
 * @param {boolean}  options.combine  true -> one file with every selected column
 *                                    false -> one JSON file per column
 * @param {"records"|"columns"} options.orient
 * @param {number}   options.indent
 * @param {string}   options.baseName
 * @returns {{filename: string, content: string, mime: string}[]}
 */
export function buildJsonFiles(rows, columns, options = {}) {
  const { combine = true, orient = "records", indent = 2, baseName = "export" } = options;
  const cols = columns || [];

  if (cols.length === 0) return [];

  if (combine) {
    return [
      {
        filename: `${sanitizeFileName(baseName)}_combined.json`,
        content: rowsToJson(rows, cols, { orient, indent }),
        mime: JSON_MIME,
      },
    ];
  }

  return cols.map((col) => ({
    filename: `${sanitizeFileName(baseName)}_${sanitizeFileName(col)}.json`,
    content: rowsToJson(rows, [col], { orient, indent }),
    mime: JSON_MIME,
  }));
}
