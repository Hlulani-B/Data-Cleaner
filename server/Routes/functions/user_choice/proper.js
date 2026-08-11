import XLSX from "xlsx"

export class Proper{
    proper(sheet, column){
         const data = XLSX.utils.sheet_to_json(sheet);
        if(data.length === 0 || !Object.keys(data[0]).includes(column)){
            console.log("Column does not exist");
            return sheet;
        }
        for(let row of data){
            
                if(typeof row[column] === "string"){
                    let words = row[column].split(" ");
                    for(let i=0; i<words.length; i++){
                        if(words[i].length > 0){
                            words[i] = words[i][0].toUpperCase() + words[i].slice(1).toLowerCase();
                        }
                    }
                    row[column] = words.join(" ");
                }
        }
        return XLSX.utils.json_to_sheet(data);
    }
}