import XLSX from "xlsx"

export class Search{
    search(sheet,keyword){
        let data= XLSX.utils.sheet_to_json(sheet)
        const results=[];
        data.map((row)=>{
           for(let key of row){
            if(key.includes(keyword)){
                results.push(row);
            }
           }
        });
        return row;
    }
}