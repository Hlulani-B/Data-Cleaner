import { Values } from '../src/functions/user_choice/getValues';
import XLSX from 'xlsx';

function makeSheet(data) { return XLSX.utils.json_to_sheet(data); }

const v = new Values();

// ─── getValues ───

test('getValues returns unique values from a column', () => {
  const data = [{ color: 'red' }, { color: 'blue' }, { color: 'red' }, { color: 'green' }];
  const result = v.getValues(makeSheet(data), 'color');
  expect(result).toEqual(['red', 'blue', 'green']);
});

test('getValues with all same values returns single entry', () => {
  const data = [{ status: 'active' }, { status: 'active' }, { status: 'active' }];
  const result = v.getValues(makeSheet(data), 'status');
  expect(result).toEqual(['active']);
});

test('getValues with numbers', () => {
  const data = [{ age: 25 }, { age: 30 }, { age: 25 }, { age: 40 }];
  const result = v.getValues(makeSheet(data), 'age');
  expect(result).toEqual([25, 30, 40]);
});

test('getValues includes undefined for missing column', () => {
  const data = [{ name: 'Alice' }, { name: 'Bob' }];
  const result = v.getValues(makeSheet(data), 'missing');
  expect(result).toEqual([undefined]);
});

test('getValues preserves insertion order', () => {
  const data = [{ x: 'c' }, { x: 'a' }, { x: 'b' }, { x: 'a' }];
  const result = v.getValues(makeSheet(data), 'x');
  expect(result).toEqual(['c', 'a', 'b']);
});

test('getValues with empty data returns empty array', () => {
  const sheet = XLSX.utils.json_to_sheet([]);
  const result = v.getValues(sheet, 'col');
  expect(result).toEqual([]);
});

// ─── replaceValues ───

test('replaceValues replaces exact matching values', () => {
  const data = [{ status: 'active' }, { status: 'inactive' }, { status: 'active' }];
  const result = XLSX.utils.sheet_to_json(v.replaceValues(makeSheet(data), 'status', 'active', 'enabled'));
  expect(result[0].status).toBe('enabled');
  expect(result[1].status).toBe('inactive');
  expect(result[2].status).toBe('enabled');
});

test('replaceValues does not partial match', () => {
  const data = [{ name: 'Sam' }, { name: 'Samuel' }, { name: 'Sam' }];
  const result = XLSX.utils.sheet_to_json(v.replaceValues(makeSheet(data), 'name', 'Sam', 'Alex'));
  expect(result[0].name).toBe('Alex');
  expect(result[1].name).toBe('Samuel');
  expect(result[2].name).toBe('Alex');
});

test('replaceValues with numbers', () => {
  const data = [{ val: 1 }, { val: 2 }, { val: 1 }];
  const result = XLSX.utils.sheet_to_json(v.replaceValues(makeSheet(data), 'val', 1, 99));
  expect(result[0].val).toBe(99);
  expect(result[1].val).toBe(2);
  expect(result[2].val).toBe(99);
});

test('replaceValues leaves non-matching rows unchanged', () => {
  const data = [{ x: 'a' }, { x: 'b' }, { x: 'c' }];
  const result = XLSX.utils.sheet_to_json(v.replaceValues(makeSheet(data), 'x', 'z', 'replaced'));
  expect(result.map(r => r.x)).toEqual(['a', 'b', 'c']);
});

// ─── rewrite ───

test('rewrite replaces substring within values', () => {
  const data = [{ text: 'hello world' }, { text: 'goodbye world' }];
  const result = XLSX.utils.sheet_to_json(v.rewrite(makeSheet(data), 'text', 'world', 'earth'));
  expect(result[0].text).toBe('hello earth');
  expect(result[1].text).toBe('goodbye earth');
});

test('rewrite only replaces first occurrence', () => {
  const data = [{ text: 'aaa' }];
  const result = XLSX.utils.sheet_to_json(v.rewrite(makeSheet(data), 'text', 'a', 'b'));
  expect(result[0].text).toBe('baa');
});

test('rewrite leaves rows without substring unchanged', () => {
  const data = [{ text: 'hello' }, { text: 'goodbye' }];
  const result = XLSX.utils.sheet_to_json(v.rewrite(makeSheet(data), 'text', 'xyz', 'replaced'));
  expect(result[0].text).toBe('hello');
  expect(result[1].text).toBe('goodbye');
});

test('rewrite preserves other columns', () => {
  const data = [{ name: 'Sam Jones', age: 30 }];
  const result = XLSX.utils.sheet_to_json(v.rewrite(makeSheet(data), 'name', 'Jones', 'Smith'));
  expect(result[0].name).toBe('Sam Smith');
  expect(result[0].age).toBe(30);
});

// --- removeRowWithValue ---

test('removeRowWithValue removes rows matching value', () => {
  const data = [{ status: 'active' }, { status: 'inactive' }, { status: 'active' }];
  const result = XLSX.utils.sheet_to_json(v.removeRowWithValue(makeSheet(data), 'status', 'active'));
  expect(result).toHaveLength(1);
  expect(result[0].status).toBe('inactive');
});

test('removeRowWithValue removes no rows when value not found', () => {
  const data = [{ x: 'a' }, { x: 'b' }];
  const result = XLSX.utils.sheet_to_json(v.removeRowWithValue(makeSheet(data), 'x', 'z'));
  expect(result).toHaveLength(2);
});

test('removeRowWithValue removes all rows when all match', () => {
  const data = [{ val: 1 }, { val: 1 }, { val: 1 }];
  const result = XLSX.utils.sheet_to_json(v.removeRowWithValue(makeSheet(data), 'val', 1));
  expect(result).toHaveLength(0);
});

test('removeRowWithValue preserves non-matching rows order', () => {
  const data = [{ a: 'x' }, { a: 'y' }, { a: 'z' }];
  const result = XLSX.utils.sheet_to_json(v.removeRowWithValue(makeSheet(data), 'a', 'y'));
  expect(result.map(r => r.a)).toEqual(['x', 'z']);
});
