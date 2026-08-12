import FormattingValidation from '../src/functions/user_choice/formattingValidation';
import XLSX from 'xlsx';

function makeSheet(data) { return XLSX.utils.json_to_sheet(data); }
function readSheet(sheet) { return XLSX.utils.sheet_to_json(sheet); }
const fv = new FormattingValidation();

test('currencyFormat adds $ and decimals', () => {
  const result = readSheet(fv.currencyFormat(makeSheet([{ price: 1234.5 }]), 'price'));
  // toLocaleString is locale-dependent, so just check it starts with $ and contains digits
  expect(result[0].price).toMatch(/^\$.*1.*2.*3.*4.*5/);
});

test('currencyFormat with custom symbol', () => {
  const result = readSheet(fv.currencyFormat(makeSheet([{ price: 99 }]), 'price', 'R'));
  expect(result[0].price).toMatch(/^R.*99/);
});

test('currencyFormat skips non-numeric', () => {
  const result = readSheet(fv.currencyFormat(makeSheet([{ price: 'abc' }]), 'price'));
  expect(result[0].price).toBe('abc');
});

test('percentageFormat multiplies by 100 and adds %', () => {
  const result = readSheet(fv.percentageFormat(makeSheet([{ rate: 0.856 }]), 'rate'));
  expect(result[0].rate).toBe('85.6%');
});

test('percentageFormat with custom decimals', () => {
  const result = readSheet(fv.percentageFormat(makeSheet([{ rate: 0.5 }]), 'rate', 0));
  expect(result[0].rate).toBe('50%');
});

test('labelEncode maps unique values to integers', () => {
  const data = [{ color: 'red' }, { color: 'blue' }, { color: 'red' }];
  const result = readSheet(fv.labelEncode(makeSheet(data), 'color'));
  expect(result[0].color).toBe(0);
  expect(result[1].color).toBe(1);
  expect(result[2].color).toBe(0);
});

test('oneHotEncode creates boolean columns', () => {
  const data = [{ animal: 'cat' }, { animal: 'dog' }];
  const result = readSheet(fv.oneHotEncode(makeSheet(data), 'animal'));
  expect(result[0].animal_cat).toBe(true);
  expect(result[0].animal_dog).toBe(false);
  expect(result[1].animal_cat).toBe(false);
  expect(result[1].animal_dog).toBe(true);
  expect(result[0].animal).toBeUndefined();
});

test('emailValidityCheck flags valid emails', () => {
  const data = [{ email: 'test@example.com' }, { email: 'not-an-email' }];
  const result = readSheet(fv.emailValidityCheck(makeSheet(data), 'email', 'valid'));
  expect(result[0].valid).toBe(true);
  expect(result[1].valid).toBe(false);
});

test('phoneFormatCheck flags valid phones', () => {
  const data = [{ phone: '+1 555-1234' }, { phone: 'abc' }];
  const result = readSheet(fv.phoneFormatCheck(makeSheet(data), 'phone', 'valid'));
  expect(result[0].valid).toBe(true);
  expect(result[1].valid).toBe(false);
});

test('flagOutliers flags values beyond threshold', () => {
  const data = [{ val: 10 }, { val: 10 }, { val: 10 }, { val: 10 }, { val: 10 }, { val: 1000 }];
  const result = readSheet(fv.flagOutliers(makeSheet(data), 'val', 'outlier', 2));
  expect(result[5].outlier).toBe(true);
  expect(result[0].outlier).toBe(false);
});
