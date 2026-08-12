import XLSX from "xlsx";

export class Search {
    search(sheet, keyword) {
        const data = XLSX.utils.sheet_to_json(sheet);
        const results = [];
        const term = String(keyword).toLowerCase();
        data.forEach((row) => {
            for (const key of Object.keys(row)) {
                if (String(row[key] ?? "").toLowerCase().includes(term)) {
                    results.push(row);
                    break; // one match per row is enough
                }
            }
        });
        return results;
    }
}
