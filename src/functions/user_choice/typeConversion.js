import XLSX from "xlsx"

export class TypeConversion{
    typeConversion(sheet, column, targetType){
        const data = XLSX.utils.sheet_to_json(sheet);
        if(data.length === 0 || !Object.keys(data[0]).includes(column)){
            console.log("Column does not exist");
            return sheet;
        }

        for(let row of data){
            const val = row[column];
            if(val === undefined || val === null || val === "") continue;

            switch(targetType){
                case "number":
                    const num = Number(val);
                    if(!isNaN(num)) row[column] = num;
                    break;
                case "string":
                    row[column] = String(val);
                    break;
                case "boolean":
                    if(typeof val === "string"){
                        row[column] = val.toLowerCase() === "true" || val === "1";
                    } else {
                        row[column] = Boolean(val);
                    }
                    break;
            }
        }

        return XLSX.utils.json_to_sheet(data);
    }
}
