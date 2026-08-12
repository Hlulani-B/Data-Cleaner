import ColumnRowOperations from '../src/functions/user_choice/columnRowOperations';
import XLSX from 'xlsx';

function makeSheet(data) { return XLSX.utils.json_to_sheet(data); }
function readSheet(sheet) { return XLSX.utils.sheet_to_json(sheet); }
const cr = new ColumnRowOperations();

test('renameColumn renames a column', () => {
  const result = readSheet(cr.renameColumn(makeSheet([{ name: 'Sam' }]), 'name', 'full_name'));
  expect(result[0].full_name).toBe('Sam');
  expect(result[0].name).toBeUndefined();
});

test('duplicateColumn copies a column', () => {
  const result = readSheet(cr.duplicateColumn(makeSheet([{ val: 42 }]), 'val', 'val_copy'));
  expect(result[0].val).toBe(42);
  expect(result[0].val_copy).toBe(42);
});

test('reorderColumns reorders columns', () => {
  const data = [{ b: 2, a: 1, c: 3 }];
  const result = readSheet(cr.reorderColumns(makeSheet(data), ['a', 'b', 'c']));
  expect(Object.keys(result[0])).toEqual(['a', 'b', 'c']);
});

test('filterRows equals condition', () => {
  const data = [{ color: 'red' }, { color: 'blue' }, { color: 'red' }];
  const result = readSheet(cr.filterRows(makeSheet(data), 'color', 'equals', 'red'));
  expect(result.length).toBe(2);
});

test('filterRows greater_than condition', () => {
  const data = [{ val: 5 }, { val: 15 }, { val: 25 }];
  const result = readSheet(cr.filterRows(makeSheet(data), 'val', 'greater_than', 10));
  expect(result.length).toBe(2);
});

test('filterRows contains condition', () => {
  const data = [{ name: 'Sam Jones' }, { name: 'Alex' }];
  const result = readSheet(cr.filterRows(makeSheet(data), 'name', 'contains', 'Sam'));
  expect(result.length).toBe(1);
});

test('sortRows ascending', () => {
  const data = [{ val: 3 }, { val: 1 }, { val: 2 }];
  const result = readSheet(cr.sortRows(makeSheet(data), 'val', 'asc'));
  expect(result.map(r => r.val)).toEqual([1, 2, 3]);
});

test('sortRows descending', () => {
  const data = [{ val: 3 }, { val: 1 }, { val: 2 }];
  const result = readSheet(cr.sortRows(makeSheet(data), 'val', 'desc'));
  expect(result.map(r => r.val)).toEqual([3, 2, 1]);
});

test('sortRows alphabetical', () => {
  const data = [{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }];
  const result = readSheet(cr.sortRows(makeSheet(data), 'name'));
  expect(result.map(r => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
});

test('sampleRows first N', () => {
  const data = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
  const result = readSheet(cr.sampleRows(makeSheet(data), 2, 'first'));
  expect(result.length).toBe(2);
  expect(result[0].id).toBe(1);
});

test('sampleRows random returns correct count', () => {
  const data = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
  const result = readSheet(cr.sampleRows(makeSheet(data), 3, 'random'));
  expect(result.length).toBe(3);
});
