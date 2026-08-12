import XlSX from 'xlsx'

class Concatenate {
    concat(sheet, new_column, array) {
        const data = XlSX.utils.sheet_to_json(sheet);

        data.forEach((row) => {
            let value = "";
            array.forEach((col) => {
                if (Object.keys(row).includes(col)) {
                    value += String(row[col] ?? "");
                } else {
                    value += col;
                }
            });
            row[new_column] = value;
        });

        return XlSX.utils.json_to_sheet(data);
    }
}

export default Concatenate;