import XlSX from 'xlsx';

class ColumnRowOperations {
    renameColumn(sheet, oldName, newName) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            if (Object.keys(row).includes(oldName)) {
                row[newName] = row[oldName];
                delete row[oldName];
            }
        });
        return XlSX.utils.json_to_sheet(data);
    }

    duplicateColumn(sheet, column, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            row[newColumn] = row[column];
        });
        return XlSX.utils.json_to_sheet(data);
    }

    reorderColumns(sheet, orderedColumns) {
        const data = XlSX.utils.sheet_to_json(sheet);
        const reordered = data.map((row) => {
            const newRow = {};
            orderedColumns.forEach((col) => {
                if (Object.keys(row).includes(col)) newRow[col] = row[col];
            });
            // keep any remaining columns not listed, at the end
            Object.keys(row).forEach((col) => {
                if (!orderedColumns.includes(col)) newRow[col] = row[col];
            });
            return newRow;
        });
        return XlSX.utils.json_to_sheet(reordered);
    }

    filterRows(sheet, column, condition, value) {
        // condition: "equals" | "not_equals" | "greater_than" | "less_than" | "contains"
        const data = XlSX.utils.sheet_to_json(sheet);
        const filtered = data.filter((row) => {
            const cell = row[column];
            switch (condition) {
                case "equals": return String(cell) === String(value);
                case "not_equals": return String(cell) !== String(value);
                case "greater_than": return Number(cell) > Number(value);
                case "less_than": return Number(cell) < Number(value);
                case "contains": return String(cell ?? "").includes(value);
                default: return true;
            }
        });
        return XlSX.utils.json_to_sheet(filtered);
    }

    sortRows(sheet, column, direction = "asc") {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.sort((a, b) => {
            const valA = a[column];
            const valB = b[column];
            const numA = Number(valA), numB = Number(valB);
            let cmp;
            if (!isNaN(numA) && !isNaN(numB)) {
                cmp = numA - numB;
            } else {
                cmp = String(valA ?? "").localeCompare(String(valB ?? ""));
            }
            return direction === "desc" ? -cmp : cmp;
        });
        return XlSX.utils.json_to_sheet(data);
    }

    sampleRows(sheet, count, mode = "first") {
        const data = XlSX.utils.sheet_to_json(sheet);
        let sampled;
        if (mode === "random") {
            sampled = [...data].sort(() => Math.random() - 0.5).slice(0, count);
        } else {
            sampled = data.slice(0, count);
        }
        return XlSX.utils.json_to_sheet(sampled);
    }
}

export default ColumnRowOperations;