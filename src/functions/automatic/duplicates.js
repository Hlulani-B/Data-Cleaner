import XLSX from "xlsx"

export class Duplicate{
    duplicate(sheet){
        const data= XLSX.utils.sheet_to_json(sheet);
        const new_data=[];
        for(let row of data){
            const rowString = JSON.stringify(row);
            const alreadyExists = new_data.some(existingRow => JSON.stringify(existingRow) === rowString);
            if(!alreadyExists){
                new_data.push(row);
            }
        }

        return XLSX.utils.json_to_sheet(new_data);
    }
}