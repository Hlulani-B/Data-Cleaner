import { RemoveColumn } from '../src/functions/user_choice/removeColumn';
import XLSX from 'xlsx';

test('removes specified column', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    B1: { t: 's', v: 'age' },
    A2: { t: 's', v: 'Sam' },
    B2: { t: 'n', v: 25 },
    '!ref': 'A1:B2'
  };

  const rc = new RemoveColumn();
  const result = XLSX.utils.sheet_to_json(rc.remove_column(sheet, 'age'));

  expect(result).toEqual([{ name: 'Sam' }]);
});

test('removes column from multiple rows', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    B1: { t: 's', v: 'city' },
    C1: { t: 's', v: 'zip' },
    A2: { t: 's', v: 'Sam' },
    B2: { t: 's', v: 'NYC' },
    C2: { t: 'n', v: 10001 },
    A3: { t: 's', v: 'Alex' },
    B3: { t: 's', v: 'LA' },
    C3: { t: 'n', v: 90001 },
    '!ref': 'A1:C3'
  };

  const rc = new RemoveColumn();
  const result = XLSX.utils.sheet_to_json(rc.remove_column(sheet, 'city'));

  expect(result).toEqual([
    { name: 'Sam', zip: 10001 },
    { name: 'Alex', zip: 90001 }
  ]);
});

test('non-existent column returns original sheet', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    A2: { t: 's', v: 'Sam' },
    '!ref': 'A1:A2'
  };

  const rc = new RemoveColumn();
  const result = rc.remove_column(sheet, 'nonexistent');

  expect(result).toBe(sheet);
});

test('leaves other columns untouched', () => {
  const sheet = {
    A1: { t: 's', v: 'name' },
    B1: { t: 's', v: 'city' },
    A2: { t: 's', v: 'Sam' },
    B2: { t: 's', v: 'NYC' },
    '!ref': 'A1:B2'
  };

  const rc = new RemoveColumn();
  const result = XLSX.utils.sheet_to_json(rc.remove_column(sheet, 'name'));

  expect(result).toEqual([{ city: 'NYC' }]);
});
