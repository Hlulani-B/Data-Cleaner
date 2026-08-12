import { TypeConversion } from '../src/functions/user_choice/typeConversion';
import XLSX from 'xlsx';

test('converts string column to number', () => {
  const sheet = {
    A1: { t: 's', v: 'age' },
    A2: { t: 's', v: '25' },
    A3: { t: 's', v: '30' },
    '!ref': 'A1:A3'
  };

  const tc = new TypeConversion();
  const result = XLSX.utils.sheet_to_json(tc.typeConversion(sheet, 'age', 'number'));

  expect(result).toEqual([{ age: 25 }, { age: 30 }]);
});

test('converts number column to string', () => {
  const sheet = {
    A1: { t: 's', v: 'age' },
    A2: { t: 'n', v: 25 },
    A3: { t: 'n', v: 30 },
    '!ref': 'A1:A3'
  };

  const tc = new TypeConversion();
  const result = XLSX.utils.sheet_to_json(tc.typeConversion(sheet, 'age', 'string'));

  expect(result).toEqual([{ age: '25' }, { age: '30' }]);
});

test('converts string to boolean (true/false)', () => {
  const sheet = {
    A1: { t: 's', v: 'active' },
    A2: { t: 's', v: 'true' },
    A3: { t: 's', v: 'false' },
    '!ref': 'A1:A3'
  };

  const tc = new TypeConversion();
  const result = XLSX.utils.sheet_to_json(tc.typeConversion(sheet, 'active', 'boolean'));

  expect(result).toEqual([{ active: true }, { active: false }]);
});

test('converts 1/0 strings to boolean', () => {
  const sheet = {
    A1: { t: 's', v: 'active' },
    A2: { t: 's', v: '1' },
    A3: { t: 's', v: '0' },
    '!ref': 'A1:A3'
  };

  const tc = new TypeConversion();
  const result = XLSX.utils.sheet_to_json(tc.typeConversion(sheet, 'active', 'boolean'));

  expect(result).toEqual([{ active: true }, { active: false }]);
});

test('skips non-convertible values for number', () => {
  const sheet = {
    A1: { t: 's', v: 'value' },
    A2: { t: 's', v: '42' },
    A3: { t: 's', v: 'abc' },
    '!ref': 'A1:A3'
  };

  const tc = new TypeConversion();
  const result = XLSX.utils.sheet_to_json(tc.typeConversion(sheet, 'value', 'number'));

  expect(result[0].value).toBe(42);
  expect(result[1].value).toBe('abc');
});

test('non-existent column returns original sheet', () => {
  const sheet = {
    A1: { t: 's', v: 'age' },
    A2: { t: 's', v: '25' },
    '!ref': 'A1:A2'
  };

  const tc = new TypeConversion();
  const result = tc.typeConversion(sheet, 'nonexistent', 'number');

  expect(result).toBe(sheet);
});

test('only specified column affected', () => {
  const sheet = {
    A1: { t: 's', v: 'age' },
    B1: { t: 's', v: 'name' },
    A2: { t: 's', v: '25' },
    B2: { t: 's', v: 'Sam' },
    '!ref': 'A1:B2'
  };

  const tc = new TypeConversion();
  const result = XLSX.utils.sheet_to_json(tc.typeConversion(sheet, 'age', 'number'));

  expect(result).toEqual([{ age: 25, name: 'Sam' }]);
});

test('handles decimal string to number', () => {
  const sheet = {
    A1: { t: 's', v: 'price' },
    A2: { t: 's', v: '9.99' },
    '!ref': 'A1:A2'
  };

  const tc = new TypeConversion();
  const result = XLSX.utils.sheet_to_json(tc.typeConversion(sheet, 'price', 'number'));

  expect(result).toEqual([{ price: 9.99 }]);
});
