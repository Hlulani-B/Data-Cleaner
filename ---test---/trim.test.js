import { Trim } from '../api/functions/automatic/trim';
import XLSX from 'xlsx';

test('leading and trailing spaces', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: '   Sam Jones   ' },
    '!ref': 'A1:A2'
  };

  const trimmer = new Trim();
  const result = XLSX.utils.sheet_to_json(trimmer.trim(sheet));

  expect(result).toEqual([{ name: 'Sam Jones' }]);
});

test('multiple spaces in middle', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'Sam     Jones' },
    '!ref': 'A1:A2'
  };

  const trimmer = new Trim();
  const result = XLSX.utils.sheet_to_json(trimmer.trim(sheet));

  expect(result).toEqual([{ name: 'Sam Jones' }]);
});

test('no spaces stays the same', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'Sam' },
    '!ref': 'A1:A2'
  };

  const trimmer = new Trim();
  const result = XLSX.utils.sheet_to_json(trimmer.trim(sheet));

  expect(result).toEqual([{ name: 'Sam' }]);
});

test('numbers untouched', () => {
  const sheet = {
    A1: { t: 's', v: 'age' },
    A2: { t: 'n', v: 25 },
    '!ref': 'A1:A2'
  };

  const trimmer = new Trim();
  const result = XLSX.utils.sheet_to_json(trimmer.trim(sheet));

  expect(result).toEqual([{ age: 25 }]);
});

test('multiple rows and columns', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    B1: { t: 's', v: 'age' },
    A2: { t: 's', v: '  Sam  ' },
    B2: { t: 'n', v: 25 },
    A3: { t: 's', v: 'Alex   Smith' },
    B3: { t: 'n', v: 30 },
    '!ref': 'A1:B3'
  };

  const trimmer = new Trim();
  const result = XLSX.utils.sheet_to_json(trimmer.trim(sheet));

  expect(result).toEqual([
    { name: 'Sam', age: 25 },
    { name: 'Alex Smith', age: 30 }
  ]);
});