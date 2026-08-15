import XlSX from 'xlsx';

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

class DateOperations {
    extractYear(sheet, column, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const d = toJSDate(row[column]);
            row[newColumn] = d ? d.getFullYear() : "";
        });
        return XlSX.utils.json_to_sheet(data);
    }

    extractMonth(sheet, column, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const d = toJSDate(row[column]);
            row[newColumn] = d ? d.getMonth() + 1 : "";
        });
        return XlSX.utils.json_to_sheet(data);
    }

    extractDay(sheet, column, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const d = toJSDate(row[column]);
            row[newColumn] = d ? d.getDate() : "";
        });
        return XlSX.utils.json_to_sheet(data);
    }

    extractDayOfWeek(sheet, column, newColumn) {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const d = toJSDate(row[column]);
            row[newColumn] = d ? days[d.getDay()] : "";
        });
        return XlSX.utils.json_to_sheet(data);
    }

    dateDifference(sheet, columnA, columnB, newColumn, unit = "days") {
        const data = XlSX.utils.sheet_to_json(sheet);
        const msPerUnit = { days: 86400000, hours: 3600000, minutes: 60000 };
        data.forEach((row) => {
            const a = toJSDate(row[columnA]);
            const b = toJSDate(row[columnB]);
            row[newColumn] = (a && b)
                ? Math.round((b - a) / (msPerUnit[unit] || msPerUnit.days))
                : "";
        });
        return XlSX.utils.json_to_sheet(data);
    }

    addDays(sheet, column, days) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const d = toJSDate(row[column]);
            if (d) {
                d.setDate(d.getDate() + days);
                row[column] = d.toISOString().split("T")[0];
            }
        });
        return XlSX.utils.json_to_sheet(data);
    }

    ageFromBirthdate(sheet, column, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        const today = new Date();
        data.forEach((row) => {
            const d = toJSDate(row[column]);
            if (!d) {
                row[newColumn] = "";
                return;
            }
            let age = today.getFullYear() - d.getFullYear();
            const monthDiff = today.getMonth() - d.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) age--;
            row[newColumn] = age;
        });
        return XlSX.utils.json_to_sheet(data);
    }

    isWeekend(sheet, column, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const d = toJSDate(row[column]);
            if (!d) {
                row[newColumn] = "";
                return;
            }
            const day = d.getDay();
            row[newColumn] = (day === 0 || day === 6);
        });
        return XlSX.utils.json_to_sheet(data);
    }
}

export default DateOperations;