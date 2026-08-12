import { Search } from '../src/functions/user_choice/search';
import XLSX from 'xlsx';

function makeSheet(data) { return XLSX.utils.json_to_sheet(data); }

const s = new Search();

test('search finds rows matching keyword across any column', () => {
  const data = [
    { name: 'Alice', city: 'Cape Town' },
    { name: 'Bob', city: 'Johannesburg' },
    { name: 'Charlie', city: 'Cape Town' },
  ];
  const result = s.search(makeSheet(data), 'Cape');
  expect(result).toHaveLength(2);
  expect(result[0].name).toBe('Alice');
  expect(result[1].name).toBe('Charlie');
});

test('search is case-insensitive', () => {
  const data = [{ text: 'Hello World' }, { text: 'goodbye' }];
  const result = s.search(makeSheet(data), 'hello');
  expect(result).toHaveLength(1);
  expect(result[0].text).toBe('Hello World');
});

test('search returns empty array when no match', () => {
  const data = [{ a: 'foo' }, { a: 'bar' }];
  const result = s.search(makeSheet(data), 'xyz');
  expect(result).toHaveLength(0);
});

test('search matches numbers converted to string', () => {
  const data = [{ id: 123, name: 'test' }, { id: 456, name: 'other' }];
  const result = s.search(makeSheet(data), '123');
  expect(result).toHaveLength(1);
  expect(result[0].id).toBe(123);
});

test('search does not return duplicate rows', () => {
  const data = [{ name: 'Sam Sam', city: 'Sam' }];
  const result = s.search(makeSheet(data), 'Sam');
  expect(result).toHaveLength(1);
});

test('search with empty keyword returns no rows', () => {
  const data = [{ a: 'hello' }];
  const result = s.search(makeSheet(data), '');
  // empty string matches everything (every value includes "")
  expect(result).toHaveLength(1);
});

test('search handles empty sheet', () => {
  const sheet = XLSX.utils.json_to_sheet([]);
  const result = s.search(sheet, 'test');
  expect(result).toHaveLength(0);
});
