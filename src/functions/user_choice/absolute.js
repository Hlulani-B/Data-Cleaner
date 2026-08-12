import XlSX from 'xlsx';

class AbsoluteValue {
    absolute(sheet, column) {
        const data = XlSX.utils.sheet_to_json(sheet);

        data.forEach((row) => {
            const num = Number(row[column]);
            if (!isNaN(num)) {
                row[column] = Math.abs(num);
            }
        });

        return XlSX.utils.json_to_sheet(data);
    }
}

export default AbsoluteValue;