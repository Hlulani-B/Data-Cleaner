import { RemoveEmpty } from '../src/functions/user_choice/removeEmpty';
import XLSX from 'xlsx';

test('removes rows where all values are empty', () => {
  const data = [
    { name: 'Sam', age: 25 },
    { name: '', age: '' },
    { name: 'Alex', age: 30 }
  ];
  const sheet = XLSX.utils.json_to_sheet(data);

  const re = new RemoveEmpty();
  const result = XLSX.utils.sheet_to_json(re.remove_empty(sheet));

  expect(result).toEqual([
    { name: 'Sam', age: 25 },
    { name: 'Alex', age: 30 }
  ]);
});

test('keeps rows with at least one non-empty value', () => {
  const data = [
    { name: 'Sam', age: '' },
    { name: '', age: 30 }
  ];
  const sheet = XLSX.utils.json_to_sheet(data);

  const re = new RemoveEmpty();
  const result = XLSX.utils.sheet_to_json(re.remove_empty(sheet));

  expect(result).toEqual([
    { name: 'Sam', age: '' },
    { name: '', age: 30 }
  ]);
});

test('no empty rows, nothing removed', () => {
  const data = [
    { name: 'Sam' },
    { name: 'Alex' }
  ];
  const sheet = XLSX.utils.json_to_sheet(data);

  const re = new RemoveEmpty();
  const result = XLSX.utils.sheet_to_json(re.remove_empty(sheet));

  expect(result).toEqual([
    { name: 'Sam' },
    { name: 'Alex' }
  ]);
});

test('all rows empty returns empty array', () => {
  const data = [
    { name: '', age: '' },
    { name: '', age: '' }
  ];
  const sheet = XLSX.utils.json_to_sheet(data);

  const re = new RemoveEmpty();
  const result = XLSX.utils.sheet_to_json(re.remove_empty(sheet));

  expect(result).toEqual([]);
});

test('handles null and undefined as empty', () => {
  const data = [
    { name: 'Sam', age: 25 },
    { name: null, age: null },
    { name: 'Alex', age: 30 }
  ];
  const sheet = XLSX.utils.json_to_sheet(data);

  const re = new RemoveEmpty();
  const result = XLSX.utils.sheet_to_json(re.remove_empty(sheet));

  expect(result.length).toBe(2);
  expect(result[0].name).toBe('Sam');
  expect(result[1].name).toBe('Alex');
});
