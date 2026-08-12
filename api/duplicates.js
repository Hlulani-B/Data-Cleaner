import XLSX from "xlsx";
import { Duplicate } from "./functions/automatic/duplicates.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data } = req.body;
    const sheet = XLSX.utils.json_to_sheet(data);
    const dup = new Duplicate();
    const result = XLSX.utils.sheet_to_json(dup.duplicate(sheet));
    res.status(200).json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
