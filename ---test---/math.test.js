import MathOperations from '../src/functions/user_choice/math';
import AbsoluteValue from '../src/functions/user_choice/absolute';
import XLSX from 'xlsx';

function makeSheet(data) { return XLSX.utils.json_to_sheet(data); }
function readSheet(sheet) { return XLSX.utils.sheet_to_json(sheet); }
const m = new MathOperations();
const av = new AbsoluteValue();

// ─── AbsoluteValue ───
test('absolute converts negatives to positive', () => {
  const result = readSheet(av.absolute(makeSheet([{ val: -5 }]), 'val'));
  expect(result[0].val).toBe(5);
});

test('absolute leaves positives unchanged', () => {
  const result = readSheet(av.absolute(makeSheet([{ val: 7 }]), 'val'));
  expect(result[0].val).toBe(7);
});

test('absolute skips non-numeric', () => {
  const result = readSheet(av.absolute(makeSheet([{ val: 'abc' }]), 'val'));
  expect(result[0].val).toBe('abc');
});

// ─── MathOperations: single column ───
test('math.absolute same as AbsoluteValue', () => {
  const result = readSheet(m.absolute(makeSheet([{ val: -3 }]), 'val'));
  expect(result[0].val).toBe(3);
});

test('math.ceil rounds up', () => {
  const result = readSheet(m.ceil(makeSheet([{ val: 2.3 }]), 'val'));
  expect(result[0].val).toBe(3);
});

test('math.floor rounds down', () => {
  const result = readSheet(m.floor(makeSheet([{ val: 2.7 }]), 'val'));
  expect(result[0].val).toBe(2);
});

test('math.negate flips sign', () => {
  const result = readSheet(m.negate(makeSheet([{ val: 5 }]), 'val'));
  expect(result[0].val).toBe(-5);
});

test('math.round with decimals', () => {
  const result = readSheet(m.round(makeSheet([{ val: 3.14159 }]), 'val', 2));
  expect(result[0].val).toBe(3.14);
});

test('math.addConstant adds to each value', () => {
  const result = readSheet(m.addConstant(makeSheet([{ val: 10 }]), 'val', 5));
  expect(result[0].val).toBe(15);
});

test('math.multiplyConstant multiplies', () => {
  const result = readSheet(m.multiplyConstant(makeSheet([{ val: 4 }]), 'val', 3));
  expect(result[0].val).toBe(12);
});

// ─── MathOperations: new column ───
test('math.squareRoot', () => {
  const result = readSheet(m.squareRoot(makeSheet([{ val: 9 }]), 'val', 'sqrt'));
  expect(result[0].sqrt).toBe(3);
});

test('math.squareRoot negative returns empty', () => {
  const result = readSheet(m.squareRoot(makeSheet([{ val: -4 }]), 'val', 'sqrt'));
  expect(result[0].sqrt).toBe('');
});

test('math.power raises to exponent', () => {
  const result = readSheet(m.power(makeSheet([{ val: 3 }]), 'val', 2, 'sq'));
  expect(result[0].sq).toBe(9);
});

test('math.cumulativeSum', () => {
  const data = [{ val: 1 }, { val: 2 }, { val: 3 }];
  const result = readSheet(m.cumulativeSum(makeSheet(data), 'val', 'cumsum'));
  expect(result.map(r => r.cumsum)).toEqual([1, 3, 6]);
});

test('math.log natural', () => {
  const result = readSheet(m.log(makeSheet([{ val: Math.E }]), 'val', 'ln'));
  expect(result[0].ln).toBeCloseTo(1, 5);
});

// ─── MathOperations: two-column ───
test('math.add two columns', () => {
  const result = readSheet(m.add(makeSheet([{ a: 3, b: 4 }]), 'a', 'b', 'sum'));
  expect(result[0].sum).toBe(7);
});

test('math.subtract', () => {
  const result = readSheet(m.subtract(makeSheet([{ a: 10, b: 3 }]), 'a', 'b', 'diff'));
  expect(result[0].diff).toBe(7);
});

test('math.multiply', () => {
  const result = readSheet(m.multiply(makeSheet([{ a: 3, b: 4 }]), 'a', 'b', 'prod'));
  expect(result[0].prod).toBe(12);
});

test('math.divide', () => {
  const result = readSheet(m.divide(makeSheet([{ a: 12, b: 4 }]), 'a', 'b', 'quot'));
  expect(result[0].quot).toBe(3);
});

test('math.divide by zero returns empty', () => {
  const result = readSheet(m.divide(makeSheet([{ a: 10, b: 0 }]), 'a', 'b', 'quot'));
  expect(result[0].quot).toBe('');
});

test('math.modulo', () => {
  const result = readSheet(m.modulo(makeSheet([{ a: 10, b: 3 }]), 'a', 'b', 'rem'));
  expect(result[0].rem).toBe(1);
});

test('math.min of two', () => {
  const result = readSheet(m.min(makeSheet([{ a: 5, b: 3 }]), 'a', 'b', 'minimum'));
  expect(result[0].minimum).toBe(3);
});

test('math.max of two', () => {
  const result = readSheet(m.max(makeSheet([{ a: 5, b: 3 }]), 'a', 'b', 'maximum'));
  expect(result[0].maximum).toBe(5);
});

test('math.percentageOf', () => {
  const result = readSheet(m.percentageOf(makeSheet([{ a: 25, b: 100 }]), 'a', 'b', 'pct'));
  expect(result[0].pct).toBe(25);
});

test('math.percentageChange', () => {
  const result = readSheet(m.percentageChange(makeSheet([{ old: 50, new_val: 75 }]), 'old', 'new_val', 'change'));
  expect(result[0].change).toBe(50);
});

// ─── MathOperations: multi-column ───
test('math.sumColumns', () => {
  const data = [{ a: 1, b: 2, c: 3 }];
  const result = readSheet(m.sumColumns(makeSheet(data), ['a', 'b', 'c'], 'total'));
  expect(result[0].total).toBe(6);
});

test('math.averageColumns', () => {
  const data = [{ a: 10, b: 20, c: 30 }];
  const result = readSheet(m.averageColumns(makeSheet(data), ['a', 'b', 'c'], 'avg'));
  expect(result[0].avg).toBe(20);
});
