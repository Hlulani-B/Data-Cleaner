import XLSX from "xlsx";
import { RemoveEmpty } from "./functions/user_choice/removeEmpty.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data } = req.body;
    const sheet = XLSX.utils.json_to_sheet(data);
    const re = new RemoveEmpty();
    const result = XLSX.utils.sheet_to_json(re.remove_empty(sheet));
    res.status(200).json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
