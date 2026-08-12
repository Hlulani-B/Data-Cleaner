import * as XLSX from "xlsx";
import { parseWorksheet } from "../../utils/sheetParsers.js";

export class Clean {
  clean(sheet) {
    // Parse the sheet through the same robust 2-D pipeline used on upload.
    const data = parseWorksheet(sheet);
    if (data.length === 0) return sheet;

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

    // 2. Remove rows where all values are null, undefined, or empty string after trimming.
    const cleaned = trimmed.filter((row) => {
      const values = Object.values(row);
      return values.some((val) =>
        val !== undefined && val !== null && val !== ""
      );
    });

    // 3. Convert any remaining empty strings to null.
    cleaned.forEach((row) => {
      for (const col of Object.keys(row)) {
        if (row[col] === "") row[col] = null;
      }
    });

    return XLSX.utils.json_to_sheet(cleaned);
  }
}
