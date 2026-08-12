import XLSX from "xlsx";
import { RemoveColumn } from "./functions/user_choice/removeColumn.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data, column } = req.body;
    if (!column) return res.status(400).json({ error: "column is required" });

    const sheet = XLSX.utils.json_to_sheet(data);
    const rc = new RemoveColumn();
    const result = XLSX.utils.sheet_to_json(rc.remove_column(sheet, column));
    res.status(200).json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
