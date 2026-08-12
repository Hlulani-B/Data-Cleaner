import XlSX from 'xlsx';

class FormattingValidation {
    currencyFormat(sheet, column, symbol = "$") {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const num = Number(row[column]);
            if (!isNaN(num)) {
                row[column] = symbol + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
        });
        return XlSX.utils.json_to_sheet(data);
    }

    percentageFormat(sheet, column, decimals = 1) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const num = Number(row[column]);
            if (!isNaN(num)) {
                row[column] = (num * 100).toFixed(decimals) + "%";
            }
        });
        return XlSX.utils.json_to_sheet(data);
    }

    labelEncode(sheet, column) {
        const data = XlSX.utils.sheet_to_json(sheet);
        const unique = [...new Set(data.map((row) => row[column]))];
        const map = {};
        unique.forEach((val, i) => { map[val] = i; });
        data.forEach((row) => {
            row[column] = map[row[column]];
        });
        return XlSX.utils.json_to_sheet(data);
    }

    oneHotEncode(sheet, column) {
        const data = XlSX.utils.sheet_to_json(sheet);
        const unique = [...new Set(data.map((row) => row[column]))];
        data.forEach((row) => {
            const value = row[column];
            unique.forEach((val) => {
                row[`${column}_${val}`] = (value === val);
            });
            delete row[column];
        });
        return XlSX.utils.json_to_sheet(data);
    }

    emailValidityCheck(sheet, column, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        data.forEach((row) => {
            row[newColumn] = emailRegex.test(String(row[column] ?? ""));
        });
        return XlSX.utils.json_to_sheet(data);
    }

    phoneFormatCheck(sheet, column, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        const phoneRegex = /^\+?[0-9\s\-()]{7,15}$/;
        data.forEach((row) => {
            row[newColumn] = phoneRegex.test(String(row[column] ?? ""));
        });
        return XlSX.utils.json_to_sheet(data);
    }

    flagOutliers(sheet, column, newColumn, stdDevThreshold = 2) {
        const data = XlSX.utils.sheet_to_json(sheet);
        const nums = data.map((row) => Number(row[column])).filter((n) => !isNaN(n));
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / nums.length;
        const stdDev = Math.sqrt(variance);

        data.forEach((row) => {
            const num = Number(row[column]);
            row[newColumn] = !isNaN(num) && Math.abs(num - mean) > stdDevThreshold * stdDev;
        });
        return XlSX.utils.json_to_sheet(data);
    }
}

export default FormattingValidation;