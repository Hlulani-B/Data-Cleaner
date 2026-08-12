
import XLSX from "xlsx"

export class Lower{
    lower(sheet, column){
        const data = XLSX.utils.sheet_to_json(sheet);
        if(data.length === 0 || !Object.keys(data[0]).includes(column)){
            console.log("Column does not exist");
            return sheet;
        }
        for(let row of data){
            
                if(typeof row[column] === "string"){
                    row[column] = row[column].toLowerCase();
                }
        }
        return XLSX.utils.json_to_sheet(data);
    }
}
