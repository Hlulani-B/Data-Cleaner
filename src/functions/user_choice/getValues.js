import XLSX from "xlsx";

export class Values {
    getValues(sheet, column) {
        const data = XLSX.utils.sheet_to_json(sheet);
        const values = [];
        data.forEach((row) => {
            if (!values.includes(row[column])) {
                values.push(row[column]);
            }
        });
        return values;
    }

    replaceValues(sheet, column, value, replace_with) {
        const data = XLSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            if (row[column] == value) {
                row[column] = replace_with;
            }
        });
        return XLSX.utils.json_to_sheet(data);
    }

    rewrite(sheet, column, contains, replace_with) {
        const data = XLSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const val = String(row[column] ?? "");
            if (val.includes(contains)) {
                row[column] = val.replace(contains, replace_with);
            }
        });
        return XLSX.utils.json_to_sheet(data);
    }
    removeRowWithValue(sheet, column, value) {
        const data = XLSX.utils.sheet_to_json(sheet);
        const filtered = data.filter((row) => row[column] != value);
        return XLSX.utils.json_to_sheet(filtered);
    }
}
