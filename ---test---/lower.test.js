import { Lower } from '../api/functions/user_choice/lower';
import XLSX from 'xlsx';

test('converts column to lowercase', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'SAM JONES' },
    '!ref': 'A1:A2'
  };

  const lower = new Lower();
  const result = XLSX.utils.sheet_to_json(lower.lower(sheet, 'name'));

  expect(result).toEqual([{ name: 'sam jones' }]);
});

test('mixed case to lowercase', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'SaM JoNeS' },
    '!ref': 'A1:A2'
  };

  const lower = new Lower();
  const result = XLSX.utils.sheet_to_json(lower.lower(sheet, 'name'));

  expect(result).toEqual([{ name: 'sam jones' }]);
});

test('already lowercase stays the same', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'sam' },
    '!ref': 'A1:A2'
  };

  const lower = new Lower();
  const result = XLSX.utils.sheet_to_json(lower.lower(sheet, 'name'));

  expect(result).toEqual([{ name: 'sam' }]);
});

test('numbers untouched', () => {
  const sheet = {
    A1: { t: 's', v: 'age' },
    A2: { t: 'n', v: 25 },
    '!ref': 'A1:A2'
  };

  const lower = new Lower();
  const result = XLSX.utils.sheet_to_json(lower.lower(sheet, 'age'));

  expect(result).toEqual([{ age: 25 }]);
});

test('multiple rows', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'SAM' },
    A3: { t: 's', v: 'ALEX' },
    '!ref': 'A1:A3'
  };

  const lower = new Lower();
  const result = XLSX.utils.sheet_to_json(lower.lower(sheet, 'name'));

  expect(result).toEqual([
    { name: 'sam' },
    { name: 'alex' }
  ]);
});

test('only specified column affected', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    B1: { t: 's', v: 'city' },
    A2: { t: 's', v: 'SAM' },
    B2: { t: 's', v: 'NEW YORK' },
    '!ref': 'A1:B2'
  };

  const lower = new Lower();
  const result = XLSX.utils.sheet_to_json(lower.lower(sheet, 'name'));

  expect(result).toEqual([{ name: 'sam', city: 'NEW YORK' }]);
});

test('non-existent column returns original sheet', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'SAM' },
    '!ref': 'A1:A2'
  };

  const lower = new Lower();
  const result = lower.lower(sheet, 'nonexistent');

  expect(result).toBe(sheet);
});
