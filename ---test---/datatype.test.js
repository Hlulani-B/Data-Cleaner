import { Datatype } from '../api/functions/automatic/datatype';
import XLSX from 'xlsx';

test('converts numeric strings to numbers', () => {
  const sheet = {
    A1: { t: 's', v: 'age' },
    A2: { t: 's', v: '25' },
    A3: { t: 's', v: '30' },
    '!ref': 'A1:A3'
  };

  const dt = new Datatype();
  const result = XLSX.utils.sheet_to_json(dt.datatype(sheet));

  expect(result).toEqual([{ age: 25 }, { age: 30 }]);
});

test('leaves non-numeric strings as strings', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'Sam' },
    A3: { t: 's', v: 'Alex' },
    '!ref': 'A1:A3'
  };

  const dt = new Datatype();
  const result = XLSX.utils.sheet_to_json(dt.datatype(sheet));

  expect(result).toEqual([{ name: 'Sam' }, { name: 'Alex' }]);
});

test('mixed columns: converts numeric column, leaves text column', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    B1: { t: 's', v: 'age' },
    A2: { t: 's', v: 'Sam' },
    B2: { t: 's', v: '25' },
    A3: { t: 's', v: 'Alex' },
    B3: { t: 's', v: '30' },
    '!ref': 'A1:B3'
  };

  const dt = new Datatype();
  const result = XLSX.utils.sheet_to_json(dt.datatype(sheet));

  expect(result).toEqual([
    { name: 'Sam', age: 25 },
    { name: 'Alex', age: 30 }
  ]);
});

test('column with mixed numeric and text stays as strings', () => {
  const sheet = {
    A1: { t: 's', v: 'value' },
    A2: { t: 's', v: '123' },
    A3: { t: 's', v: 'abc' },
    '!ref': 'A1:A3'
  };

  const dt = new Datatype();
  const result = XLSX.utils.sheet_to_json(dt.datatype(sheet));

  expect(result).toEqual([{ value: '123' }, { value: 'abc' }]);
});

test('handles decimal numbers', () => {
  const sheet = {
    A1: { t: 's', v: 'price' },
    A2: { t: 's', v: '9.99' },
    A3: { t: 's', v: '19.50' },
    '!ref': 'A1:A3'
  };

  const dt = new Datatype();
  const result = XLSX.utils.sheet_to_json(dt.datatype(sheet));

  expect(result).toEqual([{ price: 9.99 }, { price: 19.5 }]);
});

test('skips empty values in numeric column', () => {
  const sheet = {
    A1: { t: 's', v: 'age' },
    A2: { t: 's', v: '25' },
    A3: { t: 's', v: '' },
    '!ref': 'A1:A3'
  };

  const dt = new Datatype();
  const result = XLSX.utils.sheet_to_json(dt.datatype(sheet));

  expect(result[0].age).toBe(25);
});
