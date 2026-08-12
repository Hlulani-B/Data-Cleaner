import XlSX from 'xlsx';

class Replace {
    replace(sheet, column, string, replaceWith, occurrence) {
        const data = XlSX.utils.sheet_to_json(sheet);

        data.forEach((row) => {
            const original = String(row[column] ?? "");

            if (occurrence === undefined || occurrence === null) {
                // replace all occurrences
                row[column] = original.split(string).join(replaceWith);
            } else {
                // replace only the nth occurrence
                let count = 0;
                let index = -1;
                let searchFrom = 0;

                while (count < occurrence) {
                    index = original.indexOf(string, searchFrom);
                    if (index === -1) break;
                    searchFrom = index + string.length;
                    count++;
                }

                if (index !== -1 && count === occurrence) {
                    row[column] =
                        original.slice(0, index) +
                        replaceWith +
                        original.slice(index + string.length);
                } else {
                    row[column] = original;
                }
            }
        });

        return XlSX.utils.json_to_sheet(data);
    }
}

export default Replace;