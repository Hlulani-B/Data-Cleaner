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

/** Clean: remove fully-empty rows, trim strings, empty string → null */
export function cleanData(data) {
  if (data.length === 0) return data;
  const filtered = data.filter((row) =>
    Object.values(row).some((v) => v !== undefined && v !== null && v !== "")
  );
  if (filtered.length === 0) return filtered;
  const columns = Object.keys(filtered[0]);
  return filtered.map((row) => {
    const out = { ...row };
    for (const col of columns) {
      if (typeof out[col] === "string") {
        out[col] = out[col].trim();
        if (out[col] === "") out[col] = null;
      }
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
