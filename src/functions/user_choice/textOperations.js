import XlSX from 'xlsx';

class TextOperations {
    removeSpecialCharacters(sheet, column) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            row[column] = String(row[column] ?? "").replace(/[^a-zA-Z0-9\s]/g, "");
        });
        return XlSX.utils.json_to_sheet(data);
    }

    removeNumbers(sheet, column) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            row[column] = String(row[column] ?? "").replace(/[0-9]/g, "");
        });
        return XlSX.utils.json_to_sheet(data);
    }

    collapseWhitespace(sheet, column) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            row[column] = String(row[column] ?? "").replace(/\s+/g, " ").trim();
        });
        return XlSX.utils.json_to_sheet(data);
    }

    padLeft(sheet, column, length, padChar = "0") {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            row[column] = String(row[column] ?? "").padStart(length, padChar);
        });
        return XlSX.utils.json_to_sheet(data);
    }

    padRight(sheet, column, length, padChar = " ") {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            row[column] = String(row[column] ?? "").padEnd(length, padChar);
        });
        return XlSX.utils.json_to_sheet(data);
    }

    truncate(sheet, column, maxLength) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            row[column] = String(row[column] ?? "").slice(0, maxLength);
        });
        return XlSX.utils.json_to_sheet(data);
    }

    extractSubstring(sheet, column, newColumn, start, end) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            row[newColumn] = String(row[column] ?? "").slice(start, end);
        });
        return XlSX.utils.json_to_sheet(data);
    }

    reverseText(sheet, column) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            row[column] = String(row[column] ?? "").split("").reverse().join("");
        });
        return XlSX.utils.json_to_sheet(data);
    }

    countCharacters(sheet, column, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            row[newColumn] = String(row[column] ?? "").length;
        });
        return XlSX.utils.json_to_sheet(data);
    }

    countWords(sheet, column, newColumn) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const str = String(row[column] ?? "").trim();
            row[newColumn] = str === "" ? 0 : str.split(/\s+/).length;
        });
        return XlSX.utils.json_to_sheet(data);
    }

    containsCheck(sheet, column, newColumn, substring) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            row[newColumn] = String(row[column] ?? "").includes(substring);
        });
        return XlSX.utils.json_to_sheet(data);
    }

    startsWith(sheet, column, newColumn, prefix) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            row[newColumn] = String(row[column] ?? "").startsWith(prefix);
        });
        return XlSX.utils.json_to_sheet(data);
    }

    endsWith(sheet, column, newColumn, suffix) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            row[newColumn] = String(row[column] ?? "").endsWith(suffix);
        });
        return XlSX.utils.json_to_sheet(data);
    }

    regexExtract(sheet, column, newColumn, pattern, flags = "") {
        const data = XlSX.utils.sheet_to_json(sheet);
        const regex = new RegExp(pattern, flags);
        data.forEach((row) => {
            const match = String(row[column] ?? "").match(regex);
            row[newColumn] = match ? match[0] : "";
        });
        return XlSX.utils.json_to_sheet(data);
    }

    regexReplace(sheet, column, pattern, replaceWith, flags = "g") {
        const data = XlSX.utils.sheet_to_json(sheet);
        const regex = new RegExp(pattern, flags);
        data.forEach((row) => {
            row[column] = String(row[column] ?? "").replace(regex, replaceWith);
        });
        return XlSX.utils.json_to_sheet(data);
    }

    sentenceCase(sheet, column) {
        const data = XlSX.utils.sheet_to_json(sheet);
        data.forEach((row) => {
            const str = String(row[column] ?? "").toLowerCase();
            row[column] = str.charAt(0).toUpperCase() + str.slice(1);
        });
        return XlSX.utils.json_to_sheet(data);
    }
}

export default TextOperations;