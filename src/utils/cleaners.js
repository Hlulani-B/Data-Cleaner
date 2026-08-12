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

    delete out[column];
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
