import { Upper } from '../Routes/functions/user_choice/upper';
import XLSX from 'xlsx';

test('converts column to uppercase', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'sam jones' },
    '!ref': 'A1:A2'
  };

  const upper = new Upper();
  const result = XLSX.utils.sheet_to_json(upper.upper(sheet, 'name'));

  expect(result).toEqual([{ name: 'SAM JONES' }]);
});

test('mixed case to uppercase', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'SaM JoNeS' },
    '!ref': 'A1:A2'
  };

  const upper = new Upper();
  const result = XLSX.utils.sheet_to_json(upper.upper(sheet, 'name'));

  expect(result).toEqual([{ name: 'SAM JONES' }]);
});

test('already uppercase stays the same', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'SAM' },
    '!ref': 'A1:A2'
  };

  const upper = new Upper();
  const result = XLSX.utils.sheet_to_json(upper.upper(sheet, 'name'));

  expect(result).toEqual([{ name: 'SAM' }]);
});

test('numbers untouched', () => {
  const sheet = {
    A1: { t: 's', v: 'age' },
    A2: { t: 'n', v: 25 },
    '!ref': 'A1:A2'
  };

  const upper = new Upper();
  const result = XLSX.utils.sheet_to_json(upper.upper(sheet, 'age'));

  expect(result).toEqual([{ age: 25 }]);
});

test('multiple rows', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'sam' },
    A3: { t: 's', v: 'alex' },
    '!ref': 'A1:A3'
  };

  const upper = new Upper();
  const result = XLSX.utils.sheet_to_json(upper.upper(sheet, 'name'));

  expect(result).toEqual([
    { name: 'SAM' },
    { name: 'ALEX' }
  ]);
});

test('only specified column affected', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    B1: { t: 's', v: 'city' },
    A2: { t: 's', v: 'sam' },
    B2: { t: 's', v: 'new york' },
    '!ref': 'A1:B2'
  };

  const upper = new Upper();
  const result = XLSX.utils.sheet_to_json(upper.upper(sheet, 'name'));

  expect(result).toEqual([{ name: 'SAM', city: 'new york' }]);
});

test('non-existent column returns original sheet', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'sam' },
    '!ref': 'A1:A2'
  };

  const upper = new Upper();
  const result = upper.upper(sheet, 'nonexistent');

  expect(result).toBe(sheet);
});
