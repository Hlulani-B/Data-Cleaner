import { MissingValues } from '../src/functions/user_choice/missingValues';
import XLSX from 'xlsx';

describe('find_missing', () => {
  test('finds rows with empty string values', () => {
    const data = [
      { name: 'Sam', age: 25 },
      { name: '', age: 30 },
      { name: 'Alex', age: 28 }
    ];
    const sheet = XLSX.utils.json_to_sheet(data);

    const mv = new MissingValues();
    const result = XLSX.utils.sheet_to_json(mv.find_missing(sheet));

    expect(result.length).toBe(1);
    expect(result[0].rowIndex).toBe(1);
  });

  test('finds rows with null values', () => {
    const data = [
      { name: 'Sam', age: 25 },
      { name: null, age: 30 },
      { name: 'Alex', age: 28 }
    ];
    const sheet = XLSX.utils.json_to_sheet(data);

    const mv = new MissingValues();
    const result = XLSX.utils.sheet_to_json(mv.find_missing(sheet));

    expect(result.length).toBe(1);
    expect(result[0].rowIndex).toBe(1);
  });

  test('no missing values returns empty sheet', () => {
    const data = [
      { name: 'Sam', age: 25 },
      { name: 'Alex', age: 30 }
    ];
    const sheet = XLSX.utils.json_to_sheet(data);

    const mv = new MissingValues();
    const result = XLSX.utils.sheet_to_json(mv.find_missing(sheet));

    expect(result).toEqual([]);
  });

  test('multiple rows with missing values', () => {
    const data = [
      { name: '', age: 25 },
      { name: 'Alex', age: '' },
      { name: 'Sam', age: 30 }
    ];
    const sheet = XLSX.utils.json_to_sheet(data);

    const mv = new MissingValues();
    const result = XLSX.utils.sheet_to_json(mv.find_missing(sheet));

    expect(result.length).toBe(2);
    expect(result[0].rowIndex).toBe(0);
    expect(result[1].rowIndex).toBe(1);
  });

  test('row with all values missing still detected', () => {
    const data = [
      { name: 'Sam', age: 25 },
      { name: '', age: '' },
      { name: 'Alex', age: 30 }
    ];
    const sheet = XLSX.utils.json_to_sheet(data);

    const mv = new MissingValues();
    const result = XLSX.utils.sheet_to_json(mv.find_missing(sheet));

    expect(result.length).toBe(1);
    expect(result[0].rowIndex).toBe(1);
  });
});

describe('remove_rows', () => {
  test('removes specified rows by index', () => {
    const data = [
      { name: 'Sam', age: 25 },
      { name: 'Alex', age: 30 },
      { name: 'Jordan', age: 35 }
    ];
    const sheet = XLSX.utils.json_to_sheet(data);

    const mv = new MissingValues();
    const result = XLSX.utils.sheet_to_json(mv.remove_rows(sheet, [1]));

    expect(result).toEqual([
      { name: 'Sam', age: 25 },
      { name: 'Jordan', age: 35 }
    ]);
  });

  test('removes multiple rows', () => {
    const data = [
      { name: 'Sam', age: 25 },
      { name: 'Alex', age: 30 },
      { name: 'Jordan', age: 35 },
      { name: 'Casey', age: 40 }
    ];
    const sheet = XLSX.utils.json_to_sheet(data);

    const mv = new MissingValues();
    const result = XLSX.utils.sheet_to_json(mv.remove_rows(sheet, [0, 2]));

    expect(result).toEqual([
      { name: 'Alex', age: 30 },
      { name: 'Casey', age: 40 }
    ]);
  });

  test('empty indices array keeps all rows', () => {
    const data = [
      { name: 'Sam', age: 25 },
      { name: 'Alex', age: 30 }
    ];
    const sheet = XLSX.utils.json_to_sheet(data);

    const mv = new MissingValues();
    const result = XLSX.utils.sheet_to_json(mv.remove_rows(sheet, []));

    expect(result).toEqual([
      { name: 'Sam', age: 25 },
      { name: 'Alex', age: 30 }
    ]);
  });

  test('removes all rows returns empty', () => {
    const data = [
      { name: 'Sam', age: 25 },
      { name: 'Alex', age: 30 }
    ];
    const sheet = XLSX.utils.json_to_sheet(data);

    const mv = new MissingValues();
    const result = XLSX.utils.sheet_to_json(mv.remove_rows(sheet, [0, 1]));

    expect(result).toEqual([]);
  });
});
