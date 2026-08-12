import XLSX from "xlsx";
import { DateStandard } from "./functions/user_choice/dateStandard.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data, column, format } = req.body;
    if (!column) return res.status(400).json({ error: "column is required" });
    if (!format) return res.status(400).json({ error: "format is required" });

    const sheet = XLSX.utils.json_to_sheet(data);
    const ds = new DateStandard();
    const result = XLSX.utils.sheet_to_json(ds.dateStandard(sheet, column, format));
    res.status(200).json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
