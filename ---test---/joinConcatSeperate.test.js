import Join from '../src/functions/user_choice/join';
import Concatenate from '../src/functions/user_choice/concatenate';
import Separate from '../src/functions/user_choice/seperate';
import Replace from '../src/functions/user_choice/replace';
import XLSX from 'xlsx';

function makeSheet(data) { return XLSX.utils.json_to_sheet(data); }
function readSheet(sheet) { return XLSX.utils.sheet_to_json(sheet); }

// ─── Join ───
const j = new Join();

test('join combines columns with delimiter', () => {
  const data = [{ first: 'Sam', last: 'Jones' }];
  const result = readSheet(j.join(makeSheet(data), 'full', ['first', 'last'], ' '));
  expect(result[0].full).toBe('Sam Jones');
});

test('join with custom delimiter', () => {
  const data = [{ a: '1', b: '2', c: '3' }];
  const result = readSheet(j.join(makeSheet(data), 'joined', ['a', 'b', 'c'], '-'));
  expect(result[0].joined).toBe('1-2-3');
});

test('join handles numbers', () => {
  const data = [{ a: 1, b: 2 }];
  const result = readSheet(j.join(makeSheet(data), 'joined', ['a', 'b'], '+'));
  expect(result[0].joined).toBe('1+2');
});

// ─── Concatenate ───
const c = new Concatenate();

test('concatenate joins without delimiter', () => {
  const data = [{ a: 'hello', b: 'world' }];
  const result = readSheet(c.concat(makeSheet(data), 'combined', ['a', 'b']));
  expect(result[0].combined).toBe('helloworld');
});

test('concatenate handles numbers as strings', () => {
  const data = [{ a: 42, b: 'px' }];
  const result = readSheet(c.concat(makeSheet(data), 'combined', ['a', 'b']));
  expect(result[0].combined).toBe('42px');
});

test('concatenate handles null/undefined', () => {
  const data = [{ a: 'hello' }];
  const result = readSheet(c.concat(makeSheet(data), 'combined', ['a', 'missing']));
  expect(result[0].combined).toBe('hellomissing');
});

// ─── Separate ───
const s = new Separate();

test('separate splits into two columns', () => {
  const data = [{ name: 'Sam Jones' }];
  const result = readSheet(s.separate(makeSheet(data), 'name', ' ', 1, 'first', 'last'));
  expect(result[0].first).toBe('Sam');
  expect(result[0].last).toBe('Jones');
});

test('separate keeps original column', () => {
  const data = [{ name: 'Sam Jones' }];
  const result = readSheet(s.separate(makeSheet(data), 'name', ' ', 1, 'first', 'last'));
  expect(result[0].name).toBe('Sam Jones');
});

test('separate with occurrence 2', () => {
  const data = [{ val: 'a-b-c-d' }];
  const result = readSheet(s.separate(makeSheet(data), 'val', '-', 2, 'before', 'after'));
  expect(result[0].before).toBe('a-b');
  expect(result[0].after).toBe('c-d');
});

test('separate with no match puts all in first', () => {
  const data = [{ val: 'hello' }];
  const result = readSheet(s.separate(makeSheet(data), 'val', '-', 1, 'a', 'b'));
  expect(result[0].a).toBe('hello');
  expect(result[0].b).toBe('');
});

// ─── Replace ───
const r = new Replace();

test('replace all occurrences', () => {
  const data = [{ text: 'hello world hello' }];
  const result = readSheet(r.replace(makeSheet(data), 'text', 'hello', 'hi'));
  expect(result[0].text).toBe('hi world hi');
});

test('replace specific occurrence', () => {
  const data = [{ text: 'aaa' }];
  const result = readSheet(r.replace(makeSheet(data), 'text', 'a', 'b', 2));
  expect(result[0].text).toBe('aba');
});

test('replace nonexistent returns original', () => {
  const data = [{ text: 'hello' }];
  const result = readSheet(r.replace(makeSheet(data), 'text', 'xyz', 'abc'));
  expect(result[0].text).toBe('hello');
});
