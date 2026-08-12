import XlSX from 'xlsx';

class MathOperations {
    absolute(sheet, column) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const num = Number(row[column]);
            if (!isNaN(num)) row[column] = Math.abs(num);
        });
        return XlSX.utils.json_to_sheet(data);
    }

    round(sheet, column, decimals = 0) {
        const data = XlSX.utils.sheet_to_json(sheet);
        const factor = Math.pow(10, decimals);
        data.forEach((row) => {
            const num = Number(row[column]);
            if (!isNaN(num)) row[column] = Math.round(num * factor) / factor;
        });
        return XlSX.utils.json_to_sheet(data);
    }

    ceil(sheet, column) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const num = Number(row[column]);
            if (!isNaN(num)) row[column] = Math.ceil(num);
        });
        return XlSX.utils.json_to_sheet(data);
    }

    floor(sheet, column) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const num = Number(row[column]);
            if (!isNaN(num)) row[column] = Math.floor(num);
        });
        return XlSX.utils.json_to_sheet(data);
    }

    add(sheet, columnA, columnB, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const a = Number(row[columnA]);
            const b = Number(row[columnB]);
            row[newColumn] = (!isNaN(a) && !isNaN(b)) ? a + b : "";
        });
        return XlSX.utils.json_to_sheet(data);
    }

    subtract(sheet, columnA, columnB, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const a = Number(row[columnA]);
            const b = Number(row[columnB]);
            row[newColumn] = (!isNaN(a) && !isNaN(b)) ? a - b : "";
        });
        return XlSX.utils.json_to_sheet(data);
    }

    multiply(sheet, columnA, columnB, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const a = Number(row[columnA]);
            const b = Number(row[columnB]);
            row[newColumn] = (!isNaN(a) && !isNaN(b)) ? a * b : "";
        });
        return XlSX.utils.json_to_sheet(data);
    }

    divide(sheet, columnA, columnB, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const a = Number(row[columnA]);
            const b = Number(row[columnB]);
            row[newColumn] = (!isNaN(a) && !isNaN(b) && b !== 0) ? a / b : "";
        });
        return XlSX.utils.json_to_sheet(data);
    }

    modulo(sheet, columnA, columnB, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const a = Number(row[columnA]);
            const b = Number(row[columnB]);
            row[newColumn] = (!isNaN(a) && !isNaN(b) && b !== 0) ? a % b : "";
        });
        return XlSX.utils.json_to_sheet(data);
    }

    power(sheet, column, exponent, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const num = Number(row[column]);
            row[newColumn] = !isNaN(num) ? Math.pow(num, exponent) : "";
        });
        return XlSX.utils.json_to_sheet(data);
    }

    squareRoot(sheet, column, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const num = Number(row[column]);
            row[newColumn] = (!isNaN(num) && num >= 0) ? Math.sqrt(num) : "";
        });
        return XlSX.utils.json_to_sheet(data);
    }

    addConstant(sheet, column, constant) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const num = Number(row[column]);
            if (!isNaN(num)) row[column] = num + constant;
        });
        return XlSX.utils.json_to_sheet(data);
    }

    multiplyConstant(sheet, column, constant) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const num = Number(row[column]);
            if (!isNaN(num)) row[column] = num * constant;
        });
        return XlSX.utils.json_to_sheet(data);
    }

    percentageOf(sheet, columnA, columnB, newColumn) {
        // columnA as a percentage of columnB
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const a = Number(row[columnA]);
            const b = Number(row[columnB]);
            row[newColumn] = (!isNaN(a) && !isNaN(b) && b !== 0) ? (a / b) * 100 : "";
        });
        return XlSX.utils.json_to_sheet(data);
    }

    percentageChange(sheet, oldColumn, newColumnValue, newColumn) {
        // % change from oldColumn to newColumnValue
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const oldVal = Number(row[oldColumn]);
            const newVal = Number(row[newColumnValue]);
            row[newColumn] = (!isNaN(oldVal) && !isNaN(newVal) && oldVal !== 0)
                ? ((newVal - oldVal) / oldVal) * 100
                : "";
        });
        return XlSX.utils.json_to_sheet(data);
    }

    min(sheet, columnA, columnB, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const a = Number(row[columnA]);
            const b = Number(row[columnB]);
            row[newColumn] = (!isNaN(a) && !isNaN(b)) ? Math.min(a, b) : "";
        });
        return XlSX.utils.json_to_sheet(data);
    }

    max(sheet, columnA, columnB, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const a = Number(row[columnA]);
            const b = Number(row[columnB]);
            row[newColumn] = (!isNaN(a) && !isNaN(b)) ? Math.max(a, b) : "";
        });
        return XlSX.utils.json_to_sheet(data);
    }

    sumColumns(sheet, columns, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            let sum = 0;
            let valid = true;
            columns.forEach((col) => {
                const num = Number(row[col]);
                if (isNaN(num)) valid = false;
                else sum += num;
            });
            row[newColumn] = valid ? sum : "";
        });
        return XlSX.utils.json_to_sheet(data);
    }

    averageColumns(sheet, columns, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            let sum = 0;
            let count = 0;
            columns.forEach((col) => {
                const num = Number(row[col]);
                if (!isNaN(num)) {
                    sum += num;
                    count++;
                }
            });
            row[newColumn] = count > 0 ? sum / count : "";
        });
        return XlSX.utils.json_to_sheet(data);
    }

    cumulativeSum(sheet, column, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        let running = 0;
        data.forEach((row) => {
            const num = Number(row[column]);
            if (!isNaN(num)) running += num;
            row[newColumn] = running;
        });
        return XlSX.utils.json_to_sheet(data);
    }

    log(sheet, column, newColumn, base = Math.E) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const num = Number(row[column]);
            row[newColumn] = (!isNaN(num) && num > 0) ? Math.log(num) / Math.log(base) : "";
        });
        return XlSX.utils.json_to_sheet(data);
    }

    negate(sheet, column) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const num = Number(row[column]);
            if (!isNaN(num)) row[column] = -num;
        });
        return XlSX.utils.json_to_sheet(data);
    }
}

export default MathOperations;