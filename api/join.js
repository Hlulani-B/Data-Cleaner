import XLSX from "xlsx";
import Join from "./functions/user_choice/join.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data, columns, newColumn, delimiter } = req.body;
    if (!Array.isArray(columns) || columns.length < 2) {
      return res.status(400).json({ error: "at least 2 columns are required" });
    }
    if (!newColumn) return res.status(400).json({ error: "newColumn is required" });
    if (delimiter === undefined || delimiter === null) {
      return res.status(400).json({ error: "delimiter is required" });
    }

    const sheet = XLSX.utils.json_to_sheet(data);
    const joiner = new Join();
    const result = XLSX.utils.sheet_to_json(
      joiner.join(sheet, newColumn, columns, delimiter)
    );
    res.status(200).json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
