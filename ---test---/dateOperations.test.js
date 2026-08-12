import DateOperations from '../src/functions/user_choice/dateOperations';
import XLSX from 'xlsx';

function makeSheet(data) { return XLSX.utils.json_to_sheet(data); }
function readSheet(sheet) { return XLSX.utils.sheet_to_json(sheet); }
const d = new DateOperations();

test('extractYear gets year from date', () => {
  const result = readSheet(d.extractYear(makeSheet([{ date: '2024-03-15' }]), 'date', 'year'));
  expect(result[0].year).toBe(2024);
});

test('extractMonth gets month', () => {
  const result = readSheet(d.extractMonth(makeSheet([{ date: '2024-03-15' }]), 'date', 'month'));
  expect(result[0].month).toBe(3);
});

test('extractDay gets day', () => {
  const result = readSheet(d.extractDay(makeSheet([{ date: '2024-03-15' }]), 'date', 'day'));
  expect(result[0].day).toBe(15);
});

test('extractDayOfWeek returns day name', () => {
  const result = readSheet(d.extractDayOfWeek(makeSheet([{ date: '2024-03-15' }]), 'date', 'dow'));
  expect(typeof result[0].dow).toBe('string');
  expect(result[0].dow.length).toBeGreaterThan(0);
});

test('dateDifference in days', () => {
  const data = [{ start: '2024-01-01', end: '2024-01-11' }];
  const result = readSheet(d.dateDifference(makeSheet(data), 'start', 'end', 'diff', 'days'));
  expect(result[0].diff).toBe(10);
});

test('dateDifference in hours', () => {
  const data = [{ start: '2024-01-01T00:00:00', end: '2024-01-01T05:00:00' }];
  const result = readSheet(d.dateDifference(makeSheet(data), 'start', 'end', 'diff', 'hours'));
  expect(result[0].diff).toBe(5);
});

test('addDays adds days to date', () => {
  const result = readSheet(d.addDays(makeSheet([{ date: '2024-01-01' }]), 'date', 10));
  expect(result[0].date).toBe('2024-01-11');
});

test('addDays handles negative', () => {
  const result = readSheet(d.addDays(makeSheet([{ date: '2024-01-11' }]), 'date', -10));
  expect(result[0].date).toBe('2024-01-01');
});

test('ageFromBirthdate calculates age', () => {
  const result = readSheet(d.ageFromBirthdate(makeSheet([{ dob: '2000-01-01' }]), 'dob', 'age'));
  expect(typeof result[0].age).toBe('number');
  expect(result[0].age).toBeGreaterThan(20);
});

test('isWeekend detects Saturday', () => {
  // 2024-03-16 is a Saturday
  const result = readSheet(d.isWeekend(makeSheet([{ date: '2024-03-16' }]), 'date', 'weekend'));
  expect(result[0].weekend).toBe(true);
});

test('isWeekend detects weekday', () => {
  // 2024-03-15 is a Friday
  const result = readSheet(d.isWeekend(makeSheet([{ date: '2024-03-15' }]), 'date', 'weekend'));
  expect(result[0].weekend).toBe(false);
});

test('invalid date returns empty string', () => {
  const result = readSheet(d.extractYear(makeSheet([{ date: 'not-a-date' }]), 'date', 'year'));
  expect(result[0].year).toBe('');
});
