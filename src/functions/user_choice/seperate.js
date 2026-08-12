import XlSX from 'xlsx';

class Separate {
    separate(sheet, column, delimiter, occurrence = 1, new_column1, new_column2) {
        const data = XlSX.utils.sheet_to_json(sheet);

        data.forEach((row) => {
            const original = String(row[column] ?? "");
            const parts = original.split(delimiter);

            if (parts.length > occurrence) {
                const before = parts.slice(0, occurrence).join(delimiter);
                const after = parts.slice(occurrence).join(delimiter);
                row[new_column1] = before;
                row[new_column2] = after;
            } else {
                row[new_column1] = original;
                row[new_column2] = "";
            }

            delete row[column];
        });

        return XlSX.utils.json_to_sheet(data);
    }
}

export default Separate;