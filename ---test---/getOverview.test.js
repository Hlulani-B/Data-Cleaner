import { classifyValue, getOverview } from '../src/functions/user_choice/getOverview';

describe('classifyValue', () => {
  test('buckets primitives', () => {
    expect(classifyValue(null)).toBe('null');
    expect(classifyValue(undefined)).toBe('null');
    expect(classifyValue('   ')).toBe('empty');
    expect(classifyValue('')).toBe('empty');
    expect(classifyValue(true)).toBe('boolean');
    expect(classifyValue(42)).toBe('int');
    expect(classifyValue(3.5)).toBe('float');
    expect(classifyValue(NaN)).toBe('invalid');
    expect(classifyValue(new Date())).toBe('date');
    expect(classifyValue('hello')).toBe('string');
  });

  test('recognises numeric-looking strings', () => {
    expect(classifyValue('123')).toBe('int');
    expect(classifyValue('-7')).toBe('int');
    expect(classifyValue('3.14')).toBe('float');
  });
});

describe('getOverview', () => {
  test('handles empty input', () => {
    const ov = getOverview([]);
    expect(ov.totalRows).toBe(0);
    expect(ov.totalColumns).toBe(0);
    expect(ov.columns).toEqual([]);
    expect(ov.nullValues.clean).toBe(true);
    expect(ov.duplicates.clean).toBe(true);
  });

  test('reports per-column detected types', () => {
    const data = [
      { price: 10, name: 'a' },
      { price: '20', name: 'b' },
      { price: 5.5, name: 'c' },
    ];
    const ov = getOverview(data);
    const price = ov.columns.find((c) => c.column === 'price');
    expect(price.typeCounts.int).toBe(2); // 10 and numeric string "20"
    expect(price.typeCounts.float).toBe(1);
    expect(price.isMixed).toBe(true);
    expect(price.types).toContain('int');
    const name = ov.columns.find((c) => c.column === 'name');
    expect(name.types).toBe('string');
    expect(name.isMixed).toBe(false);
  });

  test('counts null / empty values per column', () => {
    const data = [
      { a: 1, b: '' },
      { a: null, b: 'x' },
      { a: 3, b: '  ' },
    ];
    const ov = getOverview(data);
    const colA = ov.columns.find((c) => c.column === 'a');
    expect(colA.nullCount).toBe(1);
    const colB = ov.columns.find((c) => c.column === 'b');
    expect(colB.nullCount).toBe(2); // '' and '  ' both blank
    expect(ov.nullValues.total).toBe(3);
    expect(ov.nullValues.clean).toBe(false);
    expect(ov.nullValues.columns.map((c) => c.column).sort()).toEqual(['a', 'b']);
  });

  test('detects duplicate rows and repeated values', () => {
    const data = [
      { id: 1, city: 'NYC' },
      { id: 2, city: 'LA' },
      { id: 1, city: 'NYC' }, // exact duplicate row of first
    ];
    const ov = getOverview(data);
    expect(ov.duplicates.rowCount).toBe(1); // one surplus copy
    expect(ov.duplicates.rowGroups.length).toBe(1);
    const idCol = ov.duplicates.columns.find((c) => c.column === 'id');
    expect(idCol).toBeDefined();
    expect(idCol.count).toBe(1); // value 1 repeated once beyond first
    expect(ov.duplicates.clean).toBe(false);
  });

  test('flags a clean dataset', () => {
    const data = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ];
    const ov = getOverview(data);
    expect(ov.nullValues.clean).toBe(true);
    expect(ov.duplicates.clean).toBe(true);
    expect(ov.duplicates.rowCount).toBe(0);
  });
});
