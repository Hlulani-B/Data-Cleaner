import XLSX from 'xlsx'

export class Clean{
    clean(sheet){
        const data = XLSX.utils.sheet_to_json(sheet);
        if(data.length === 0) return sheet;

        // Remove rows where all values are null, undefined, or empty string
        const cleaned = data.filter(row => {
            const values = Object.values(row);
            return values.some(val =>
                val !== undefined && val !== null && val !== ""
            );
        });

        // Trim string values and convert empty strings to null
        const columns = Object.keys(cleaned[0] || {});
        columns.forEach((col) => {
            for(let row of cleaned){
                if(typeof row[col] === "string"){
                    row[col] = row[col].trim();
                    if(row[col] === "") row[col] = null;
                }
            }
        });

        return XLSX.utils.json_to_sheet(cleaned);
    }
}