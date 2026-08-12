import XLSX from "xlsx"

export class DateStandard{
    dateStandard(sheet, column, format){
        const data = XLSX.utils.sheet_to_json(sheet);
        if(data.length === 0 || !Object.keys(data[0]).includes(column)){
            console.log("Column does not exist");
            return sheet;
        }

        // Supported formats: "YYYY-MM-DD", "MM/DD/YYYY", "DD-MM-YYYY"
        for(let row of data){
            const val = row[column];
            if(typeof val !== "string" || val.trim() === "") continue;

            const date = new Date(val);
            if(isNaN(date.getTime())) continue;

            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, "0");
            const dd = String(date.getDate()).padStart(2, "0");

            switch(format){
                case "YYYY-MM-DD":
                    row[column] = `${yyyy}-${mm}-${dd}`;
                    break;
                case "MM/DD/YYYY":
                    row[column] = `${mm}/${dd}/${yyyy}`;
                    break;
                case "DD-MM-YYYY":
                    row[column] = `${dd}-${mm}-${yyyy}`;
                    break;
                default:
                    row[column] = `${yyyy}-${mm}-${dd}`;
            }
        }

        return XLSX.utils.json_to_sheet(data);
    }
}
