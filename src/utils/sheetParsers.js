import * as XLSX from "xlsx";

/* ─── 2-D sheet parsing helpers: every sheet becomes an array of objects ─── */

const MAX_COLS = 1000;
const MAX_ROWS = 200000;

/** Clamp a worksheet's !ref so SheetJS never enumerates a mega-range. */
export function clampSheetRange(sheet, maxCols = MAX_COLS, maxRows = MAX_ROWS) {
  if (!sheet["!ref"]) return;
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  let changed = false;
  if (range.e.c >= maxCols) {
    range.e.c = maxCols - 1;
    changed = true;
  }
  if (range.e.r >= maxRows) {
    range.e.r = maxRows - 1;
    changed = true;
  }
  if (changed) {
    sheet["!ref"] = XLSX.utils.encode_range(range);
  }
}

/** Read a sheet as a clean 2-D array of strings (rows → cells). */
export function sheetTo2DArray(sheet) {
  clampSheetRange(sheet);
  const raw = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => (Array.isArray(row) ? row : [row]));
}

/** Drop trailing empty columns and fully empty rows from a 2-D array. */
export function trim2DArray(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  // Find the rightmost cell that contains data in any row.
  let lastCol = 0;
  for (const row of rows) {
    for (let i = row.length - 1; i >= 0; i--) {
      const val = row[i];
      if (val !== "" && val != null) {
        if (i + 1 > lastCol) lastCol = i + 1;
        break;
      }
    }
  }

  // Trim/pad every row to the same width and drop empty rows.
  return rows
    .map((row) => {
      const trimmed = row.slice(0, lastCol);
      while (trimmed.length < lastCol) trimmed.push("");
      return trimmed;
    })
    .filter((row) => row.some((v) => v !== "" && v != null));
}

/** Build unique, non-empty headers from the first row of a 2-D array. */
export function buildHeaders(firstRow) {
  const seen = new Set();
  return (firstRow || []).map((cell, i) => {
    let h = String(cell ?? "").trim();
    if (!h) h = `Column_${i + 1}`;
    let unique = h;
    let counter = 2;
    while (seen.has(unique)) {
      unique = `${h}_${counter}`;
      counter++;
    }
    seen.add(unique);
    return unique;
  });
}

/** Convert a 2-D array into the app's expected array-of-objects shape. */
export function array2DToObjects(rows) {
  const clean = trim2DArray(rows);
  if (clean.length === 0) return [];

  const headers = buildHeaders(clean[0]);
  return clean.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? "";
    });
    return obj;
  });
}

/** Coerce any parsed value into a 2-D array of primitives. */
export function coerceTo2D(value) {
  if (Array.isArray(value)) {
    return value.map((row) =>
      Array.isArray(row)
        ? row.map((cell) => (cell == null ? "" : String(cell)))
        : [row == null ? "" : String(row)]
    );
  }
  if (value && typeof value === "object") {
    // Single object: turn each property into one row of two columns.
    return Object.entries(value).map(([k, v]) => [String(k), v == null ? "" : String(v)]);
  }
  return [[value == null ? "" : String(value)]];
}

/** Parse a SheetJS worksheet into a consistent array of row objects. */
export function parseWorksheet(sheet) {
  try {
    const rows2D = sheetTo2DArray(sheet);
    return array2DToObjects(rows2D);
  } catch {
    // Last resort: read every cell manually and coerce to 2-D.
    const fallback = [];
    if (sheet["!ref"]) {
      const range = XLSX.utils.decode_range(sheet["!ref"]);
      for (let r = range.s.r; r <= Math.min(range.e.r, MAX_ROWS - 1); r++) {
        const row = [];
        for (let c = range.s.c; c <= Math.min(range.e.c, MAX_COLS - 1); c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = sheet[addr];
          row.push(cell?.v == null ? "" : String(cell.v));
        }
        fallback.push(row);
      }
    }
    return array2DToObjects(coerceTo2D(fallback));
  }
}
