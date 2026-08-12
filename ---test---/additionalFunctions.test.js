import {
  replaceText, searchRows, absoluteColumn,
  renameColumn, duplicateColumn, reorderColumns, filterRows, sortRows, sampleRows,
  extractYear, extractMonth, extractDay, extractDayOfWeek, dateDifference, addDays,
  ageFromBirthdate, isWeekend,
  currencyFormat, percentageFormat, labelEncode, oneHotEncode,
  emailValidityCheck, phoneFormatCheck, flagOutliers,
  removeSpecialCharacters, removeNumbers, collapseWhitespace,
  padLeft, padRight, truncateText, extractSubstring, reverseText,
  countCharacters, countWords, containsCheck, startsWithCheck, endsWithCheck,
  regexExtract, regexReplace, sentenceCase,
} from "../src/utils/cleaners";

describe("replaceText", () => {
  const data = [{ text: "abc abc abc" }];

  test("replaces all occurrences by default", () => {
    expect(replaceText(data, "text", "abc", "x")).toEqual([{ text: "x x x" }]);
  });

  test("replaces nth occurrence", () => {
    expect(replaceText(data, "text", "abc", "x", 2)).toEqual([{ text: "abc x abc" }]);
  });
});

describe("searchRows", () => {
  const data = [{ name: "Alice", city: "NYC" }, { name: "Bob", city: "LA" }];

  test("keeps rows matching keyword in any column", () => {
    expect(searchRows(data, "alice")).toEqual([{ name: "Alice", city: "NYC" }]);
  });
});

describe("absoluteColumn", () => {
  test("returns absolute values", () => {
    expect(absoluteColumn([{ n: -5 }, { n: 3 }], "n")).toEqual([{ n: 5 }, { n: 3 }]);
  });
});

describe("column/row operations", () => {
  const data = [{ a: 1, b: 2, c: 3 }];

  test("renameColumn renames a column", () => {
    expect(renameColumn(data, "a", "alpha")).toEqual([{ alpha: 1, b: 2, c: 3 }]);
  });

  test("duplicateColumn copies a column", () => {
    expect(duplicateColumn(data, "a", "a_copy")).toEqual([{ a: 1, b: 2, c: 3, a_copy: 1 }]);
  });

  test("reorderColumns changes column order", () => {
    expect(reorderColumns(data, ["c", "a"])).toEqual([{ c: 3, a: 1, b: 2 }]);
  });

  test("filterRows keeps matching rows", () => {
    expect(filterRows([{ a: 1 }, { a: 2 }, { a: 3 }], "a", "greater_than", 1)).toEqual([{ a: 2 }, { a: 3 }]);
  });

  test("sortRows sorts ascending", () => {
    expect(sortRows([{ a: 3 }, { a: 1 }, { a: 2 }], "a")).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }]);
  });

  test("sampleRows returns first N rows", () => {
    expect(sampleRows([{ a: 1 }, { a: 2 }, { a: 3 }], 2)).toEqual([{ a: 1 }, { a: 2 }]);
  });
});

describe("date operations", () => {
  const data = [{ d: "2023-06-15" }];

  test("extractYear", () => {
    expect(extractYear(data, "d", "year")).toEqual([{ d: "2023-06-15", year: 2023 }]);
  });

  test("extractMonth", () => {
    expect(extractMonth(data, "d", "month")).toEqual([{ d: "2023-06-15", month: 6 }]);
  });

  test("extractDay", () => {
    expect(extractDay(data, "d", "day")).toEqual([{ d: "2023-06-15", day: 15 }]);
  });

  test("extractDayOfWeek", () => {
    expect(extractDayOfWeek(data, "d", "weekday")).toEqual([{ d: "2023-06-15", weekday: "Thursday" }]);
  });

  test("dateDifference", () => {
    const rows = [{ start: "2023-06-10", end: "2023-06-15" }];
    expect(dateDifference(rows, "start", "end", "diff")).toEqual([{ start: "2023-06-10", end: "2023-06-15", diff: 5 }]);
  });

  test("addDays", () => {
    expect(addDays(data, "d", 5)).toEqual([{ d: "2023-06-20" }]);
  });

  test("isWeekend", () => {
    expect(isWeekend(data, "d", "weekend")).toEqual([{ d: "2023-06-15", weekend: false }]);
  });
});

describe("formatting & validation", () => {
  test("currencyFormat", () => {
    const result = currencyFormat([{ p: 1234.5 }], "p", "$", "price");
    expect(result[0].price.startsWith("$")).toBe(true);
    expect(result[0].price).toContain("234");
    expect(result[0].price).toContain("50");
  });

  test("percentageFormat", () => {
    expect(percentageFormat([{ r: 0.1234 }], "r", 2, "pct")).toEqual([{ r: 0.1234, pct: "12.34%" }]);
  });

  test("labelEncode", () => {
    expect(labelEncode([{ c: "a" }, { c: "b" }, { c: "a" }], "c")).toEqual([{ c: 0 }, { c: 1 }, { c: 0 }]);
  });

  test("oneHotEncode", () => {
    expect(oneHotEncode([{ c: "a" }, { c: "b" }], "c")).toEqual([
      { c_a: true, c_b: false },
      { c_a: false, c_b: true },
    ]);
  });

  test("emailValidityCheck", () => {
    expect(emailValidityCheck([{ e: "a@b.com" }, { e: "bad" }], "e", "valid")).toEqual([
      { e: "a@b.com", valid: true },
      { e: "bad", valid: false },
    ]);
  });

  test("phoneFormatCheck", () => {
    expect(phoneFormatCheck([{ p: "+1 234-567" }], "p", "valid")).toEqual([{ p: "+1 234-567", valid: true }]);
  });
});

describe("text operations", () => {
  const data = [{ t: "Hello World 123!" }];

  test("removeSpecialCharacters", () => {
    expect(removeSpecialCharacters(data, "t")).toEqual([{ t: "Hello World 123" }]);
  });

  test("removeNumbers", () => {
    expect(removeNumbers(data, "t")).toEqual([{ t: "Hello World !" }]);
  });

  test("collapseWhitespace", () => {
    expect(collapseWhitespace([{ t: "  a   b  " }], "t")).toEqual([{ t: "a b" }]);
  });

  test("reverseText", () => {
    expect(reverseText([{ t: "abc" }], "t")).toEqual([{ t: "cba" }]);
  });

  test("truncateText", () => {
    expect(truncateText([{ t: "abcdef" }], "t", 3)).toEqual([{ t: "abc" }]);
  });

  test("padLeft", () => {
    expect(padLeft([{ t: "42" }], "t", 5, "0")).toEqual([{ t: "00042" }]);
  });

  test("extractSubstring", () => {
    expect(extractSubstring([{ t: "abcdef" }], "t", "sub", 1, 4)).toEqual([{ t: "abcdef", sub: "bcd" }]);
  });

  test("countCharacters", () => {
    expect(countCharacters([{ t: "abc" }], "t", "n")).toEqual([{ t: "abc", n: 3 }]);
  });

  test("countWords", () => {
    expect(countWords([{ t: "one two three" }], "t", "n")).toEqual([{ t: "one two three", n: 3 }]);
  });

  test("containsCheck", () => {
    expect(containsCheck([{ t: "abc" }], "t", "has", "b")).toEqual([{ t: "abc", has: true }]);
  });

  test("regexExtract", () => {
    expect(regexExtract([{ t: "abc123" }], "t", "m", "\\d+")).toEqual([{ t: "abc123", m: "123" }]);
  });

  test("regexReplace", () => {
    expect(regexReplace([{ t: "abc123" }], "t", "\\d+", "X", "g")).toEqual([{ t: "abcX" }]);
  });

  test("sentenceCase", () => {
    expect(sentenceCase([{ t: "HELLO WORLD" }], "t")).toEqual([{ t: "Hello world" }]);
  });
});
