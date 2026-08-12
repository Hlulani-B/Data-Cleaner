import XLSX from "xlsx"

export class Datatype{
    datatype(sheet){
        const data = XLSX.utils.sheet_to_json(sheet);
        if(data.length === 0) return sheet;

        const columns = Object.keys(data[0]);

        columns.forEach((col) => {
            // Check if all non-empty values in the column are numeric strings
            const allNumeric = data.every(row => {
                const val = row[col];
                if(val === undefined || val === null || val === "") return true;
                return typeof val === "string" && !isNaN(Number(val)) && val.trim() !== "";
            });

            if(allNumeric){
                for(let row of data){
                    if(row[col] !== undefined && row[col] !== null && row[col] !== ""){
                        row[col] = Number(row[col]);
                    }
                }
            }
        });

        return XLSX.utils.json_to_sheet(data);
    }
}
