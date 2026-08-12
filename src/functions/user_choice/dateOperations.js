import XlSX from 'xlsx';

class DateOperations {
    extractYear(sheet, column, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const d = new Date(row[column]);
            row[newColumn] = isNaN(d) ? "" : d.getFullYear();
        });
        return XlSX.utils.json_to_sheet(data);
    }

    extractMonth(sheet, column, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const d = new Date(row[column]);
            row[newColumn] = isNaN(d) ? "" : d.getMonth() + 1;
        });
        return XlSX.utils.json_to_sheet(data);
    }

    extractDay(sheet, column, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const d = new Date(row[column]);
            row[newColumn] = isNaN(d) ? "" : d.getDate();
        });
        return XlSX.utils.json_to_sheet(data);
    }

    extractDayOfWeek(sheet, column, newColumn) {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const d = new Date(row[column]);
            row[newColumn] = isNaN(d) ? "" : days[d.getDay()];
        });
        return XlSX.utils.json_to_sheet(data);
    }

    dateDifference(sheet, columnA, columnB, newColumn, unit = "days") {
        const data = XlSX.utils.sheet_to_json(sheet);
        const msPerUnit = { days: 86400000, hours: 3600000, minutes: 60000 };
        data.forEach((row) => {
            const a = new Date(row[columnA]);
            const b = new Date(row[columnB]);
            row[newColumn] = (!isNaN(a) && !isNaN(b))
                ? Math.round((b - a) / (msPerUnit[unit] || msPerUnit.days))
                : "";
        });
        return XlSX.utils.json_to_sheet(data);
    }

    addDays(sheet, column, days) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const d = new Date(row[column]);
            if (!isNaN(d)) {
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
            const d = new Date(row[column]);
            if (isNaN(d)) {
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
            const d = new Date(row[column]);
            if (isNaN(d)) {
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