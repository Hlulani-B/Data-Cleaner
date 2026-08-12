import { Duplicate } from '../api/functions/automatic/duplicates';
import XLSX from 'xlsx';

test('removes exact duplicate rows', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    B1: { t: 's', v: 'age' },
    A2: { t: 's', v: 'Sam' },
    B2: { t: 'n', v: 25 },
    A3: { t: 's', v: 'Alex' },
    B3: { t: 'n', v: 30 },
    A4: { t: 's', v: 'Sam' },
    B4: { t: 'n', v: 25 },
    '!ref': 'A1:B4'
  };

  const dup = new Duplicate();
  const result = XLSX.utils.sheet_to_json(dup.duplicate(sheet));

  expect(result).toEqual([
    { name: 'Sam', age: 25 },
    { name: 'Alex', age: 30 }
  ]);
});

test('keeps rows that are similar but not identical', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    B1: { t: 's', v: 'age' },
    A2: { t: 's', v: 'Sam' },
    B2: { t: 'n', v: 25 },
    A3: { t: 's', v: 'Sam' },
    B3: { t: 'n', v: 26 },
    '!ref': 'A1:B3'
  };

  const dup = new Duplicate();
  const result = XLSX.utils.sheet_to_json(dup.duplicate(sheet));

  expect(result).toEqual([
    { name: 'Sam', age: 25 },
    { name: 'Sam', age: 26 }
  ]);
});

test('no duplicates, nothing removed', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'Sam' },
    A3: { t: 's', v: 'Alex' },
    '!ref': 'A1:A3'
  };

  const dup = new Duplicate();
  const result = XLSX.utils.sheet_to_json(dup.duplicate(sheet));

  expect(result).toEqual([
    { name: 'Sam' },
    { name: 'Alex' }
  ]);
});

test('all rows identical, only one kept', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'Sam' },
    A3: { t: 's', v: 'Sam' },
    A4: { t: 's', v: 'Sam' },
    '!ref': 'A1:A4'
  };

  const dup = new Duplicate();
  const result = XLSX.utils.sheet_to_json(dup.duplicate(sheet));

  expect(result).toEqual([{ name: 'Sam' }]);
});