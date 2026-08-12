import XLSX from "xlsx"

export class MissingValues{
    // 1. finds rows that have at least one missing value, returns them as a sheet
    find_missing(sheet){
        const data = XLSX.utils.sheet_to_json(sheet)
        const missing_rows = []

        for(let i=0; i<data.length; i++){
            let row = data[i]
            let has_missing = false

            for(let key in row){
                if(row[key] === "" || row[key] === null || row[key] === undefined){
                    has_missing = true
                }
            }

            if(has_missing){
                row.rowIndex = i
                missing_rows.push(row)
            }
        }

        return XLSX.utils.json_to_sheet(missing_rows)
    }

    // 2. removes the given row indices from the given sheet
    remove_rows(sheet, row_indices){
        const data = XLSX.utils.sheet_to_json(sheet)
        const cleaned_data = []

        for(let i=0; i<data.length; i++){
            if(!row_indices.includes(i)){
                cleaned_data.push(data[i])
            }
        }

        return XLSX.utils.json_to_sheet(cleaned_data)
    }
}
