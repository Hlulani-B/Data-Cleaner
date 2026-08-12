/**
 * Unified operations handler — consolidates all data-transform endpoints
 * into a single serverless function to stay within Vercel's free-tier limit.
 *
 * POST /api/operations
 * Body: { operation: "upper"|"lower"|..., data: [...], column?, ...extraParams }
 */
import XLSX from "xlsx";
import { Upper } from "../src/functions/user_choice/upper.js";
import { Lower } from "../src/functions/user_choice/lower.js";
import { Proper } from "../src/functions/user_choice/proper.js";
import { RemoveColumn } from "../src/functions/user_choice/removeColumn.js";
import { RemoveEmpty } from "../src/functions/user_choice/removeEmpty.js";
import { MissingValues } from "../src/functions/user_choice/missingValues.js";
import { DateStandard } from "../src/functions/user_choice/dateStandard.js";
import { TypeConversion } from "../src/functions/user_choice/typeConversion.js";
import { Clean } from "../src/functions/automatic/clean.js";
import { Duplicate } from "../src/functions/automatic/duplicates.js";
import { Trim } from "../src/functions/automatic/trim.js";
import { Datatype } from "../src/functions/automatic/datatype.js";
import Separate from "../src/functions/user_choice/seperate.js";
import Join from "../src/functions/user_choice/join.js";
import Concatenate from "../src/functions/user_choice/concatenate.js";

function toSheet(data) { return XLSX.utils.json_to_sheet(data); }
function toData(sheet) { return XLSX.utils.sheet_to_json(sheet); }

const ops = {
  upper({ data, column }) {
    if (!column) throw new Error("column is required");
    return toData(new Upper().upper(toSheet(data), column));
  },

  lower({ data, column }) {
    if (!column) throw new Error("column is required");
    return toData(new Lower().lower(toSheet(data), column));
  },

  proper({ data, column }) {
    if (!column) throw new Error("column is required");
    return toData(new Proper().proper(toSheet(data), column));
  },

  removeColumn({ data, column }) {
    if (!column) throw new Error("column is required");
    return toData(new RemoveColumn().remove_column(toSheet(data), column));
  },

  removeEmpty({ data }) {
    return toData(new RemoveEmpty().remove_empty(toSheet(data)));
  },

  missingValues({ data, action, rowIndices }) {
    const mv = new MissingValues();
    if (action === "find") return toData(mv.find_missing(toSheet(data)));
    if (action === "remove") {
      if (!Array.isArray(rowIndices)) throw new Error("rowIndices array is required");
      return toData(mv.remove_rows(toSheet(data), rowIndices));
    }
    throw new Error("action must be 'find' or 'remove'");
  },

  dateStandard({ data, column, format }) {
    if (!column) throw new Error("column is required");
    if (!format) throw new Error("format is required");
    return toData(new DateStandard().dateStandard(toSheet(data), column, format));
  },

  typeConversion({ data, column, targetType }) {
    if (!column) throw new Error("column is required");
    if (!targetType) throw new Error("targetType is required");
    return toData(new TypeConversion().typeConversion(toSheet(data), column, targetType));
  },

  clean({ data }) {
    return toData(new Clean().clean(toSheet(data)));
  },

  duplicates({ data }) {
    return toData(new Duplicate().duplicate(toSheet(data)));
  },

  trim({ data }) {
    return toData(new Trim().trim(toSheet(data)));
  },

  datatype({ data }) {
    return toData(new Datatype().datatype(toSheet(data)));
  },

  separate({ data, column, delimiter, occurrence, newColumn1, newColumn2 }) {
    if (!column) throw new Error("column is required");
    if (!delimiter) throw new Error("delimiter is required");
    if (!newColumn1) throw new Error("newColumn1 is required");
    if (!newColumn2) throw new Error("newColumn2 is required");
    return toData(new Separate().separate(toSheet(data), column, delimiter, occurrence || 1, newColumn1, newColumn2));
  },

  join({ data, columns, newColumn, delimiter }) {
    if (!Array.isArray(columns) || columns.length < 2) throw new Error("at least 2 columns are required");
    if (!newColumn) throw new Error("newColumn is required");
    if (delimiter === undefined || delimiter === null) throw new Error("delimiter is required");
    return toData(new Join().join(toSheet(data), newColumn, columns, delimiter));
  },

  concatenate({ data, columns, newColumn }) {
    if (!Array.isArray(columns) || columns.length < 2) throw new Error("at least 2 columns are required");
    if (!newColumn) throw new Error("newColumn is required");
    return toData(new Concatenate().concat(toSheet(data), newColumn, columns));
  },

  upload({ data }) {
    // upload returns a binary buffer — handled differently
    if (!Array.isArray(data)) throw new Error("data must be an array of objects");
    const sheet = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Sheet1");
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  },
};

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { operation: bodyOp, ...params } = req.body || {};

    // Determine operation: from body, or from URL path (for Vercel rewrites)
    let operation = bodyOp;
    if (!operation) {
      const urlPath = (req.url || "").split("?")[0];
      const segments = urlPath.split("/").filter(Boolean); // e.g. ["api", "upper"]
      const name = segments[1]; // e.g. "upper"
      if (name && name !== "operations") {
        operation = name === "seperate" ? "separate" : name;
      }
    }

    if (!operation) return res.status(400).json({ error: "operation is required" });

    const fn = ops[operation];
    if (!fn) return res.status(400).json({ error: `unknown operation: ${operation}` });

    // upload returns binary — send as file download
    if (operation === "upload") {
      const buffer = fn(params);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=converted.xlsx");
      return res.status(200).send(Buffer.from(buffer));
    }

    const result = fn(params);
    res.status(200).json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
