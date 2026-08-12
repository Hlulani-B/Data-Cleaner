import XLSX from "xlsx";
import Separate from "./functions/user_choice/seperate.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data, column, delimiter, occurrence, newColumn1, newColumn2 } = req.body;
    if (!column) return res.status(400).json({ error: "column is required" });
    if (!delimiter) return res.status(400).json({ error: "delimiter is required" });
    if (!newColumn1) return res.status(400).json({ error: "newColumn1 is required" });
    if (!newColumn2) return res.status(400).json({ error: "newColumn2 is required" });

    const sheet = XLSX.utils.json_to_sheet(data);
    const sep = new Separate();
    const result = XLSX.utils.sheet_to_json(
      sep.separate(sheet, column, delimiter, occurrence || 1, newColumn1, newColumn2)
    );
    res.status(200).json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
