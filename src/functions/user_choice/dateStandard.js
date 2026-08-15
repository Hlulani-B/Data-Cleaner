import XLSX from "xlsx"

// Converts an Excel serial number, JS Date, or date string into a proper JS Date.
// Returns null if the value can't be parsed as a date.
function toJSDate(val) {
    if (val instanceof Date) {
        return isNaN(val.getTime()) ? null : val;
    }
    if (typeof val === "number") {
        // Excel serial number -> JS Date
        // 25569 = number of days between the Excel epoch (1899-12-30) and the Unix epoch (1970-01-01)
        const utcDays = val - 25569;
        const utcMs = utcDays * 86400 * 1000;
        const d = new Date(utcMs);
        return isNaN(d.getTime()) ? null : d;
    }
    if (typeof val === "string" && val.trim() !== "") {
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

export class DateStandard {
    dateStandard(sheet, column, format) {
        const data = XLSX.utils.sheet_to_json(sheet);
        if (data.length === 0 || !Object.keys(data[0]).includes(column)) {
            console.log("Column does not exist");
            return sheet;
        }

        // Supported formats: "YYYY-MM-DD", "MM/DD/YYYY", "DD-MM-YYYY"
        for (let row of data) {
            const date = toJSDate(row[column]);
            if (!date) continue;

            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, "0");
            const dd = String(date.getDate()).padStart(2, "0");

            switch (format) {
                case "YYYY-MM-DD":
                    row[column] = `${yyyy}-${mm}-${dd}`;
                    break;
                case "MM/DD/YYYY":
                    row[column] = `${mm}/${dd}/${yyyy}`;
                    break;
                case "DD-MM-YYYY":
                    row[column] = `${dd}-${mm}-${yyyy}`;
                    break;
                default:
                    row[column] = `${yyyy}-${mm}-${dd}`;
            }
        }

        return XLSX.utils.json_to_sheet(data);
    }
}