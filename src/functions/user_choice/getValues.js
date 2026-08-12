import XLSX from "xlsx"

export class Values{
    getValues(sheet,column){
        const data= XLSX.utils.sheet_to_json(sheet);
        const values=[];
        data.map((row)=>{
            if(!values.includes(row[column])){
                values.push(row[column]);
            }
        });
        return values;
        
    }

    replaceValues(sheet,column,value,replace_with){
         const data= XLSX.utils.sheet_to_json(sheet);
data.map((row)=>{
    if(row[column]==value){
        row[column]=replace_with;
    }
});
return XLSX.utils.json_to_sheet(data);
    }

    rewrite(sheet,column,contains,replace_with){
        const data= XLSX.utils.sheet_to_json(sheet);
data.map((row)=>{
    if(row[column].includes(contains)){
        row[column]=row[column].replace(contains,replace_with);
    }
});
return XLSX.utils.json_to_sheet(data);

    }
}
