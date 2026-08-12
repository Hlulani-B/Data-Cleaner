import XLSX from "xlsx";
import Concatenate from "./functions/user_choice/concatenate.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data, columns, newColumn } = req.body;
    if (!Array.isArray(columns) || columns.length < 2) {
      return res.status(400).json({ error: "at least 2 columns are required" });
    }
    if (!newColumn) return res.status(400).json({ error: "newColumn is required" });

    const sheet = XLSX.utils.json_to_sheet(data);
    const conc = new Concatenate();
    const result = XLSX.utils.sheet_to_json(
      conc.concat(sheet, newColumn, columns)
    );
    res.status(200).json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
