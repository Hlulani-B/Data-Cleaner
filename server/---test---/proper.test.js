import { Proper } from '../Routes/functions/user_choice/proper';
import XLSX from 'xlsx';

test('capitalizes first letter of each word', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'sam jones' },
    '!ref': 'A1:A2'
  };

  const proper = new Proper();
  const result = XLSX.utils.sheet_to_json(proper.proper(sheet, 'name'));

  expect(result).toEqual([{ name: 'Sam Jones' }]);
});

test('uppercase to proper case', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'SAM JONES' },
    '!ref': 'A1:A2'
  };

  const proper = new Proper();
  const result = XLSX.utils.sheet_to_json(proper.proper(sheet, 'name'));

  expect(result).toEqual([{ name: 'Sam Jones' }]);
});

test('mixed case to proper case', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'sAm JoNeS' },
    '!ref': 'A1:A2'
  };

  const proper = new Proper();
  const result = XLSX.utils.sheet_to_json(proper.proper(sheet, 'name'));

  expect(result).toEqual([{ name: 'Sam Jones' }]);
});

test('single word', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'sam' },
    '!ref': 'A1:A2'
  };

  const proper = new Proper();
  const result = XLSX.utils.sheet_to_json(proper.proper(sheet, 'name'));

  expect(result).toEqual([{ name: 'Sam' }]);
});

test('already proper case stays the same', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'Sam Jones' },
    '!ref': 'A1:A2'
  };

  const proper = new Proper();
  const result = XLSX.utils.sheet_to_json(proper.proper(sheet, 'name'));

  expect(result).toEqual([{ name: 'Sam Jones' }]);
});

test('numbers untouched', () => {
  const sheet = {
    A1: { t: 's', v: 'age' },
    A2: { t: 'n', v: 25 },
    '!ref': 'A1:A2'
  };

  const proper = new Proper();
  const result = XLSX.utils.sheet_to_json(proper.proper(sheet, 'age'));

  expect(result).toEqual([{ age: 25 }]);
});

test('multiple rows', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'sam smith' },
    A3: { t: 's', v: 'alex brown' },
    '!ref': 'A1:A3'
  };

  const proper = new Proper();
  const result = XLSX.utils.sheet_to_json(proper.proper(sheet, 'name'));

  expect(result).toEqual([
    { name: 'Sam Smith' },
    { name: 'Alex Brown' }
  ]);
});

test('only specified column affected', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    B1: { t: 's', v: 'city' },
    A2: { t: 's', v: 'sam jones' },
    B2: { t: 's', v: 'new york' },
    '!ref': 'A1:B2'
  };

  const proper = new Proper();
  const result = XLSX.utils.sheet_to_json(proper.proper(sheet, 'name'));

  expect(result).toEqual([{ name: 'Sam Jones', city: 'new york' }]);
});

test('non-existent column returns original sheet', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'sam' },
    '!ref': 'A1:A2'
  };

  const proper = new Proper();
  const result = proper.proper(sheet, 'nonexistent');

  expect(result).toBe(sheet);
});

test('handles repeated characters correctly', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'sarah sullivan' },
    '!ref': 'A1:A2'
  };

  const proper = new Proper();
  const result = XLSX.utils.sheet_to_json(proper.proper(sheet, 'name'));

  expect(result).toEqual([{ name: 'Sarah Sullivan' }]);
});
