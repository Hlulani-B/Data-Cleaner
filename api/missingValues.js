import XLSX from "xlsx";
import { MissingValues } from "./functions/user_choice/missingValues.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data, action, rowIndices } = req.body;
    const sheet = XLSX.utils.json_to_sheet(data);
    const mv = new MissingValues();

    if (action === "find") {
      const result = XLSX.utils.sheet_to_json(mv.find_missing(sheet));
      return res.status(200).json({ data: result });
    }

    if (action === "remove") {
      if (!Array.isArray(rowIndices)) {
        return res.status(400).json({ error: "rowIndices array is required for remove action" });
      }
      const result = XLSX.utils.sheet_to_json(mv.remove_rows(sheet, rowIndices));
      return res.status(200).json({ data: result });
    }

    res.status(400).json({ error: "action must be 'find' or 'remove'" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
