import { DateStandard } from '../api/functions/user_choice/dateStandard';
import XLSX from 'xlsx';

test('converts to YYYY-MM-DD format', () => {
  const sheet = {
    A1: { t: 's', v: 'date' },
    A2: { t: 's', v: '01/15/2024' },
    '!ref': 'A1:A2'
  };

  const ds = new DateStandard();
  const result = XLSX.utils.sheet_to_json(ds.dateStandard(sheet, 'date', 'YYYY-MM-DD'));

  expect(result).toEqual([{ date: '2024-01-15' }]);
});

test('converts to MM/DD/YYYY format', () => {
  const sheet = {
    A1: { t: 's', v: 'date' },
    A2: { t: 's', v: '2024-03-20' },
    '!ref': 'A1:A2'
  };

  const ds = new DateStandard();
  const result = XLSX.utils.sheet_to_json(ds.dateStandard(sheet, 'date', 'MM/DD/YYYY'));

  expect(result).toEqual([{ date: '03/20/2024' }]);
});

test('converts to DD-MM-YYYY format', () => {
  const sheet = {
    A1: { t: 's', v: 'date' },
    A2: { t: 's', v: '2024-12-05' },
    '!ref': 'A1:A2'
  };

  const ds = new DateStandard();
  const result = XLSX.utils.sheet_to_json(ds.dateStandard(sheet, 'date', 'DD-MM-YYYY'));

  expect(result).toEqual([{ date: '05-12-2024' }]);
});

test('multiple rows', () => {
  const sheet = {
    A1: { t: 's', v: 'date' },
    A2: { t: 's', v: '2024-01-10' },
    A3: { t: 's', v: '2024-06-25' },
    '!ref': 'A1:A3'
  };

  const ds = new DateStandard();
  const result = XLSX.utils.sheet_to_json(ds.dateStandard(sheet, 'date', 'MM/DD/YYYY'));

  expect(result).toEqual([
    { date: '01/10/2024' },
    { date: '06/25/2024' }
  ]);
});

test('skips invalid dates', () => {
  const sheet = {
    A1: { t: 's', v: 'date' },
    A2: { t: 's', v: 'not-a-date' },
    A3: { t: 's', v: '2024-05-15' },
    '!ref': 'A1:A3'
  };

  const ds = new DateStandard();
  const result = XLSX.utils.sheet_to_json(ds.dateStandard(sheet, 'date', 'YYYY-MM-DD'));

  expect(result[0].date).toBe('not-a-date');
  expect(result[1].date).toBe('2024-05-15');
});

test('skips empty values', () => {
  const sheet = {
    A1: { t: 's', v: 'date' },
    A2: { t: 's', v: '' },
    A3: { t: 's', v: '2024-08-01' },
    '!ref': 'A1:A3'
  };

  const ds = new DateStandard();
  const result = XLSX.utils.sheet_to_json(ds.dateStandard(sheet, 'date', 'DD-MM-YYYY'));

  expect(result[1].date).toBe('01-08-2024');
});

test('non-existent column returns original sheet', () => {
  const sheet = {
    A1: { t: 's', v: 'date' },
    A2: { t: 's', v: '2024-01-01' },
    '!ref': 'A1:A2'
  };

  const ds = new DateStandard();
  const result = ds.dateStandard(sheet, 'nonexistent', 'YYYY-MM-DD');

  expect(result).toBe(sheet);
});

test('only specified column affected', () => {
  const sheet = {
    A1: { t: 's', v: 'date' },
    B1: { t: 's', v: 'name' },
    A2: { t: 's', v: '2024-07-04' },
    B2: { t: 's', v: 'Sam' },
    '!ref': 'A1:B2'
  };

  const ds = new DateStandard();
  const result = XLSX.utils.sheet_to_json(ds.dateStandard(sheet, 'date', 'MM/DD/YYYY'));

  expect(result).toEqual([{ date: '07/04/2024', name: 'Sam' }]);
});
