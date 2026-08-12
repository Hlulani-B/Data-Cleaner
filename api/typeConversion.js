import XLSX from "xlsx";
import { TypeConversion } from "./functions/user_choice/typeConversion.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data, column, targetType } = req.body;
    if (!column) return res.status(400).json({ error: "column is required" });
    if (!targetType) return res.status(400).json({ error: "targetType is required" });

    const sheet = XLSX.utils.json_to_sheet(data);
    const tc = new TypeConversion();
    const result = XLSX.utils.sheet_to_json(tc.typeConversion(sheet, column, targetType));
    res.status(200).json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
