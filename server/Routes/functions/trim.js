import XLSX from 'xlsx'

export class Trim{
    trim(sheet){
        const data = XLSX.utils.sheet_to_json(sheet);
        //FOR Trimming. look at first letter if its a blank space remove it then look at las space
  //      data = [
 // name: 'Sam', age: 25 },
//  { name: 'Alex', age: 30 }
//]

//loop though key in each key loop though rows
Object.keys(data[0]).forEach((key)=>{
    for( let row of data){
        //remove first letter while it is blank (handles multiple leading spaces)
        while(typeof row[key]== 'string' && row[key][0]==" "){
            row[key]=row[key].slice(1);
        }
         //remove last letter while it is blank (handles multiple trailing spaces)
         while(typeof row[key]== 'string' && row[key][row[key].length -1]==" "){
            row[key]=row[key].slice(0, row[key].length -1);
        }
        //collapse multiple spaces in the middle down to one space
        if(typeof row[key]== 'string'){
            row[key]=row[key].replace(/ {2,}/g, " ");
        }

    }
})



const newSheet = XLSX.utils.json_to_sheet(data);
return newSheet;
    }
}