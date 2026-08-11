import XLSX from 'xlsx'

export class Clean{
    clean(sheet){
        const data = XLSX.utils.sheet_to_json(sheet);

    }
}