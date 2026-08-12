import { Clean } from '../src/functions/automatic/clean';
import { cleanData } from '../src/utils/cleaners';
import XLSX from 'xlsx';

test('removes fully empty rows', () => {
  const data = [
    { name: 'Sam', age: 25 },
    { name: '', age: '' },
    { name: 'Alex', age: 30 }
  ];
  const sheet = XLSX.utils.json_to_sheet(data);

  const clean = new Clean();
  const result = XLSX.utils.sheet_to_json(clean.clean(sheet));

  expect(result).toEqual([
    { name: 'Sam', age: 25 },
    { name: 'Alex', age: 30 }
  ]);
});

test('trims whitespace from string values', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: '  Sam  ' },
    '!ref': 'A1:A2'
  };

  const clean = new Clean();
  const result = XLSX.utils.sheet_to_json(clean.clean(sheet));

  expect(result).toEqual([{ name: 'Sam' }]);
});

test('converts whitespace-only strings to null', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    B1: { t: 's', v: 'city' },
    A2: { t: 's', v: 'Sam' },
    B2: { t: 's', v: '   ' },
    '!ref': 'A1:B2'
  };

  const clean = new Clean();
  const result = XLSX.utils.sheet_to_json(clean.clean(sheet));

  expect(result[0].name).toBe('Sam');
  expect(result[0].city).toBeNull();
});

test('removes rows where all values are null', () => {
  const data = [
    { name: 'Sam' },
    { name: null },
    { name: 'Alex' }
  ];
  const sheet = XLSX.utils.json_to_sheet(data);

  const clean = new Clean();
  const result = XLSX.utils.sheet_to_json(clean.clean(sheet));

  expect(result.length).toBe(2);
  expect(result[0].name).toBe('Sam');
  expect(result[1].name).toBe('Alex');
});

test('numbers untouched', () => {
  const sheet = {
    A1: { t: 's', v: 'age' },
    A2: { t: 'n', v: 25 },
    '!ref': 'A1:A2'
  };

  const clean = new Clean();
  const result = XLSX.utils.sheet_to_json(clean.clean(sheet));

  expect(result).toEqual([{ age: 25 }]);
});

test('multiple columns cleaned and empty rows removed', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    B1: { t: 's', v: 'city' },
    A2: { t: 's', v: '  Sam  ' },
    B2: { t: 's', v: '  NYC  ' },
    A3: { t: 's', v: '' },
    B3: { t: 's', v: '' },
    A4: { t: 's', v: 'Alex' },
    B4: { t: 's', v: 'LA' },
    '!ref': 'A1:B4'
  };

  const clean = new Clean();
  const result = XLSX.utils.sheet_to_json(clean.clean(sheet));

  expect(result).toEqual([
    { name: 'Sam', city: 'NYC' },
    { name: 'Alex', city: 'LA' }
  ]);
});

test('removes rows that are only whitespace after trimming', () => {
  const data = [
    { name: 'Sam' },
    { name: '   ' },
    { name: 'Alex' }
  ];
  const sheet = XLSX.utils.json_to_sheet(data);

  const clean = new Clean();
  const result = XLSX.utils.sheet_to_json(clean.clean(sheet));

  expect(result).toEqual([
    { name: 'Sam' },
    { name: 'Alex' }
  ]);
});

describe('cleanData (client-side mirror)', () => {
  test('removes fully empty rows', () => {
    const data = [
      { name: 'Sam', age: 25 },
      { name: '', age: '' },
      { name: 'Alex', age: 30 }
    ];
    expect(cleanData(data)).toEqual([
      { name: 'Sam', age: 25 },
      { name: 'Alex', age: 30 }
    ]);
  });

  test('trims whitespace and converts empties to null', () => {
    const data = [
      { name: '  Sam  ', city: '   ' },
      { name: 'Alex', city: 'LA' }
    ];
    expect(cleanData(data)).toEqual([
      { name: 'Sam', city: null },
      { name: 'Alex', city: 'LA' }
    ]);
  });

  test('removes rows that are only whitespace after trimming', () => {
    const data = [
      { name: 'Sam' },
      { name: '   ' },
      { name: 'Alex' }
    ];
    expect(cleanData(data)).toEqual([
      { name: 'Sam' },
      { name: 'Alex' }
    ]);
  });

  test('leaves numbers untouched', () => {
    expect(cleanData([{ age: 25 }, { age: '' }])).toEqual([{ age: 25 }]);
  });
});
