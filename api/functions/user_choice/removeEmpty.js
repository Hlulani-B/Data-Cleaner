import XLSX from "xlsx"

export class RemoveEmpty{
    remove_empty(sheet){
        const data = XLSX.utils.sheet_to_json(sheet);
        if(data.length === 0) return sheet;

        const filtered = data.filter(row => {
            const values = Object.values(row);
            // Keep row if at least one value is non-empty
            return values.some(val =>
                val !== undefined && val !== null && val !== ""
            );
        });

        return XLSX.utils.json_to_sheet(filtered);
    }
}
