import XlSX from 'xlsx';

class Join {
    join(sheet, new_column, array, delimeter) {
        const data = XlSX.utils.sheet_to_json(sheet);

        data.forEach((row) => {
            const value = array
                .map((col) => (Object.keys(row).includes(col) ? row[col] : ""))
                .join(delimeter);
            row[new_column] = value;
        });

        return XlSX.utils.json_to_sheet(data);
    }
}

export default Join;