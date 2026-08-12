import TextOperations from '../src/functions/user_choice/textOperations';
import XLSX from 'xlsx';

function makeSheet(data) { return XLSX.utils.json_to_sheet(data); }
function readSheet(sheet) { return XLSX.utils.sheet_to_json(sheet); }
const t = new TextOperations();

test('removeSpecialCharacters strips non-alphanumeric', () => {
  const result = readSheet(t.removeSpecialCharacters(makeSheet([{ text: 'hello!@#world' }]), 'text'));
  expect(result[0].text).toBe('helloworld');
});

test('removeNumbers strips digits', () => {
  const result = readSheet(t.removeNumbers(makeSheet([{ text: 'abc123def' }]), 'text'));
  expect(result[0].text).toBe('abcdef');
});

test('collapseWhitespace trims and collapses spaces', () => {
  const result = readSheet(t.collapseWhitespace(makeSheet([{ text: '  hello   world  ' }]), 'text'));
  expect(result[0].text).toBe('hello world');
});

test('padLeft pads to length', () => {
  const result = readSheet(t.padLeft(makeSheet([{ id: '5' }]), 'id', 4, '0'));
  expect(result[0].id).toBe('0005');
});

test('padRight pads to length', () => {
  const result = readSheet(t.padRight(makeSheet([{ code: 'AB' }]), 'code', 5, '-'));
  expect(result[0].code).toBe('AB---');
});

test('truncate cuts string at max length', () => {
  const result = readSheet(t.truncate(makeSheet([{ text: 'hello world' }]), 'text', 5));
  expect(result[0].text).toBe('hello');
});

test('extractSubstring slices into new column', () => {
  const result = readSheet(t.extractSubstring(makeSheet([{ text: 'abcdef' }]), 'text', 'sub', 1, 4));
  expect(result[0].sub).toBe('bcd');
});

test('reverseText reverses string', () => {
  const result = readSheet(t.reverseText(makeSheet([{ text: 'hello' }]), 'text'));
  expect(result[0].text).toBe('olleh');
});

test('countCharacters counts length', () => {
  const result = readSheet(t.countCharacters(makeSheet([{ text: 'hello' }]), 'text', 'len'));
  expect(result[0].len).toBe(5);
});

test('countWords counts words', () => {
  const result = readSheet(t.countWords(makeSheet([{ text: 'hello beautiful world' }]), 'text', 'wc'));
  expect(result[0].wc).toBe(3);
});

test('countWords returns 0 for empty', () => {
  const result = readSheet(t.countWords(makeSheet([{ text: '  ' }]), 'text', 'wc'));
  expect(result[0].wc).toBe(0);
});

test('containsCheck finds substring', () => {
  const data = [{ text: 'hello world' }, { text: 'goodbye' }];
  const result = readSheet(t.containsCheck(makeSheet(data), 'text', 'has', 'world'));
  expect(result[0].has).toBe(true);
  expect(result[1].has).toBe(false);
});

test('startsWith checks prefix', () => {
  const result = readSheet(t.startsWith(makeSheet([{ text: 'hello' }]), 'text', 'check', 'he'));
  expect(result[0].check).toBe(true);
});

test('endsWith checks suffix', () => {
  const result = readSheet(t.endsWith(makeSheet([{ text: 'hello' }]), 'text', 'check', 'lo'));
  expect(result[0].check).toBe(true);
});

test('regexExtract matches pattern', () => {
  const result = readSheet(t.regexExtract(makeSheet([{ text: 'abc123def' }]), 'text', 'nums', '[0-9]+'));
  expect(result[0].nums).toBe('123');
});

test('regexReplace replaces matches', () => {
  const result = readSheet(t.regexReplace(makeSheet([{ text: 'abc123def456' }]), 'text', '[0-9]+', 'X'));
  expect(result[0].text).toBe('abcXdefX');
});

test('sentenceCase capitalizes first letter', () => {
  const result = readSheet(t.sentenceCase(makeSheet([{ text: 'hELLO WORLD' }]), 'text'));
  expect(result[0].text).toBe('Hello world');
});
