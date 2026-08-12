/* ─── Client-side cleaning utilities (mirror the api/functions/ logic) ─── */

/** Trim: remove leading/trailing spaces, collapse internal spaces */
export function trimData(data) {
  if (data.length === 0) return data;
  return data.map((row) => {
    const out = { ...row };
    for (const key of Object.keys(out)) {
      if (typeof out[key] === "string") {
        let v = out[key];
        while (v.length > 0 && v[0] === " ") v = v.slice(1);
        while (v.length > 0 && v[v.length - 1] === " ") v = v.slice(0, -1);
        v = v.replace(/ {2,}/g, " ");
        out[key] = v;
      }
    }
    return out;
  });
}

/** Clean: trim strings, remove fully-empty rows, empty string → null */
export function cleanData(data) {
  if (data.length === 0) return data;

  // 1. Trim every string value (but don't convert to null yet).
  const trimmed = data.map((row) => {
    const out = { ...row };
    for (const col of Object.keys(out)) {
      if (typeof out[col] === "string") {
        out[col] = out[col].trim();
      }
    }
    return out;
  });

  // 2. Drop rows that are completely empty after trimming.
  const filtered = trimmed.filter((row) =>
    Object.values(row).some((v) => v !== undefined && v !== null && v !== "")
  );

  // 3. Convert any remaining empty strings to null.
  return filtered.map((row) => {
    const out = { ...row };
    for (const col of Object.keys(out)) {
      if (out[col] === "") out[col] = null;
    }
    return out;
  });
}

/** Remove exact duplicate rows */
export function removeDuplicates(data) {
  const seen = new Set();
  return data.filter((row) => {
    const key = JSON.stringify(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Datatype: coerce numeric-string columns to numbers */
export function detectDatatypes(data) {
  if (data.length === 0) return data;
  const columns = Object.keys(data[0]);
  return data.map((row) => {
    const out = { ...row };
    for (const col of columns) {
      const allNumeric = data.every((r) => {
        const v = r[col];
        if (v === undefined || v === null || v === "") return true;
        return typeof v === "string" && !isNaN(Number(v)) && v.trim() !== "";
      });
      if (allNumeric && out[col] !== undefined && out[col] !== null && out[col] !== "") {
        out[col] = Number(out[col]);
      }
    }
    return out;
  });
}

/** Remove rows where every value is empty */
export function removeEmptyRows(data) {
  return data.filter((row) =>
    Object.values(row).some((v) => v !== undefined && v !== null && v !== "")
  );
}

/** Fill empty cells in a column using mean, median, or a custom value. */
export function fillEmptyValues(data, column, strategy = "value", customValue = "") {
  if (data.length === 0) return data;

  const isEmpty = (v) => v === undefined || v === null || v === "" || (typeof v === "string" && v.trim() === "");

  let fillWith;
  if (strategy === "mean" || strategy === "median") {
    const nums = data
      .map((row) => row[column])
      .filter((v) => !isEmpty(v))
      .map((v) => Number(v))
      .filter((n) => !isNaN(n));
    if (nums.length === 0) {
      // No numeric values to compute from; fall back to the custom value.
      fillWith = customValue;
    } else if (strategy === "mean") {
      const sum = nums.reduce((a, b) => a + b, 0);
      fillWith = sum / nums.length;
    } else {
      const sorted = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      fillWith = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    }
  } else {
    fillWith = customValue;
  }

  return data.map((row) => {
    if (isEmpty(row[column])) {
      return { ...row, [column]: fillWith };
    }
    return { ...row };
  });
}

/** Lowercase a column */
export function lowercaseColumn(data, column) {
  return data.map((row) => {
    const out = { ...row };
    if (typeof out[column] === "string") out[column] = out[column].toLowerCase();
    return out;
  });
}

/** Uppercase a column */
export function uppercaseColumn(data, column) {
  return data.map((row) => {
    const out = { ...row };
    if (typeof out[column] === "string") out[column] = out[column].toUpperCase();
    return out;
  });
}

/** Proper case a column */
export function properCaseColumn(data, column) {
  return data.map((row) => {
    const out = { ...row };
    if (typeof out[column] === "string") {
      out[column] = out[column]
        .split(" ")
        .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
        .join(" ");
    }
    return out;
  });
}

/** Remove a column */
export function removeColumn(data, column) {
  return data.map((row) => {
    const out = { ...row };
    delete out[column];
    return out;
  });
}

/** Standardize dates in a column */
export function standardizeDates(data, column, format = "YYYY-MM-DD") {
  return data.map((row) => {
    const out = { ...row };
    const val = out[column];
    if (typeof val !== "string" || val.trim() === "") return out;
    const date = new Date(val);
    if (isNaN(date.getTime())) return out;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    switch (format) {
      case "YYYY-MM-DD":
        out[column] = `${yyyy}-${mm}-${dd}`;
        break;
      case "MM/DD/YYYY":
        out[column] = `${mm}/${dd}/${yyyy}`;
        break;
      case "DD-MM-YYYY":
        out[column] = `${dd}-${mm}-${yyyy}`;
        break;
      default:
        out[column] = `${yyyy}-${mm}-${dd}`;
    }
    return out;
  });
}

/** Split a column into two columns by delimiter */
export function splitColumn(data, column, delimiter, occurrence, newCol1, newCol2) {
  return data.map((row) => {
    const out = { ...row };
    const original = String(out[column] ?? "");
    const parts = original.split(delimiter);

    if (parts.length > occurrence) {
      out[newCol1] = parts.slice(0, occurrence).join(delimiter);
      out[newCol2] = parts.slice(occurrence).join(delimiter);
    } else {
      out[newCol1] = original;
      out[newCol2] = "";
    }

    return out;
  });
}

/** Join multiple columns into one with a delimiter */
export function joinColumns(data, columns, newColumn, delimiter) {
  return data.map((row) => {
    const out = { ...row };
    const value = columns
      .map((col) => (Object.keys(row).includes(col) ? String(row[col] ?? "") : ""))
      .join(delimiter);
    out[newColumn] = value;
    return out;
  });
}

/** Concatenate multiple columns into one without a delimiter, with optional custom string */
export function concatenateColumns(data, columns, newColumn, customString = "") {
  return data.map((row) => {
    const out = { ...row };
    let value = "";
    columns.forEach((col) => {
      if (Object.keys(row).includes(col)) {
        value += String(row[col] ?? "");
      } else {
        value += col;
      }
    });
    if (customString) {
      value += customString;
    }
    out[newColumn] = value;
    return out;
  });
}

/** Convert column type */
export function convertType(data, column, targetType) {
  return data.map((row) => {
    const out = { ...row };
    const val = out[column];
    if (val === undefined || val === null || val === "") return out;
    switch (targetType) {
      case "number": {
        const n = Number(val);
        if (!isNaN(n)) out[column] = n;
        break;
      }
      case "string":
        out[column] = String(val);
        break;
      case "boolean":
        if (typeof val === "string") {
          out[column] = val.toLowerCase() === "true" || val === "1";
        } else {
          out[column] = Boolean(val);
        }
        break;
    }
    return out;
  });
}

/* ─── Math Operations (client-side) ─── */

/** Apply a single-column in-place math transform */
export function mathSingleInPlace(data, column, op, param) {
  return data.map((row) => {
    const out = { ...row };
    const num = Number(out[column]);
    if (isNaN(num)) return out;
    switch (op) {
      case "absolute": out[column] = Math.abs(num); break;
      case "ceil": out[column] = Math.ceil(num); break;
      case "floor": out[column] = Math.floor(num); break;
      case "negate": out[column] = -num; break;
      case "addConstant": out[column] = num + (param || 0); break;
      case "multiplyConstant": out[column] = num * (param || 1); break;
      case "round": {
        const factor = Math.pow(10, param || 0);
        out[column] = Math.round(num * factor) / factor;
        break;
      }
    }
    return out;
  });
}

/** Apply a single-column math op that writes to a new column */
export function mathSingleNewCol(data, column, newColumn, op, param) {
  return data.map((row) => {
    const out = { ...row };
    const num = Number(out[column]);
    switch (op) {
      case "squareRoot":
        out[newColumn] = (!isNaN(num) && num >= 0) ? Math.sqrt(num) : "";
        break;
      case "power":
        out[newColumn] = !isNaN(num) ? Math.pow(num, param || 2) : "";
        break;
      case "log":
        out[newColumn] = (!isNaN(num) && num > 0) ? Math.log(num) / Math.log(param || Math.E) : "";
        break;
      case "cumulativeSum":
        // handled separately below
        break;
    }
    return out;
  });
}

/** Cumulative sum — needs running total across rows */
export function mathCumulativeSum(data, column, newColumn) {
  let running = 0;
  return data.map((row) => {
    const out = { ...row };
    const num = Number(out[column]);
    if (!isNaN(num)) running += num;
    out[newColumn] = running;
    return out;
  });
}

/** Two-column math op producing a new column */
export function mathTwoColumn(data, colA, colB, newColumn, op) {
  return data.map((row) => {
    const out = { ...row };
    const a = Number(row[colA]);
    const b = Number(row[colB]);
    const valid = !isNaN(a) && !isNaN(b);
    switch (op) {
      case "add": out[newColumn] = valid ? a + b : ""; break;
      case "subtract": out[newColumn] = valid ? a - b : ""; break;
      case "multiply": out[newColumn] = valid ? a * b : ""; break;
      case "divide": out[newColumn] = (valid && b !== 0) ? a / b : ""; break;
      case "modulo": out[newColumn] = (valid && b !== 0) ? a % b : ""; break;
      case "min": out[newColumn] = valid ? Math.min(a, b) : ""; break;
      case "max": out[newColumn] = valid ? Math.max(a, b) : ""; break;
      case "percentageOf": out[newColumn] = (valid && b !== 0) ? (a / b) * 100 : ""; break;
      case "percentageChange": out[newColumn] = (valid && a !== 0) ? ((b - a) / a) * 100 : ""; break;
    }
    return out;
  });
}

/** Sum multiple columns into a new column */
export function mathSumColumns(data, columns, newColumn) {
  return data.map((row) => {
    const out = { ...row };
    let sum = 0;
    let valid = true;
    columns.forEach((col) => {
      const num = Number(row[col]);
      if (isNaN(num)) valid = false;
      else sum += num;
    });
    out[newColumn] = valid ? sum : "";
    return out;
  });
}

/** Average multiple columns into a new column */
export function mathAverageColumns(data, columns, newColumn) {
  return data.map((row) => {
    const out = { ...row };
    let sum = 0;
    let count = 0;
    columns.forEach((col) => {
      const num = Number(row[col]);
      if (!isNaN(num)) { sum += num; count++; }
    });
    out[newColumn] = count > 0 ? sum / count : "";
    return out;
  });
}

/* ─── Replace & Search ─── */

/** Replace occurrences of a substring in a column (all or nth). */
export function replaceText(data, column, find, replaceWith, occurrence) {
  return data.map((row) => {
    const out = { ...row };
    const original = String(out[column] ?? "");
    if (occurrence === undefined || occurrence === null || occurrence === "") {
      out[column] = original.split(find).join(replaceWith);
    } else {
      const n = Number(occurrence);
      let count = 0;
      let index = -1;
      let searchFrom = 0;
      while (count < n) {
        index = original.indexOf(find, searchFrom);
        if (index === -1) break;
        searchFrom = index + find.length;
        count++;
      }
      out[column] = (index !== -1 && count === n)
        ? original.slice(0, index) + replaceWith + original.slice(index + find.length)
        : original;
    }
    return out;
  });
}

/** Filter rows where any column contains the keyword. */
export function searchRows(data, keyword) {
  const term = String(keyword).toLowerCase();
  return data.filter((row) =>
    Object.values(row).some((val) =>
      String(val ?? "").toLowerCase().includes(term)
    )
  );
}

/* ─── Simple transforms ─── */

/** Absolute value of a numeric column. */
export function absoluteColumn(data, column) {
  return data.map((row) => {
    const out = { ...row };
    const num = Number(out[column]);
    if (!isNaN(num)) out[column] = Math.abs(num);
    return out;
  });
}

/* ─── Column / Row operations ─── */

/** Rename a column. */
export function renameColumn(data, oldName, newName) {
  if (oldName === newName) return data;
  return data.map((row) => {
    const out = { ...row };
    if (Object.prototype.hasOwnProperty.call(out, oldName)) {
      out[newName] = out[oldName];
      delete out[oldName];
    }
    return out;
  });
}

/** Duplicate a column under a new name. */
export function duplicateColumn(data, column, newColumn) {
  return data.map((row) => ({ ...row, [newColumn]: row[column] }));
}

/** Reorder columns (unlisted columns are kept at the end). */
export function reorderColumns(data, orderedColumns) {
  return data.map((row) => {
    const out = {};
    orderedColumns.forEach((col) => {
      if (Object.prototype.hasOwnProperty.call(row, col)) out[col] = row[col];
    });
    Object.keys(row).forEach((col) => {
      if (!orderedColumns.includes(col)) out[col] = row[col];
    });
    return out;
  });
}

/** Filter rows by a condition on a column. */
export function filterRows(data, column, condition, value) {
  return data.filter((row) => {
    const cell = row[column];
    switch (condition) {
      case "equals": return String(cell) === String(value);
      case "not_equals": return String(cell) !== String(value);
      case "greater_than": return Number(cell) > Number(value);
      case "less_than": return Number(cell) < Number(value);
      case "contains": return String(cell ?? "").includes(value);
      case "starts_with": return String(cell ?? "").startsWith(value);
      case "ends_with": return String(cell ?? "").endsWith(value);
      default: return true;
    }
  });
}

/** Sort rows by a column. */
export function sortRows(data, column, direction = "asc") {
  const sorted = [...data].sort((a, b) => {
    const valA = a[column];
    const valB = b[column];
    const numA = Number(valA), numB = Number(valB);
    let cmp;
    if (!isNaN(numA) && !isNaN(numB)) {
      cmp = numA - numB;
    } else {
      cmp = String(valA ?? "").localeCompare(String(valB ?? ""));
    }
    return direction === "desc" ? -cmp : cmp;
  });
  return sorted;
}

/** Sample rows (first n or random n). */
export function sampleRows(data, count, mode = "first") {
  const n = Number(count);
  if (mode === "random") {
    return [...data].sort(() => Math.random() - 0.5).slice(0, n);
  }
  return data.slice(0, n);
}

/* ─── Date operations ─── */

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function extractYear(data, column, newColumn) {
  return data.map((row) => {
    const d = new Date(row[column]);
    return { ...row, [newColumn]: isNaN(d) ? "" : d.getFullYear() };
  });
}

export function extractMonth(data, column, newColumn) {
  return data.map((row) => {
    const d = new Date(row[column]);
    return { ...row, [newColumn]: isNaN(d) ? "" : d.getMonth() + 1 };
  });
}

export function extractDay(data, column, newColumn) {
  return data.map((row) => {
    const d = new Date(row[column]);
    return { ...row, [newColumn]: isNaN(d) ? "" : d.getDate() };
  });
}

export function extractDayOfWeek(data, column, newColumn) {
  return data.map((row) => {
    const d = new Date(row[column]);
    return { ...row, [newColumn]: isNaN(d) ? "" : DAY_NAMES[d.getDay()] };
  });
}

export function dateDifference(data, colA, colB, newColumn, unit = "days") {
  const msPerUnit = { days: 86400000, hours: 3600000, minutes: 60000 };
  return data.map((row) => {
    const a = new Date(row[colA]);
    const b = new Date(row[colB]);
    return { ...row, [newColumn]: (!isNaN(a) && !isNaN(b)) ? Math.round((b - a) / (msPerUnit[unit] || msPerUnit.days)) : "" };
  });
}

export function addDays(data, column, days) {
  const n = Number(days);
  return data.map((row) => {
    const out = { ...row };
    const d = new Date(out[column]);
    if (!isNaN(d)) {
      d.setDate(d.getDate() + n);
      out[column] = d.toISOString().split("T")[0];
    }
    return out;
  });
}

export function ageFromBirthdate(data, column, newColumn) {
  const today = new Date();
  return data.map((row) => {
    const d = new Date(row[column]);
    if (isNaN(d)) return { ...row, [newColumn]: "" };
    let age = today.getFullYear() - d.getFullYear();
    const monthDiff = today.getMonth() - d.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) age--;
    return { ...row, [newColumn]: age };
  });
}

export function isWeekend(data, column, newColumn) {
  return data.map((row) => {
    const d = new Date(row[column]);
    if (isNaN(d)) return { ...row, [newColumn]: "" };
    const day = d.getDay();
    return { ...row, [newColumn]: day === 0 || day === 6 };
  });
}

/* ─── Formatting & Validation ─── */

export function currencyFormat(data, column, symbol = "$", newColumn) {
  const target = newColumn || column;
  return data.map((row) => {
    const out = { ...row };
    const num = Number(out[column]);
    if (!isNaN(num)) {
      out[target] = symbol + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return out;
  });
}

export function percentageFormat(data, column, decimals = 1, newColumn) {
  const target = newColumn || column;
  return data.map((row) => {
    const out = { ...row };
    const num = Number(out[column]);
    if (!isNaN(num)) {
      out[target] = (num * 100).toFixed(decimals) + "%";
    }
    return out;
  });
}

export function labelEncode(data, column) {
  const unique = [...new Set(data.map((row) => row[column]))];
  const map = {};
  unique.forEach((val, i) => { map[val] = i; });
  return data.map((row) => ({ ...row, [column]: map[row[column]] }));
}

export function oneHotEncode(data, column) {
  const unique = [...new Set(data.map((row) => row[column]))];
  return data.map((row) => {
    const out = { ...row };
    const value = out[column];
    unique.forEach((val) => {
      out[`${column}_${val}`] = value === val;
    });
    delete out[column];
    return out;
  });
}

export function emailValidityCheck(data, column, newColumn) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return data.map((row) => ({
    ...row,
    [newColumn]: emailRegex.test(String(row[column] ?? "")),
  }));
}

export function phoneFormatCheck(data, column, newColumn) {
  const phoneRegex = /^\+?[0-9\s\-()]{7,15}$/;
  return data.map((row) => ({
    ...row,
    [newColumn]: phoneRegex.test(String(row[column] ?? "")),
  }));
}

export function flagOutliers(data, column, newColumn, stdDevThreshold = 2) {
  const nums = data.map((row) => Number(row[column])).filter((n) => !isNaN(n));
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / nums.length;
  const stdDev = Math.sqrt(variance);
  return data.map((row) => {
    const num = Number(row[column]);
    return { ...row, [newColumn]: !isNaN(num) && Math.abs(num - mean) > stdDevThreshold * stdDev };
  });
}

/* ─── Text operations ─── */

export function removeSpecialCharacters(data, column) {
  return data.map((row) => ({
    ...row,
    [column]: String(row[column] ?? "").replace(/[^a-zA-Z0-9\s]/g, ""),
  }));
}

export function removeNumbers(data, column) {
  return data.map((row) => ({
    ...row,
    [column]: String(row[column] ?? "").replace(/[0-9]/g, ""),
  }));
}

export function collapseWhitespace(data, column) {
  return data.map((row) => ({
    ...row,
    [column]: String(row[column] ?? "").replace(/\s+/g, " ").trim(),
  }));
}

export function padLeft(data, column, length, padChar = "0") {
  return data.map((row) => ({
    ...row,
    [column]: String(row[column] ?? "").padStart(Number(length), padChar),
  }));
}

export function padRight(data, column, length, padChar = " ") {
  return data.map((row) => ({
    ...row,
    [column]: String(row[column] ?? "").padEnd(Number(length), padChar),
  }));
}

export function truncateText(data, column, maxLength) {
  return data.map((row) => ({
    ...row,
    [column]: String(row[column] ?? "").slice(0, Number(maxLength)),
  }));
}

export function extractSubstring(data, column, newColumn, start, end) {
  return data.map((row) => ({
    ...row,
    [newColumn]: String(row[column] ?? "").slice(Number(start), Number(end)),
  }));
}

export function reverseText(data, column) {
  return data.map((row) => ({
    ...row,
    [column]: String(row[column] ?? "").split("").reverse().join(""),
  }));
}

export function countCharacters(data, column, newColumn) {
  return data.map((row) => ({
    ...row,
    [newColumn]: String(row[column] ?? "").length,
  }));
}

export function countWords(data, column, newColumn) {
  return data.map((row) => {
    const str = String(row[column] ?? "").trim();
    return { ...row, [newColumn]: str === "" ? 0 : str.split(/\s+/).length };
  });
}

export function containsCheck(data, column, newColumn, substring) {
  return data.map((row) => ({
    ...row,
    [newColumn]: String(row[column] ?? "").includes(substring),
  }));
}

export function startsWithCheck(data, column, newColumn, prefix) {
  return data.map((row) => ({
    ...row,
    [newColumn]: String(row[column] ?? "").startsWith(prefix),
  }));
}

export function endsWithCheck(data, column, newColumn, suffix) {
  return data.map((row) => ({
    ...row,
    [newColumn]: String(row[column] ?? "").endsWith(suffix),
  }));
}

export function regexExtract(data, column, newColumn, pattern, flags = "") {
  const regex = new RegExp(pattern, flags);
  return data.map((row) => {
    const match = String(row[column] ?? "").match(regex);
    return { ...row, [newColumn]: match ? match[0] : "" };
  });
}

export function regexReplace(data, column, pattern, replaceWith, flags = "g") {
  const regex = new RegExp(pattern, flags);
  return data.map((row) => ({
    ...row,
    [column]: String(row[column] ?? "").replace(regex, replaceWith),
  }));
}

export function sentenceCase(data, column) {
  return data.map((row) => {
    const str = String(row[column] ?? "").toLowerCase();
    return { ...row, [column]: str ? str.charAt(0).toUpperCase() + str.slice(1) : "" };
  });
}
