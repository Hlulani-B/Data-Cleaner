import { buildCsvFiles, rowsToCsv, toCsvCell } from '../src/utils/exports/csvExport';
import { buildJsonFiles, rowsToJson } from '../src/utils/exports/jsonExport';
import { buildNumpyScript, buildPandasScript, buildPythonFiles, columnsSlug } from '../src/utils/exports/pythonExport';
import { buildExportFiles, EXPORT_FORMATS, previewFile } from '../src/utils/exports/columnExporter';
import { columnValues, inferPandasDtype, pickColumns, sanitizeFileName } from '../src/utils/exports/exportCommon';

const rows = [
  { name: 'Ada "Lady" Lovelace', city: 'London, UK', age: 36, price: 12.5, active: true, note: null },
  { name: 'Grace Hopper', city: 'New York', age: 45, price: 7, active: false, note: 'second line' },
  { name: 'Alan Turing', city: null, age: 41, price: null, active: true, note: '' },
];
const columns = ['name', 'city', 'age', 'price'];

/* ─── shared helpers ─── */

test('sanitizeFileName replaces separators and keeps file names safe', () => {
  expect(sanitizeFileName('Total Sales, 2026!')).toBe('Total_Sales_2026');
  expect(sanitizeFileName('///')).toBe('column');
});

test('pickColumns keeps only the chosen columns and fills missing with null', () => {
  expect(pickColumns([{ a: 1, b: 2 }], ['b', 'c'])).toEqual([{ b: 2, c: null }]);
});

test('columnValues preserves row order and nulls', () => {
  expect(columnValues(rows, 'city')).toEqual(['London, UK', 'New York', null]);
});

test('inferPandasDtype detects int, float, bool and object columns', () => {
  expect(inferPandasDtype([1, 2, null])).toBe('int64');
  expect(inferPandasDtype([1.5, 2])).toBe('float64');
  expect(inferPandasDtype([true, false])).toBe('bool');
  expect(inferPandasDtype(['a', 1])).toBe('object');
});

/* ─── CSV ─── */

test('toCsvCell only quotes cells that need it', () => {
  expect(toCsvCell('plain')).toBe('plain');
  expect(toCsvCell('London, UK')).toBe('"London, UK"');
  expect(toCsvCell('say "hi"')).toBe('"say ""hi"""');
  expect(toCsvCell(null)).toBe('');
});

test('rowsToCsv writes a header plus one line per row', () => {
  expect(rowsToCsv([{ a: 1, b: 'x,y' }], ['a', 'b'])).toBe('a,b\n1,"x,y"');
});

test('combined CSV export produces a single file with every selected column', () => {
  const files = buildCsvFiles(rows, columns, { combine: true, baseName: 'sales' });

  expect(files).toHaveLength(1);
  expect(files[0].filename).toBe('sales_combined.csv');
  expect(files[0].mime).toContain('text/csv');
  expect(files[0].content.split('\n')[0]).toBe('name,city,age,price');
});

test('separate CSV export writes one file per column', () => {
  const files = buildCsvFiles(rows, ['name', 'city'], { combine: false, baseName: 'sales' });

  expect(files.map((f) => f.filename)).toEqual(['sales_name.csv', 'sales_city.csv']);
  expect(files[1].content.split('\n')[0]).toBe('city');
});

test('empty column selection exports nothing', () => {
  expect(buildCsvFiles(rows, [], { baseName: 'sales' })).toEqual([]);
});

/* ─── JSON ─── */

test('records orient exports an array of row objects', () => {
  const parsed = JSON.parse(rowsToJson(rows, ['name', 'age'], { orient: 'records' }));

  expect(parsed).toHaveLength(3);
  expect(parsed[0]).toEqual({ name: 'Ada "Lady" Lovelace', age: 36 });
});

test('columns orient exports one array per column', () => {
  const parsed = JSON.parse(rowsToJson(rows, ['age'], { orient: 'columns' }));

  expect(parsed).toEqual({ age: [36, 45, 41] });
});

test('combined and per-column JSON file names', () => {
  const combined = buildJsonFiles(rows, ['name', 'age'], { combine: true, baseName: 'sales' });
  const perColumn = buildJsonFiles(rows, ['name', 'age'], { combine: false, baseName: 'sales' });

  expect(combined[0].filename).toBe('sales_combined.json');
  expect(perColumn.map((f) => f.filename)).toEqual(['sales_name.json', 'sales_age.json']);
  expect(JSON.parse(perColumn[0].content)).toEqual([
    { name: 'Ada "Lady" Lovelace' },
    { name: 'Grace Hopper' },
    { name: 'Alan Turing' },
  ]);
});

/* ─── Python scripts ─── */

test('columnsSlug joins cleaned column names for file names', () => {
  expect(columnsSlug(['Total Sales', 'price'])).toBe('Total_Sales_price');
});

test('pandas script embeds the data and selects only the chosen columns', () => {
  const script = buildPandasScript(rows, ['age', 'price'], { baseName: 'sales' });

  expect(script).toContain('# Columns (2): age, price');
  expect(script).toContain('import pandas as pd');
  expect(script).toContain('RECORDS = json.loads(');
  expect(script).toContain('COLUMNS = ["age","price"]');
  expect(script).toContain('df = df[COLUMNS]');
  expect(script).toContain('df.to_csv("sales_age_price_pandas_export.csv", index=False)');
  // untouched columns must not leak into the payload
  expect(script).not.toContain('Grace Hopper');
});

test('pandas script casts each column to its inferred dtype', () => {
  const script = buildPandasScript(rows, ['age', 'price', 'name'], { baseName: 'sales' });

  expect(script).toContain('df["age"] = pd.to_numeric(df["age"], errors="coerce")');
  expect(script).toContain('df["age"] = df["age"].astype("Int64")');
  expect(script).toContain('df["price"] = pd.to_numeric(df["price"], errors="coerce")');
  expect(script).toContain('df["name"] = df["name"].astype("string")');
});

test('pandas script can read the companion CSV or JSON export instead of embedding', () => {
  const fromCsv = buildPandasScript(rows, ['age'], { source: 'csv', baseName: 'sales' });
  const fromJson = buildPandasScript(rows, ['age'], { source: 'json', baseName: 'sales' });

  expect(fromCsv).toContain('df = pd.read_csv("sales_combined.csv")');
  expect(fromCsv).not.toContain('RECORDS = json.loads(');
  expect(fromJson).toContain('data = json.load(handle)');
  expect(fromJson).toContain('df = pd.DataFrame.from_dict(data)');
});

test('pandas summary block is optional', () => {
  const withStats = buildPandasScript(rows, ['age'], { baseName: 'sales' });
  const withoutStats = buildPandasScript(rows, ['age'], { baseName: 'sales', includeStats: false });

  expect(withStats).toContain('print(df.describe(include="all"))');
  expect(withStats).toContain('# --- 4. Write the outputs');
  expect(withoutStats).not.toContain('df.describe');
  expect(withoutStats).toContain('# --- 3. Write the outputs');
});

test('numpy script builds object and numeric arrays plus stats', () => {
  const script = buildNumpyScript(rows, ['age', 'name'], { baseName: 'sales' });

  expect(script).toContain('COLUMNS = ["age","name"]');
  expect(script).toContain('NUMERIC_COLUMNS = ["age"]');
  expect(script).toContain('values = np.array([[rec.get(col) for col in COLUMNS] for rec in data], dtype=object)');
  expect(script).toContain('np.save("sales_age_name.npy", values, allow_pickle=True)');
  expect(script).toContain('np.nanmean(numeric, axis=0)');
});

test('numpy csv source reads the companion file with csv.DictReader', () => {
  const script = buildNumpyScript(rows, ['age'], { source: 'csv', baseName: 'sales' });

  expect(script).toContain('import csv');
  expect(script).toContain('data = list(csv.DictReader(handle))');
});

test('buildPythonFiles returns one combined script or one script per column', () => {
  const combined = buildPythonFiles(rows, ['age', 'name'], { baseName: 'sales' });
  const perColumn = buildPythonFiles(rows, ['age', 'name'], { combine: false, baseName: 'sales' });
  const numpyFiles = buildPythonFiles(rows, ['age'], { library: 'numpy', baseName: 'sales' });

  expect(combined).toHaveLength(1);
  expect(combined[0].filename).toBe('sales_age_name_pandas.py');
  expect(perColumn.map((f) => f.filename)).toEqual(['sales_age_pandas.py', 'sales_name_pandas.py']);
  expect(numpyFiles[0].filename).toBe('sales_age_numpy.py');
  expect(numpyFiles[0].mime).toContain('text/x-python');
});

test('per-column python scripts read their own companion export', () => {
  const [first] = buildPythonFiles(rows, ['age'], { combine: false, baseName: 'sales', source: 'csv' });

  expect(first.content).toContain('df = pd.read_csv("sales_age.csv")');
});

/* ─── orchestrator ─── */

test('EXPORT_FORMATS lists the data and script formats offered in the UI', () => {
  expect(EXPORT_FORMATS.map((f) => f.key)).toEqual(['csv', 'json', 'pandas', 'numpy']);
  expect(EXPORT_FORMATS.find((f) => f.key === 'pandas').script).toBe(true);
});

test('multiple formats are generated in one click and named distinctly', () => {
  const files = buildExportFiles(rows, ['age', 'name'], {
    formats: ['csv', 'json', 'pandas', 'numpy'],
    filename: 'sales_report.xlsx',
  });

  expect(files.map((f) => f.filename).sort()).toEqual([
    'sales_report_age_name_numpy.py',
    'sales_report_age_name_pandas.py',
    'sales_report_combined.csv',
    'sales_report_combined.json',
  ]);
});

test('the upload extension is stripped from generated file names', () => {
  const files = buildExportFiles(rows, ['age'], { formats: ['csv'], filename: 'My Data.csv' });

  expect(files[0].filename).toBe('My_Data_combined.csv');
});

test('separate grouping multiplies files by the number of columns', () => {
  const files = buildExportFiles(rows, ['age', 'name', 'city'], {
    formats: ['csv', 'json'],
    combine: false,
    filename: 'sales',
  });

  expect(files).toHaveLength(6);
  expect(new Set(files.map((f) => f.filename)).size).toBe(6);
});

test('no selection produces no files', () => {
  expect(buildExportFiles(rows, [], { formats: ['csv', 'json'] })).toEqual([]);
});

test('previewFile shows the first file and truncates long content', () => {
  const files = buildExportFiles(rows, ['age'], { formats: ['csv'], filename: 'sales' });

  expect(previewFile(files)).toContain('age\n36');
  expect(previewFile(files, 4).endsWith('…')).toBe(true);
  expect(previewFile([])).toBe('');
});
