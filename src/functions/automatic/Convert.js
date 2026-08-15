import XLSX from 'xlsx';
import fs from 'fs';


export class Convert
 {
    csv_xlsx_client(file_path){
        const workbook = XLSX.readFile(file_path, { codepage: 65001 });
        // workbook = {
//   SheetNames: ['Sheet1'],
//   Sheets: {
//     Sheet1: { A1: {...}, B1: {...}, A2: {...}, ... }  // cell data
//   }
// }

const outputPath = file.path + '.xlsx';
XLSX.writeFile(workbook, outputPath);

res.download(outputPath, 'converted.xlsx', () => {
  fs.unlinkSync(file.path);
  fs.unlinkSync(outputPath);
});

    }



    csv_xlsx(file_path){
        const workbook = XLSX.readFile(file_path, { codepage: 65001 });
        // workbook = {
//   SheetNames: ['Sheet1'],
//   Sheets: {
//     Sheet1: { A1: {...}, B1: {...}, A2: {...}, ... }  // cell data
//   }
// }

const outputPath = file.path + '.xlsx';
XLSX.writeFile(workbook, outputPath);

//send the file to the trimmer

    }

}