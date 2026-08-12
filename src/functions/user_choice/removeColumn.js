import XLSX from "xlsx"

export class RemoveColumn{
    remove_column(sheet, column){
        const data = XLSX.utils.sheet_to_json(sheet)
        if(data.length === 0 || !Object.keys(data[0]).includes(column)){
            console.log("Column does not exist")
            return sheet
        }
        data.forEach(row => delete row[column])
        return XLSX.utils.json_to_sheet(data)
    }
}
