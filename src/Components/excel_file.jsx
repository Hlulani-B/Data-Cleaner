import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import EmptyValues from "./emptyvalues";
import ValuesPanel from "./values";
// ── Your class files (user_choice + automatic) ──
import { Values } from "../functions/user_choice/getValues";
import { Clean } from "../functions/automatic/clean";
import { Upper } from "../functions/user_choice/upper";
import { Lower } from "../functions/user_choice/lower";
import { Proper } from "../functions/user_choice/proper";
import { RemoveColumn } from "../functions/user_choice/removeColumn";
import { RemoveEmpty } from "../functions/user_choice/removeEmpty";
import { MissingValues } from "../functions/user_choice/missingValues";
import { DateStandard } from "../functions/user_choice/dateStandard";
import { TypeConversion } from "../functions/user_choice/typeConversion";
import { Duplicate } from "../functions/automatic/duplicates";
import { Search } from "../functions/user_choice/search";
import Separate from "../functions/user_choice/seperate";
import Join from "../functions/user_choice/join";
import Concatenate from "../functions/user_choice/concatenate";
import Replace from "../functions/user_choice/replace";
import AbsoluteValue from "../functions/user_choice/absolute";
import ColumnRowOperations from "../functions/user_choice/columnRowOperations";
import DateOperations from "../functions/user_choice/dateOperations";
import TextOperations from "../functions/user_choice/textOperations";
import FormattingValidation from "../functions/user_choice/formattingValidation";
import MathOperations from "../functions/user_choice/math";
import { fillEmptyValues } from "../utils/cleaners";

// ── Class instances ──
const valuesOps = new Values();
const upperInst = new Upper();
const lowerInst = new Lower();
const properInst = new Proper();
const removeColumnInst = new RemoveColumn();
const removeEmptyInst = new RemoveEmpty();
const missingValuesInst = new MissingValues();
const dateStandardInst = new DateStandard();
const typeConversionInst = new TypeConversion();
const duplicateInst = new Duplicate();
const searchInst = new Search();
const separateInst = new Separate();
const joinInst = new Join();
const concatenateInst = new Concatenate();
const replaceInst = new Replace();
const absoluteInst = new AbsoluteValue();
const colRowOps = new ColumnRowOperations();
const dateOps = new DateOperations();
const textOps = new TextOperations();
const fmtVal = new FormattingValidation();
const mathOps = new MathOperations();

// Helper: data → sheet → class method → data
const run = (data, fn) => XLSX.utils.sheet_to_json(fn(XLSX.utils.json_to_sheet(data)), { defval: "" });

/* ─── Client-side function runners (all use YOUR class files) ─── */
const FUNCTION_RUNNERS = {
  removeEmpty: (data) => run(data, (s) => removeEmptyInst.remove_empty(s)),
  duplicates: (data) => run(data, (s) => duplicateInst.duplicate(s)),
  lower: (data, col) => run(data, (s) => lowerInst.lower(s, col)),
  upper: (data, col) => run(data, (s) => upperInst.upper(s, col)),
  proper: (data, col) => run(data, (s) => properInst.proper(s, col)),
  removeColumn: (data, col) => run(data, (s) => removeColumnInst.remove_column(s, col)),
  dateStandard: (data, col, extra) => run(data, (s) => dateStandardInst.dateStandard(s, col, extra.format || "YYYY-MM-DD")),
  typeConversion: (data, col, extra) => run(data, (s) => typeConversionInst.typeConversion(s, col, extra.targetType || "string")),
  separate: (data, col, extra) => run(data, (s) => separateInst.separate(
    s, col, extra.delimiter || ",", Number(extra.occurrence) || 1,
    extra.newColumn1 || `${col}_1`, extra.newColumn2 || `${col}_2`
  )),
  join: (data, _col, extra) => run(data, (s) => joinInst.join(
    s, extra?.newColumn || "joined",
    extra && Array.isArray(extra.selectedColumns) ? extra.selectedColumns : [],
    extra?.delimiter || " "
  )),
  concatenate: (data, _col, extra) => run(data, (s) => concatenateInst.concat(
    s, extra?.newColumn || "concatenated",
    extra && Array.isArray(extra.selectedColumns) ? extra.selectedColumns : []
  )),
  math: (data, _col, extra) => runMathOp(data, extra?.mathOp, extra),
  getValues: (data, col) => {
    const sheet = XLSX.utils.json_to_sheet(data);
    const unique = valuesOps.getValues(sheet, col);
    return { __getValuesResult: unique, data };
  },
  replaceValues: (data, col, extra) => {
    const sheet = XLSX.utils.json_to_sheet(data);
    return XLSX.utils.sheet_to_json(valuesOps.replaceValues(sheet, col, extra.findValue ?? "", extra.replaceWith ?? ""), { defval: "" });
  },
  rewrite: (data, col, extra) => {
    const sheet = XLSX.utils.json_to_sheet(data);
    return XLSX.utils.sheet_to_json(valuesOps.rewrite(sheet, col, extra.findValue ?? "", extra.replaceWith ?? ""), { defval: "" });
  },
  removeRowWithValue: (data, col, extra) => {
    const sheet = XLSX.utils.json_to_sheet(data);
    return XLSX.utils.sheet_to_json(valuesOps.removeRowWithValue(sheet, col, extra.findValue ?? ""), { defval: "" });
  },
  fillEmpty: (data, col, extra) => fillEmptyValues(
    data, col, extra.strategy || "value", extra.customValue ?? ""
  ),
  replace: (data, col, extra) => run(data, (s) => replaceInst.replace(
    s, col, extra.findValue ?? "", extra.replaceWith ?? "", extra.occurrence
  )),
  search: (data, _col, extra) => searchInst.search(data, extra.keyword ?? ""),
  absolute: (data, col) => run(data, (s) => absoluteInst.absolute(s, col)),
  renameColumn: (data, col, extra) => run(data, (s) => colRowOps.renameColumn(s, col, extra.newName ?? `${col}_renamed`)),
  duplicateColumn: (data, col, extra) => run(data, (s) => colRowOps.duplicateColumn(s, col, extra.newColumn ?? `${col}_copy`)),
  reorderColumns: (data, _col, extra) => run(data, (s) => colRowOps.reorderColumns(
    s, extra && Array.isArray(extra.orderedColumns) ? extra.orderedColumns : Object.keys(data[0] || {})
  )),
  filterRows: (data, col, extra) => run(data, (s) => colRowOps.filterRows(
    s, col, extra.condition || "equals", extra.value ?? ""
  )),
  sortRows: (data, col, extra) => run(data, (s) => colRowOps.sortRows(s, col, extra.direction || "asc")),
  sampleRows: (data, _col, extra) => run(data, (s) => colRowOps.sampleRows(s, extra.count ?? 10, extra.mode || "first")),
  extractYear: (data, col, extra) => run(data, (s) => dateOps.extractYear(s, col, extra.newColumn ?? `${col}_year`)),
  extractMonth: (data, col, extra) => run(data, (s) => dateOps.extractMonth(s, col, extra.newColumn ?? `${col}_month`)),
  extractDay: (data, col, extra) => run(data, (s) => dateOps.extractDay(s, col, extra.newColumn ?? `${col}_day`)),
  extractDayOfWeek: (data, col, extra) => run(data, (s) => dateOps.extractDayOfWeek(s, col, extra.newColumn ?? `${col}_weekday`)),
  dateDifference: (data, _col, extra) => run(data, (s) => dateOps.dateDifference(
    s, extra.columnA, extra.columnB, extra.newColumn ?? "date_diff", extra.unit || "days"
  )),
  addDays: (data, col, extra) => run(data, (s) => dateOps.addDays(s, col, extra.days ?? 0)),
  ageFromBirthdate: (data, col, extra) => run(data, (s) => dateOps.ageFromBirthdate(s, col, extra.newColumn ?? `${col}_age`)),
  isWeekend: (data, col, extra) => run(data, (s) => dateOps.isWeekend(s, col, extra.newColumn ?? `${col}_weekend`)),
  currencyFormat: (data, col, extra) => run(data, (s) => fmtVal.currencyFormat(s, col, extra.symbol ?? "$")),
  percentageFormat: (data, col, extra) => run(data, (s) => fmtVal.percentageFormat(s, col, extra.decimals ?? 1)),
  labelEncode: (data, col) => run(data, (s) => fmtVal.labelEncode(s, col)),
  oneHotEncode: (data, col) => run(data, (s) => fmtVal.oneHotEncode(s, col)),
  emailValidityCheck: (data, col, extra) => run(data, (s) => fmtVal.emailValidityCheck(s, col, extra.newColumn ?? `${col}_email_valid`)),
  phoneFormatCheck: (data, col, extra) => run(data, (s) => fmtVal.phoneFormatCheck(s, col, extra.newColumn ?? `${col}_phone_valid`)),
  flagOutliers: (data, col, extra) => run(data, (s) => fmtVal.flagOutliers(
    s, col, extra.newColumn ?? `${col}_outlier`, extra.stdDevThreshold ?? 2
  )),
  removeSpecialCharacters: (data, col) => run(data, (s) => textOps.removeSpecialCharacters(s, col)),
  removeNumbers: (data, col) => run(data, (s) => textOps.removeNumbers(s, col)),
  collapseWhitespace: (data, col) => run(data, (s) => textOps.collapseWhitespace(s, col)),
  padLeft: (data, col, extra) => run(data, (s) => textOps.padLeft(s, col, extra.length ?? 5, extra.padChar ?? "0")),
  padRight: (data, col, extra) => run(data, (s) => textOps.padRight(s, col, extra.length ?? 5, extra.padChar ?? " ")),
  truncateText: (data, col, extra) => run(data, (s) => textOps.truncate(s, col, extra.maxLength ?? 10)),
  extractSubstring: (data, col, extra) => run(data, (s) => textOps.extractSubstring(
    s, col, extra.newColumn ?? `${col}_substring`, extra.start ?? 0, extra.end ?? 10
  )),
  reverseText: (data, col) => run(data, (s) => textOps.reverseText(s, col)),
  countCharacters: (data, col, extra) => run(data, (s) => textOps.countCharacters(s, col, extra.newColumn ?? `${col}_char_count`)),
  countWords: (data, col, extra) => run(data, (s) => textOps.countWords(s, col, extra.newColumn ?? `${col}_word_count`)),
  containsCheck: (data, col, extra) => run(data, (s) => textOps.containsCheck(s, col, extra.newColumn ?? `${col}_contains`, extra.substring ?? "")),
  startsWithCheck: (data, col, extra) => run(data, (s) => textOps.startsWith(s, col, extra.newColumn ?? `${col}_starts_with`, extra.prefix ?? "")),
  endsWithCheck: (data, col, extra) => run(data, (s) => textOps.endsWith(s, col, extra.newColumn ?? `${col}_ends_with`, extra.suffix ?? "")),
  regexExtract: (data, col, extra) => run(data, (s) => textOps.regexExtract(
    s, col, extra.newColumn ?? `${col}_regex_extract`, extra.pattern ?? ".*", extra.flags ?? ""
  )),
  regexReplace: (data, col, extra) => run(data, (s) => textOps.regexReplace(
    s, col, extra.pattern ?? ".*", extra.replaceWith ?? "", extra.flags ?? "g"
  )),
  sentenceCase: (data, col) => run(data, (s) => textOps.sentenceCase(s, col)),
};

/* ─── Math Operations Catalogue ─── */
const MATH_OPS = [
  // Single-column in-place
  { key: "absolute", label: "Absolute Value", type: "singleInPlace" },
  { key: "ceil", label: "Ceiling", type: "singleInPlace" },
  { key: "floor", label: "Floor", type: "singleInPlace" },
  { key: "negate", label: "Negate", type: "singleInPlace" },
  { key: "round", label: "Round", type: "singleParam", paramLabel: "Decimals", paramDefault: 0 },
  { key: "addConstant", label: "Add Constant", type: "singleParam", paramLabel: "Value", paramDefault: 0 },
  { key: "multiplyConstant", label: "Multiply Constant", type: "singleParam", paramLabel: "Value", paramDefault: 1 },
  // Single-column → new column
  { key: "squareRoot", label: "Square Root", type: "singleNewCol" },
  { key: "power", label: "Power", type: "singleNewColParam", paramLabel: "Exponent", paramDefault: 2 },
  { key: "log", label: "Logarithm", type: "singleNewColParam", paramLabel: "Base", paramDefault: Math.E },
  { key: "cumulativeSum", label: "Cumulative Sum", type: "singleNewCol" },
  // Two-column → new column
  { key: "add", label: "Add Columns", type: "twoCol" },
  { key: "subtract", label: "Subtract Columns", type: "twoCol" },
  { key: "multiply", label: "Multiply Columns", type: "twoCol" },
  { key: "divide", label: "Divide Columns", type: "twoCol" },
  { key: "modulo", label: "Modulo", type: "twoCol" },
  { key: "min", label: "Min of Two", type: "twoCol" },
  { key: "max", label: "Max of Two", type: "twoCol" },
  { key: "percentageOf", label: "Percentage Of", type: "twoCol" },
  { key: "percentageChange", label: "Percentage Change", type: "twoCol" },
  // Multi-column → new column
  { key: "sumColumns", label: "Sum Columns", type: "multiCol" },
  { key: "averageColumns", label: "Average Columns", type: "multiCol" },
];

/* ─── Math Runner (uses MathOperations class) ─── */
function runMathOp(data, opKey, extra) {
  const op = MATH_OPS.find((o) => o.key === opKey);
  if (!op) throw new Error(`Unknown math operation: ${opKey}`);
  const col = extra?.column;
  const colA = extra?.columnA;
  const colB = extra?.columnB;
  const newCol = extra?.newColumn || `${opKey}_result`;
  const param = Number(extra?.paramValue);
  const cols = extra?.selectedColumns || [];

  return run(data, (s) => {
    switch (op.type) {
      case "singleInPlace": return mathOps[opKey](s, col);
      case "singleParam": return mathOps[opKey](s, col, param);
      case "singleNewCol":
        if (opKey === "cumulativeSum") return mathOps.cumulativeSum(s, col, newCol);
        if (opKey === "squareRoot") return mathOps.squareRoot(s, col, newCol);
        return mathOps[opKey](s, col, newCol);
      case "singleNewColParam":
        if (opKey === "power") return mathOps.power(s, col, param, newCol);
        if (opKey === "log") return mathOps.log(s, col, newCol, param);
        return mathOps[opKey](s, col, param, newCol);
      case "twoCol":
        if (opKey === "percentageChange") return mathOps.percentageChange(s, colA, colB, newCol);
        return mathOps[opKey](s, colA, colB, newCol);
      case "multiCol":
        if (opKey === "sumColumns") return mathOps.sumColumns(s, cols, newCol);
        if (opKey === "averageColumns") return mathOps.averageColumns(s, cols, newCol);
        return mathOps[opKey](s, cols, newCol);
      default:
        throw new Error(`Unsupported math type: ${op.type}`);
    }
  });
}

const FUNCTION_CATEGORIES = [
  {
    name: "Row Operations",
    items: [
      { key: "removeEmpty", label: "Remove Empty Rows", desc: "Remove rows where all values are empty", needsColumn: false },
      { key: "duplicates", label: "Remove Duplicates", desc: "Remove exact duplicate rows", needsColumn: false },
      { key: "search", label: "Search Rows", desc: "Keep rows matching a keyword", needsColumn: false, needsSearchKeyword: true },
      { key: "sampleRows", label: "Sample Rows", desc: "Keep first N or random N rows", needsColumn: false, needsSampleParams: true },
      { key: "reorderColumns", label: "Reorder Columns", desc: "Change the order of columns", needsColumn: false, needsReorderParams: true },
    ],
  },
  {
    name: "Filter & Sort",
    items: [
      { key: "filterRows", label: "Filter Rows", desc: "Keep rows matching a condition", needsColumn: true, needsFilterParams: true },
      { key: "sortRows", label: "Sort Rows", desc: "Sort rows by a column", needsColumn: true, needsSortParams: true },
    ],
  },
  {
    name: "Column Management",
    items: [
      { key: "removeColumn", label: "Remove Column", desc: "Delete a column from the dataset", needsColumn: true },
      { key: "renameColumn", label: "Rename Column", desc: "Give a column a new name", needsColumn: true, needsRenameParams: true },
      { key: "duplicateColumn", label: "Duplicate Column", desc: "Copy a column under a new name", needsColumn: true, needsDuplicateParams: true },
    ],
  },
  {
    name: "Type & Encoding",
    items: [
      { key: "typeConversion", label: "Type Conversion", desc: "Convert column values to number, string, or boolean", needsColumn: true },
      { key: "labelEncode", label: "Label Encode", desc: "Replace categories with integers", needsColumn: true },
      { key: "oneHotEncode", label: "One-Hot Encode", desc: "Turn categories into true/false columns", needsColumn: true },
    ],
  },
  {
    name: "Case & Text Formatting",
    items: [
      { key: "lower", label: "Lowercase", desc: "Convert text to lowercase", needsColumn: true },
      { key: "upper", label: "Uppercase", desc: "Convert text to UPPERCASE", needsColumn: true },
      { key: "proper", label: "Proper Case", desc: "Capitalize First Letter Of Each Word", needsColumn: true },
      { key: "sentenceCase", label: "Sentence Case", desc: "Capitalize first letter only", needsColumn: true },
    ],
  },
  {
    name: "Text Cleaning",
    items: [
      { key: "removeSpecialCharacters", label: "Remove Special Chars", desc: "Keep only letters, numbers, and spaces", needsColumn: true },
      { key: "removeNumbers", label: "Remove Numbers", desc: "Strip digits from text", needsColumn: true },
      { key: "collapseWhitespace", label: "Collapse Whitespace", desc: "Normalize spaces in text", needsColumn: true },
      { key: "reverseText", label: "Reverse Text", desc: "Reverse characters in each cell", needsColumn: true },
    ],
  },
  {
    name: "Find, Replace & Extract",
    items: [
      { key: "replaceValues", label: "Replace Value", desc: "Replace exact cell value with another value", needsColumn: true, needsValueParams: true },
      { key: "rewrite", label: "Rewrite (Substring)", desc: "Replace a substring within cell values", needsColumn: true, needsValueParams: true },
      { key: "replace", label: "Replace Text", desc: "Replace substring (all or nth occurrence)", needsColumn: true, needsReplaceParams: true },
      { key: "separate", label: "Separate Column", desc: "Split one column into two by a delimiter", needsColumn: true },
      { key: "truncateText", label: "Truncate", desc: "Limit text to N characters", needsColumn: true, needsTruncateParams: true },
      { key: "padLeft", label: "Pad Left", desc: "Pad text on the left", needsColumn: true, needsPadParams: true },
      { key: "padRight", label: "Pad Right", desc: "Pad text on the right", needsColumn: true, needsPadParams: true },
      { key: "extractSubstring", label: "Extract Substring", desc: "Copy a slice of text to a new column", needsColumn: true, needsSubstringParams: true },
    ],
  },
  {
    name: "Text Analysis",
    items: [
      { key: "countCharacters", label: "Count Characters", desc: "Add a column with character counts", needsColumn: true, needsCountParams: true },
      { key: "countWords", label: "Count Words", desc: "Add a column with word counts", needsColumn: true, needsCountParams: true },
      { key: "containsCheck", label: "Contains", desc: "Add true/false 'contains substring' column", needsColumn: true, needsCheckParams: true },
      { key: "startsWithCheck", label: "Starts With", desc: "Add true/false 'starts with' column", needsColumn: true, needsCheckParams: true },
      { key: "endsWithCheck", label: "Ends With", desc: "Add true/false 'ends with' column", needsColumn: true, needsCheckParams: true },
      { key: "regexExtract", label: "Regex Extract", desc: "Extract text matching a regex into a new column", needsColumn: true, needsRegexParams: true },
      { key: "regexReplace", label: "Regex Replace", desc: "Replace text matching a regex", needsColumn: true, needsRegexParams: true },
    ],
  },
  {
    name: "Combine & Split",
    items: [
      { key: "join", label: "Join Columns", desc: "Combine multiple columns with a delimiter", needsColumn: false, multiColumn: true },
      { key: "concatenate", label: "Concatenate Columns", desc: "Combine multiple columns without a delimiter", needsColumn: false, multiColumn: true },
    ],
  },
  {
    name: "Math",
    items: [
      { key: "math", label: "Math Operations", desc: "Arithmetic, rounding, absolute, and more", needsColumn: false, isMath: true },
      { key: "absolute", label: "Absolute Value", desc: "Convert numbers to their absolute value", needsColumn: true },
    ],
  },
  {
    name: "Date Operations",
    items: [
      { key: "dateStandard", label: "Date Standardize", desc: "Standardize date format in a column", needsColumn: true },
      { key: "extractYear", label: "Extract Year", desc: "Pull year into a new column", needsColumn: true, needsDateOp: true },
      { key: "extractMonth", label: "Extract Month", desc: "Pull month into a new column", needsColumn: true, needsDateOp: true },
      { key: "extractDay", label: "Extract Day", desc: "Pull day of month into a new column", needsColumn: true, needsDateOp: true },
      { key: "extractDayOfWeek", label: "Extract Weekday", desc: "Pull weekday name into a new column", needsColumn: true, needsDateOp: true },
      { key: "addDays", label: "Add Days", desc: "Add or subtract days from dates", needsColumn: true, needsAddDaysParams: true },
      { key: "ageFromBirthdate", label: "Age from Date", desc: "Calculate age from a date column", needsColumn: true, needsDateOp: true },
      { key: "isWeekend", label: "Is Weekend", desc: "Add true/false weekend column", needsColumn: true, needsDateOp: true },
      { key: "dateDifference", label: "Date Difference", desc: "Days/hours/minutes between two date columns", needsColumn: false, needsDateDiffParams: true },
    ],
  },
  {
    name: "Format & Validate",
    items: [
      { key: "currencyFormat", label: "Currency Format", desc: "Format numbers as currency", needsColumn: true, needsFormatOp: true },
      { key: "percentageFormat", label: "Percentage Format", desc: "Format numbers as percentages", needsColumn: true, needsFormatOp: true },
      { key: "emailValidityCheck", label: "Email Valid", desc: "Add true/false email validation column", needsColumn: true, needsValidationOp: true },
      { key: "phoneFormatCheck", label: "Phone Valid", desc: "Add true/false phone validation column", needsColumn: true, needsValidationOp: true },
      { key: "flagOutliers", label: "Flag Outliers", desc: "Mark numeric outliers using std dev", needsColumn: true, needsValidationOp: true },
    ],
  },
  {
    name: "Values & Missing Data",
    items: [
      { key: "getValues", label: "Get Unique Values", desc: "Show all unique values in a column", needsColumn: true, isGetValues: true },
      { key: "removeRowWithValue", label: "Remove Row by Value", desc: "Delete all rows where a column equals a value", needsColumn: true, needsRemoveValue: true },
      { key: "fillEmpty", label: "Fill Empty Values", desc: "Fill empty cells with mean, median, or a custom value", needsColumn: true, needsFillStrategy: true },
    ],
  },
];

// Flat alias for any code that still expects a single array.
const FUNCTIONS = FUNCTION_CATEGORIES.flatMap((cat) => cat.items);

/* ─── Natural-language keywords for function search ─── */
const FUNCTION_KEYWORDS = {
  removeEmpty: "empty blank rows delete",
  duplicates: "duplicate same identical unique",
  search: "find filter rows keyword text match",
  sampleRows: "sample random first n rows subset",
  reorderColumns: "reorder rearrange columns order move",
  filterRows: "filter rows condition equals greater less than contains",
  sortRows: "sort order ascending descending alphabet numeric",
  removeColumn: "remove delete column drop",
  renameColumn: "rename column name change",
  duplicateColumn: "duplicate copy column clone",
  typeConversion: "convert type number string boolean",
  labelEncode: "label encode category categorical integer",
  oneHotEncode: "one hot encode dummy binary category",
  lower: "lowercase lower case small letters",
  upper: "uppercase upper case capital all caps",
  proper: "proper case title case capitalize words",
  sentenceCase: "sentence case capitalize first letter",
  removeSpecialCharacters: "remove special characters symbols punctuation",
  removeNumbers: "remove numbers digits",
  collapseWhitespace: "collapse whitespace spaces trim normalize",
  reverseText: "reverse text characters backwards",
  replaceValues: "replace value exact cell match",
  rewrite: "rewrite replace substring text inside",
  replace: "replace text substring occurrence",
  separate: "separate split column delimiter",
  truncateText: "truncate shorten length characters",
  padLeft: "pad left leading zeros spaces",
  padRight: "pad right trailing spaces",
  extractSubstring: "extract substring slice copy text",
  countCharacters: "count characters length",
  countWords: "count words word count",
  containsCheck: "contains substring check true false",
  startsWithCheck: "starts with prefix begin",
  endsWithCheck: "ends with suffix finish",
  regexExtract: "regex extract pattern match",
  regexReplace: "regex replace pattern",
  join: "join columns combine delimiter",
  concatenate: "concatenate columns combine merge text",
  math: "math operations arithmetic add subtract multiply divide round",
  absolute: "absolute value positive abs",
  dateStandard: "date standardize format normalize",
  extractYear: "extract year pull",
  extractMonth: "extract month pull",
  extractDay: "extract day pull",
  extractDayOfWeek: "extract weekday day of week pull",
  addDays: "add days subtract dates",
  ageFromBirthdate: "age from date birthdate calculate years",
  isWeekend: "is weekend saturday sunday",
  dateDifference: "date difference days hours minutes between",
  currencyFormat: "currency format money dollar euro",
  percentageFormat: "percentage format percent ratio",
  emailValidityCheck: "email valid validate check",
  phoneFormatCheck: "phone valid validate check number",
  flagOutliers: "flag outliers anomaly detect std dev",
  getValues: "get unique values distinct list",
  removeRowWithValue: "remove row value delete rows equals",
  fillEmpty: "fill empty missing values mean median custom",
};

/** Score a function by how many query words match its label, desc, and keywords. */
function scoreFunctionMatch(fn, query) {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  const queryWords = q.split(/\s+/).filter(Boolean);
  const haystack = `${fn.label} ${fn.desc} ${FUNCTION_KEYWORDS[fn.key] || ""}`.toLowerCase();
  const matches = queryWords.filter((word) => haystack.includes(word)).length;
  return matches / queryWords.length;
}

/** Filter categories to only those with matching functions. */
function filterFunctionCategories(query, aiKeys = []) {
  if (!query.trim()) return FUNCTION_CATEGORIES;

  // If AI has returned interpreted keys, show only those functions in the returned order.
  if (aiKeys.length > 0) {
    return FUNCTION_CATEGORIES
      .map((cat) => ({
        ...cat,
        items: aiKeys
          .map((key) => cat.items.find((fn) => fn.key === key))
          .filter(Boolean),
      }))
      .filter((cat) => cat.items.length > 0);
  }

  // Fallback: local keyword / description matching.
  return FUNCTION_CATEGORIES
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((fn) => scoreFunctionMatch(fn, query) > 0),
    }))
    .filter((cat) => cat.items.length > 0);
}

/* ─── Shared FileView component (used by both Excel and CSV) ─── */
export function FileView({ file, fileType, navLabel, sheetNames, activeSheet, onSheetChange }) {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [history, setHistory] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [initialCleanDone, setInitialCleanDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [columnPicker, setColumnPicker] = useState(null); // { funcKey, endpoint }
  const [cleanStats, setCleanStats] = useState(null);
  const [extraParams, setExtraParams] = useState({}); // for date format, type target, separate params, etc.
  const [multiColumns, setMultiColumns] = useState([]); // for join / concatenate multi-column selection
  const [showEmptyValues, setShowEmptyValues] = useState(false); // toggle empty values inspector
  const [mathModal, setMathModal] = useState(null); // { step: 'pick'|'config', mathOp, mathDef }
  const [searchQuery, setSearchQuery] = useState(""); // data row search filter
  const [funcSearchQuery, setFuncSearchQuery] = useState(""); // natural-language function search
  const [aiSearchKeys, setAiSearchKeys] = useState([]); // keys returned by AI interpret endpoint
  const [aiSearchLoading, setAiSearchLoading] = useState(false); // AI search in progress
  const [aiSearchError, setAiSearchError] = useState(null); // AI search error message
  const [getValuesResult, setGetValuesResult] = useState(null); // { column, values[] }
  const [saveStatus, setSaveStatus] = useState(""); // "" | "saving" | "saved" | "error"
  const sheetsRef = useRef(file?.sheets || {}); // always-current sheets for persist
  const saveInFlightRef = useRef(false); // is a save request currently in-flight?
  const pendingSaveRef = useRef(null); // latest data waiting to be saved after current save finishes
  const saveTimerRef = useRef(null); // debounce timer

  // Keep sheetsRef in sync with the active sheet's latest data
  useEffect(() => {
    sheetsRef.current = { ...sheetsRef.current, [activeSheet]: data };
  }, [data, activeSheet]);

  // Warn user if they try to refresh/close while saving
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (saveInFlightRef.current || pendingSaveRef.current) {
        e.preventDefault();
        e.returnValue = "Your changes are still saving. Leave anyway?";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Load sheet data when sheet changes
  useEffect(() => {
    if (file && file.sheets) {
      sheetsRef.current = { ...file.sheets };
      const sheetData = file.sheets[activeSheet] || [];
      setData(sheetData);
      setHistory([]);
      setDrafts([]);
      // Check persisted clean-done flag for this file + sheet
      try {
        const flags = JSON.parse(localStorage.getItem("dc_cleaned") || "{}");
        const cleaned = flags[String(file.id)]?.[activeSheet] || false;
        setInitialCleanDone(cleaned);
      } catch {
        setInitialCleanDone(false);
      }
    }
  }, [file, activeSheet]);

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  // Filtered data based on search query
  const filteredData = searchQuery.trim()
    ? data.filter((row) => {
        const term = searchQuery.toLowerCase();
        return Object.values(row).some((val) =>
          String(val ?? "").toLowerCase().includes(term)
        );
      })
    : data;

  // Reset search when sheet changes
  useEffect(() => { setSearchQuery(""); }, [activeSheet]);

  // Serialized save: only one fetch in-flight at a time, latest data always wins
  const doSave = useCallback((allSheets) => {
    saveInFlightRef.current = true;
    setSaveStatus("saving");
    const body = JSON.stringify({
      action: "update",
      fileId: Number(file.id),
      sheets: allSheets,
      sheetNames: file.sheetNames || [],
    });
    fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })
      .then((r) => {
        if (!r.ok) throw new Error("save failed");
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus(""), 2000);
      })
      .catch(() => {
        // Retry with sendBeacon (survives page unload)
        try {
          navigator.sendBeacon("/api/files", new Blob([body], { type: "application/json" }));
        } catch {}
        setSaveStatus("error");
        setTimeout(() => setSaveStatus(""), 3000);
      })
      .finally(() => {
        saveInFlightRef.current = false;
        // If a newer change came in while this save was in-flight, flush it now
        if (pendingSaveRef.current) {
          const next = pendingSaveRef.current;
          pendingSaveRef.current = null;
          doSave(next);
        }
      });
  }, [file]);

  // Debounced persist: waits 300ms, then sends the LATEST data through the serialized queue
  const persistFile = useCallback(
    (newSheetData) => {
      const allSheets = { ...sheetsRef.current, [activeSheet]: newSheetData };
      sheetsRef.current = allSheets;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        if (saveInFlightRef.current) {
          // A save is already in-flight — just remember the latest data
          pendingSaveRef.current = allSheets;
        } else {
          doSave(allSheets);
        }
      }, 300);
    },
    [activeSheet, doSave]
  );

  // Push current data to undo history
  const pushHistory = () => {
    setHistory((prev) => [...prev, JSON.parse(JSON.stringify(data))]);
  };

  // Save a draft snapshot (pass explicit data to avoid stale state)
  const saveDraft = (label, draftData = data) => {
    setDrafts((prev) => [
      { label, data: JSON.parse(JSON.stringify(draftData)), timestamp: Date.now() },
      ...prev,
    ]);
  };

  /* ─── Initial Clean (uses Clean.clean like the API, then dedup + datatypes) ─── */
  const runInitialClean = () => {
    pushHistory();
    const beforeRows = data.length;

    // Use the same Clean class the backend uses for /api/operations clean.
    const sheet = XLSX.utils.json_to_sheet(data);
    const cleanedSheet = new Clean().clean(sheet);
    let current = XLSX.utils.sheet_to_json(cleanedSheet, { defval: "" });
    const afterClean = current.length;

    current = removeDuplicates(current);
    const afterDedup = current.length;
    current = detectDatatypes(current);

    const duplicatesRemoved = afterClean - afterDedup;
    const emptyRowsRemoved = beforeRows - afterClean;

    setData(current);
    persistFile(current);
    saveDraft("Initial Clean", current);
    setInitialCleanDone(true);

    // Persist clean-done flag so it never runs again for this file + sheet
    try {
      const flags = JSON.parse(localStorage.getItem("dc_cleaned") || "{}");
      if (!flags[String(file.id)]) flags[String(file.id)] = {};
      flags[String(file.id)][activeSheet] = true;
      localStorage.setItem("dc_cleaned", JSON.stringify(flags));
    } catch {}
    setCleanStats({
      rowsBefore: beforeRows,
      rowsAfter: current.length,
      emptyRowsRemoved,
      duplicatesRemoved,
    });
  };

  /* ─── AI-powered natural-language function search ─── */
  const interpretFunctionSearch = async () => {
    const query = funcSearchQuery.trim();
    if (!query) {
      setAiSearchKeys([]);
      setAiSearchError(null);
      return;
    }

    setAiSearchLoading(true);
    setAiSearchError(null);
    try {
      const res = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error ${res.status}`);
      }

      const { keys } = await res.json();
      setAiSearchKeys(Array.isArray(keys) ? keys : []);
    } catch (err) {
      console.error("AI search failed:", err);
      setAiSearchError(err.message || "AI search failed");
      setAiSearchKeys([]);
    } finally {
      setAiSearchLoading(false);
    }
  };

  /* ─── Apply a cleaning function (client-side) ─── */
  const applyFunction = (funcDef, column, extra = {}) => {
    try {
      pushHistory();
      const runner = FUNCTION_RUNNERS[funcDef.key];
      if (!runner) throw new Error(`Unknown function: ${funcDef.key}`);
      const result = funcDef.needsColumn ? runner(data, column, extra) : runner(data, null, extra);
      // getValues returns a special object — show result without modifying data
      if (result && result.__getValuesResult) {
        setHistory((prev) => prev.slice(0, -1)); // undo the premature history push
        const unique = result.__getValuesResult;
        setGetValuesResult({ column, values: unique });
        setColumnPicker(null);
        return;
      }
      setData(result);
      persistFile(result);
      saveDraft(funcDef.label + (column ? ` (${column})` : ""));
      setColumnPicker(null);
      setExtraParams({});
    } catch (err) {
      setError(err.message);
    }
  };

  /* ─── Undo last action ─── */
  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setData(prev);
    persistFile(prev);
  };

  /* ─── Jump to a draft ─── */
  const jumpToDraft = (draft) => {
    pushHistory();
    setData(JSON.parse(JSON.stringify(draft.data)));
    persistFile(draft.data);
  };

  /* ─── Handle function card click ─── */
  const handleFuncClick = (funcDef) => {
    setExtraParams({});
    if (funcDef.isMath) {
      setMathModal({ step: "pick" });
    } else if (funcDef.multiColumn) {
      setColumnPicker({ funcKey: funcDef.key, label: funcDef.label, multiColumn: true });
      setMultiColumns([]);
    } else if (funcDef.needsColumn) {
      setColumnPicker({ funcKey: funcDef.key, endpoint: funcDef.endpoint, label: funcDef.label });
    } else if (hasExtraParams(funcDef)) {
      // Params-only functions (no column selection needed)
      setColumnPicker({ funcKey: funcDef.key, label: funcDef.label, showParams: true });
    } else {
      applyFunction(funcDef);
    }
  };

  /* Helper: does a function definition require extra parameters? */
  function hasExtraParams(fn) {
    return fn.needsSearchKeyword || fn.needsSampleParams || fn.needsReorderParams || fn.needsDateDiffParams;
  }

  /* ─── Export current data as XLSX download (client-side) ─── */
  const exportFile = () => {
    try {
      const sheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
      XLSX.writeFile(workbook, file.filename || "export.xlsx");
    } catch (err) {
      setError("Export failed: " + err.message);
    }
  };

  return (
    <div className="app-layout">
      {/* Top Nav */}
      <nav className="top-nav">
        <div className="nav-tabs">
          <Link to="/" className="nav-tab">Data Cleaner</Link>
          <span className="nav-tab active">{navLabel}</span>
        </div>
        <div className="nav-actions">
          {saveStatus === "saving" && (
            <span style={{ fontSize: 12, color: "#a89279", marginRight: 8 }}>Saving…</span>
          )}
          {saveStatus === "saved" && (
            <span style={{ fontSize: 12, color: "#6f9e6f", marginRight: 8 }}>✓ Saved</span>
          )}
          {saveStatus === "error" && (
            <span style={{ fontSize: 12, color: "#c06060", marginRight: 8 }}>Save failed</span>
          )}
          <button
            className="export-btn"
            onClick={() =>
              navigate("/charts", {
                state: {
                  sheet: data,
                  filePath: file.filename || `file_${file.id}`,
                  columns: data.length > 0 ? Object.keys(data[0]) : [],
                  email: localStorage.getItem("dc_userEmail") || "",
                },
              })
            }
            title="Visualise data"
            style={{ background: "#6B5D4F", color: "#fff", border: "none", borderRadius: 6, padding: "6px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", marginRight: 8 }}
          >
            Visualise
          </button>
          <button className="export-btn" onClick={exportFile} title="Download as XLSX">
            Export
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className={`file-layout ${sheetNames && sheetNames.length > 1 ? "with-sidebar" : ""}`}>
        {/* Sheet sidebar (Excel only) */}
        {sheetNames && sheetNames.length > 1 && (
          <aside className="sheet-sidebar">
            <h3 className="sidebar-title">Sheets</h3>
            {sheetNames.map((name) => (
              <button
                key={name}
                className={`sheet-tab ${name === activeSheet ? "active" : ""}`}
                onClick={() => onSheetChange(name)}
              >
                {name}
              </button>
            ))}
          </aside>
        )}

        {/* Content Area */}
        <div className="file-content">
          {error && (
            <div className="error-bar">
              <span>{error}</span>
              <button onClick={() => setError(null)}>&times;</button>
            </div>
          )}

          {/* Fixed Data Panel (search + table + result banners) */}
          <div className="data-panel">
            {data.length > 0 && (
              <div className="search-bar">
                <span className="search-icon">&#128269;</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search all columns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <>
                    <span className="search-count">
                      {filteredData.length} of {data.length} rows
                    </span>
                    <button className="search-clear" onClick={() => setSearchQuery("")} title="Clear search">
                      &times;
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Data Table / Empty Values Inspector */}
            {showEmptyValues ? (
            <EmptyValues
              data={data}
              onUpdate={(newData) => {
                pushHistory();
                setData(newData);
                persistFile(newData);
                saveDraft("Remove Empty Values");
              }}
              onBack={() => setShowEmptyValues(false)}
            />
          ) : (
            <div className="table-wrap">
              {filteredData.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.slice(0, 50).map((row, i) => (
                      <tr key={i}>
                        {columns.map((col) => {
                          const cellVal = row[col] != null ? String(row[col]) : "";
                          const isMatch = searchQuery.trim() && cellVal.toLowerCase().includes(searchQuery.toLowerCase());
                          return (
                            <td key={col} className={isMatch ? "search-highlight" : ""}>
                              {cellVal}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="empty-msg">{searchQuery ? "No rows match your search" : "No data to display"}</p>
              )}
              {filteredData.length > 50 && (
                <p className="truncation-note">Showing first 50 of {filteredData.length} rows{searchQuery ? ` (${data.length} total)` : ""}</p>
              )}
            </div>
          )}

          {/* Clean Results Banner */}
          {cleanStats && (
            <div className="clean-results">
              <strong>Initial Clean Complete</strong>
              <div className="clean-stats">
                <span>{cleanStats.rowsBefore} rows &rarr; {cleanStats.rowsAfter} rows</span>
                {cleanStats.emptyRowsRemoved > 0 && (
                  <span className="stat-badge">{cleanStats.emptyRowsRemoved} empty rows removed</span>
                )}
                {cleanStats.duplicatesRemoved > 0 && (
                  <span className="stat-badge">{cleanStats.duplicatesRemoved} duplicates removed</span>
                )}
                {cleanStats.emptyRowsRemoved === 0 && cleanStats.duplicatesRemoved === 0 && (
                  <span className="stat-badge ok">Data was already clean</span>
                )}
              </div>
              <button className="dismiss-btn" onClick={() => setCleanStats(null)}>&times;</button>
            </div>
          )}

          {/* Get Unique Values Result Panel */}
          {getValuesResult && (
            <div className="clean-results get-values-results">
              <strong>Unique Values: {getValuesResult.column}</strong>
              <div className="get-values-list">
                {getValuesResult.values.length > 0 ? (
                  getValuesResult.values.map((val, i) => (
                    <span key={i} className="stat-badge">{String(val)}</span>
                  ))
                ) : (
                  <span className="stat-badge ok">No values found</span>
                )}
              </div>
              <button className="dismiss-btn" onClick={() => setGetValuesResult(null)}>&times;</button>
            </div>
          )}

          {initialCleanDone && (
            <>
              <h3 className="section-heading fixed-functions-heading">Functions</h3>

              {/* Natural-language function search */}
              <div className="function-search-bar">
                <span className="function-search-icon">&#128269;</span>
                <input
                  type="text"
                  className="function-search-input"
                  placeholder="Describe what you want, e.g. 'make text uppercase' or 'remove duplicates'"
                  value={funcSearchQuery}
                  onChange={(e) => {
                    setFuncSearchQuery(e.target.value);
                    setAiSearchKeys([]); // reset AI results while typing
                    setAiSearchError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") interpretFunctionSearch();
                  }}
                />
                {funcSearchQuery && (
                  <button
                    className="function-search-clear"
                    onClick={() => {
                      setFuncSearchQuery("");
                      setAiSearchKeys([]);
                      setAiSearchError(null);
                    }}
                    title="Clear search"
                  >
                    &times;
                  </button>
                )}
                <button
                  className="function-search-btn"
                  onClick={interpretFunctionSearch}
                  disabled={aiSearchLoading || !funcSearchQuery.trim()}
                  title="Search with AI"
                >
                  {aiSearchLoading ? "..." : "Search"}
                </button>
              </div>
              {aiSearchError && (
                <p className="function-search-error">{aiSearchError}</p>
              )}
            </>
          )}
          </div>

          {/* Initial Clean Gate */}
          {!initialCleanDone ? (
            <div className="gate-section">
              <p className="gate-text">
                Run Initial Clean to unlock all functions.
                <br />
                <small>Applies: Trim, Clean, Remove Duplicates, Datatype Detection</small>
              </p>
              <button className="primary-btn" onClick={runInitialClean} disabled={loading}>
                {loading ? "Cleaning..." : "Initial Clean"}
              </button>
            </div>
          ) : (
            <>
              {/* Functions Grid */}
              <section className="functions-section">
                <div className="function-category">
                  <h4 className="category-heading">Inspectors</h4>
                  <div className="functions-grid">
                    <button
                      className="func-card"
                      onClick={() => setShowEmptyValues(true)}
                      disabled={loading}
                    >
                      <span className="func-name">Empty Values</span>
                      <span className="func-desc">Inspect & remove rows with empty cells</span>
                    </button>
                  </div>
                </div>

                {filterFunctionCategories(funcSearchQuery, aiSearchKeys).map((cat) => (
                  <div key={cat.name} className="function-category">
                    <h4 className="category-heading">{cat.name}</h4>
                    <div className="functions-grid">
                      {cat.items.map((fn) => (
                        <button
                          key={fn.key}
                          className="func-card"
                          onClick={() => handleFuncClick(fn)}
                          disabled={loading}
                        >
                          <span className="func-name">{fn.label}</span>
                          <span className="func-desc">{fn.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {funcSearchQuery && filterFunctionCategories(funcSearchQuery, aiSearchKeys).length === 0 && (
                  <p className="function-search-empty">No functions match "{funcSearchQuery}"</p>
                )}
              </section>

              {/* Values Panel (getValues / replace / rewrite / remove row) */}
              <ValuesPanel
                data={data}
                columns={columns}
                onChange={(nextData, summary) => {
                  pushHistory();
                  setData(nextData);
                  persistFile(nextData);
                  saveDraft(summary || "Values operation");
                }}
              />

              {/* Drafts */}
              {drafts.length > 0 && (
                <section className="drafts-section">
                  <h3 className="section-heading">Drafts</h3>
                  <div className="drafts-list">
                    {drafts.map((d, i) => (
                      <button key={i} className="draft-chip" onClick={() => jumpToDraft(d)}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>

      {/* Undo Bar */}
      <div className="undo-bar">
        <button className="undo-btn" onClick={undo} disabled={history.length === 0}>
          &#8630; Undo
        </button>
        <span className="history-count">{history.length} step{history.length !== 1 ? "s" : ""} back</span>
      </div>

      {/* Column Picker Modal */}
      {columnPicker && (
        <div className="modal-overlay" onClick={() => { setColumnPicker(null); setExtraParams({}); setMultiColumns([]); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {columnPicker.label}
              {columnPicker.showParams && !columnPicker.selectedColumn
                ? ""
                : columnPicker.multiColumn
                ? " — Choose columns"
                : " — Choose a column"}
            </h3>

            {/* ── Multi-column selection (join / concatenate) ── */}
            {columnPicker.showParams && !columnPicker.selectedColumn ? null : columnPicker.multiColumn ? (
              <>
                <p className="modal-hint">Select two or more columns</p>
                <div className="column-grid">
                  {columns.map((col) => {
                    const selected = multiColumns.includes(col);
                    return (
                      <button
                        key={col}
                        className={`column-chip ${selected ? "selected" : ""}`}
                        onClick={() =>
                          setMultiColumns((prev) =>
                            selected ? prev.filter((c) => c !== col) : [...prev, col]
                          )
                        }
                      >
                        {col}
                      </button>
                    );
                  })}
                </div>

                {multiColumns.length >= 2 && (
                  <div className="selected-columns-preview">
                    <strong>Selected:</strong> {multiColumns.join(", ")}
                  </div>
                )}

                {/* Join extra params */}
                {columnPicker.funcKey === "join" && (
                  <div className="extra-params">
                    <label>
                      Delimiter:
                      <input
                        type="text"
                        value={extraParams.delimiter ?? " "}
                        onChange={(e) => setExtraParams({ ...extraParams, delimiter: e.target.value })}
                        placeholder=" "
                      />
                    </label>
                    <label>
                      New column name:
                      <input
                        type="text"
                        value={extraParams.newColumn ?? "joined"}
                        onChange={(e) => setExtraParams({ ...extraParams, newColumn: e.target.value })}
                        placeholder="joined"
                      />
                    </label>
                  </div>
                )}

                {/* Concatenate extra params */}
                {columnPicker.funcKey === "concatenate" && (
                  <div className="extra-params">
                    <label>
                      Custom string (optional):
                      <input
                        type="text"
                        value={extraParams.customString ?? ""}
                        onChange={(e) => setExtraParams({ ...extraParams, customString: e.target.value })}
                        placeholder="e.g. - or _"
                      />
                    </label>
                    <label>
                      New column name:
                      <input
                        type="text"
                        value={extraParams.newColumn ?? "concatenated"}
                        onChange={(e) => setExtraParams({ ...extraParams, newColumn: e.target.value })}
                        placeholder="concatenated"
                      />
                    </label>
                  </div>
                )}

                <button
                  className="primary-btn modal-apply-btn"
                  disabled={multiColumns.length < 2}
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === columnPicker.funcKey);
                    applyFunction(fn, null, { ...extraParams, selectedColumns: multiColumns });
                  }}
                >
                  Apply
                </button>
              </>
            ) : (
              <>
                {/* ── Single-column selection ── */}
                <div className="column-grid">
                  {columns.map((col) => (
                    <button
                      key={col}
                      className="column-chip"
                      onClick={() => {
                        const fn = FUNCTIONS.find((f) => f.key === columnPicker.funcKey);
                        if (
                          fn.key === "separate" ||
                          fn.needsValueParams ||
                          fn.needsRemoveValue ||
                          fn.needsFillStrategy ||
                          fn.needsReplaceParams ||
                          fn.needsRenameParams ||
                          fn.needsDuplicateParams ||
                          fn.needsFilterParams ||
                          fn.needsSortParams ||
                          fn.needsDateOp ||
                          fn.needsAddDaysParams ||
                          fn.needsFormatOp ||
                          fn.needsValidationOp ||
                          fn.needsTruncateParams ||
                          fn.needsPadParams ||
                          fn.needsSubstringParams ||
                          fn.needsCountParams ||
                          fn.needsCheckParams ||
                          fn.needsRegexParams
                        ) {
                          // Open extra params instead of applying immediately
                          setColumnPicker((prev) => ({ ...prev, selectedColumn: col, showParams: true }));
                        } else {
                          applyFunction(fn, col, extraParams);
                        }
                      }}
                    >
                      {col}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Extra params for specific single-column functions */}
            {columnPicker.funcKey === "dateStandard" && (
              <div className="extra-params">
                <label>Date Format:</label>
                <select
                  value={extraParams.format || "YYYY-MM-DD"}
                  onChange={(e) => setExtraParams({ ...extraParams, format: e.target.value })}
                >
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD-MM-YYYY">DD-MM-YYYY</option>
                </select>
              </div>
            )}

            {columnPicker.funcKey === "typeConversion" && (
              <div className="extra-params">
                <label>Target Type:</label>
                <select
                  value={extraParams.targetType || "string"}
                  onChange={(e) => setExtraParams({ ...extraParams, targetType: e.target.value })}
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                </select>
              </div>
            )}

            {/* Separate column extra params */}
            {columnPicker.funcKey === "separate" && columnPicker.showParams && (
              <div className="extra-params">
                <p className="modal-hint">Splitting column: <strong>{columnPicker.selectedColumn}</strong></p>
                <label>
                  Delimiter:
                  <input
                    type="text"
                    value={extraParams.delimiter ?? ","}
                    onChange={(e) => setExtraParams({ ...extraParams, delimiter: e.target.value })}
                    placeholder=","
                  />
                </label>
                <label>
                  Occurrence (split at Nth delimiter):
                  <input
                    type="number"
                    min="1"
                    value={extraParams.occurrence ?? 1}
                    onChange={(e) => setExtraParams({ ...extraParams, occurrence: e.target.value })}
                  />
                </label>
                <label>
                  New column 1 name:
                  <input
                    type="text"
                    value={extraParams.newColumn1 ?? `${columnPicker.selectedColumn || ""}_1`}
                    onChange={(e) => setExtraParams({ ...extraParams, newColumn1: e.target.value })}
                    placeholder={`${columnPicker.selectedColumn}_1`}
                  />
                </label>
                <label>
                  New column 2 name:
                  <input
                    type="text"
                    value={extraParams.newColumn2 ?? `${columnPicker.selectedColumn || ""}_2`}
                    onChange={(e) => setExtraParams({ ...extraParams, newColumn2: e.target.value })}
                    placeholder={`${columnPicker.selectedColumn}_2`}
                  />
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === "separate");
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Replace Value / Rewrite extra params */}
            {(columnPicker.funcKey === "replaceValues" || columnPicker.funcKey === "rewrite") && columnPicker.selectedColumn && (
              <div className="extra-params">
                <p className="modal-hint">
                  {columnPicker.funcKey === "rewrite" ? "Substring to find:" : "Value to find:"}
                </p>
                <label>
                  Find:
                  <input
                    type="text"
                    value={extraParams.findValue ?? ""}
                    onChange={(e) => setExtraParams({ ...extraParams, findValue: e.target.value })}
                    placeholder="Value to find"
                  />
                </label>
                <label>
                  Replace with:
                  <input
                    type="text"
                    value={extraParams.replaceWith ?? ""}
                    onChange={(e) => setExtraParams({ ...extraParams, replaceWith: e.target.value })}
                    placeholder="Replacement value"
                  />
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  disabled={!extraParams.findValue}
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === columnPicker.funcKey);
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Remove Row by Value extra params */}
            {columnPicker.funcKey === "removeRowWithValue" && columnPicker.selectedColumn && (
              <div className="extra-params">
                <label>
                  Remove rows where <strong>{columnPicker.selectedColumn}</strong> equals:
                  <input
                    type="text"
                    value={extraParams.findValue ?? ""}
                    onChange={(e) => setExtraParams({ ...extraParams, findValue: e.target.value })}
                    placeholder="Value to match"
                  />
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  disabled={extraParams.findValue === undefined || extraParams.findValue === ""}
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === "removeRowWithValue");
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Fill Empty Values extra params */}
            {columnPicker.funcKey === "fillEmpty" && columnPicker.selectedColumn && (
              <div className="extra-params">
                <p className="modal-hint">Filling empty cells in: <strong>{columnPicker.selectedColumn}</strong></p>
                <label>
                  Strategy:
                  <select
                    value={extraParams.strategy || "value"}
                    onChange={(e) => setExtraParams({ ...extraParams, strategy: e.target.value })}
                  >
                    <option value="value">Custom value</option>
                    <option value="mean">Mean (numeric)</option>
                    <option value="median">Median (numeric)</option>
                  </select>
                </label>
                {(!extraParams.strategy || extraParams.strategy === "value") && (
                  <label>
                    Fill with:
                    <input
                      type="text"
                      value={extraParams.customValue ?? ""}
                      onChange={(e) => setExtraParams({ ...extraParams, customValue: e.target.value })}
                      placeholder="Value to insert"
                    />
                  </label>
                )}
                <button
                  className="primary-btn modal-apply-btn"
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === "fillEmpty");
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Replace Text extra params */}
            {columnPicker.funcKey === "replace" && columnPicker.selectedColumn && (
              <div className="extra-params">
                <p className="modal-hint">Replacing in: <strong>{columnPicker.selectedColumn}</strong></p>
                <label>
                  Find:
                  <input
                    type="text"
                    value={extraParams.findValue ?? ""}
                    onChange={(e) => setExtraParams({ ...extraParams, findValue: e.target.value })}
                    placeholder="Text to find"
                  />
                </label>
                <label>
                  Replace with:
                  <input
                    type="text"
                    value={extraParams.replaceWith ?? ""}
                    onChange={(e) => setExtraParams({ ...extraParams, replaceWith: e.target.value })}
                    placeholder="Replacement"
                  />
                </label>
                <label>
                  Occurrence (leave blank for all):
                  <input
                    type="number"
                    min="1"
                    value={extraParams.occurrence ?? ""}
                    onChange={(e) => setExtraParams({ ...extraParams, occurrence: e.target.value })}
                    placeholder="All"
                  />
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  disabled={!extraParams.findValue}
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === "replace");
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Search Rows extra params (no column) */}
            {columnPicker.funcKey === "search" && columnPicker.showParams && (
              <div className="extra-params">
                <label>
                  Search keyword:
                  <input
                    type="text"
                    value={extraParams.keyword ?? ""}
                    onChange={(e) => setExtraParams({ ...extraParams, keyword: e.target.value })}
                    placeholder="Keyword"
                  />
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  disabled={!extraParams.keyword}
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === "search");
                    applyFunction(fn, null, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Sample Rows extra params (no column) */}
            {columnPicker.funcKey === "sampleRows" && columnPicker.showParams && (
              <div className="extra-params">
                <label>
                  Count:
                  <input
                    type="number"
                    min="1"
                    value={extraParams.count ?? 10}
                    onChange={(e) => setExtraParams({ ...extraParams, count: e.target.value })}
                  />
                </label>
                <label>
                  Mode:
                  <select
                    value={extraParams.mode || "first"}
                    onChange={(e) => setExtraParams({ ...extraParams, mode: e.target.value })}
                  >
                    <option value="first">First N</option>
                    <option value="random">Random N</option>
                  </select>
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === "sampleRows");
                    applyFunction(fn, null, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Reorder Columns extra params (no column) */}
            {columnPicker.funcKey === "reorderColumns" && columnPicker.showParams && (
              <div className="extra-params">
                <p className="modal-hint">Drag-style: list columns in desired order (comma-separated). Unlisted columns stay at the end.</p>
                <label>
                  Column order:
                  <input
                    type="text"
                    value={extraParams.orderText ?? columns.join(", ")}
                    onChange={(e) => setExtraParams({ ...extraParams, orderText: e.target.value })}
                    placeholder="col1, col2, col3"
                  />
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  onClick={() => {
                    const ordered = (extraParams.orderText ?? columns.join(", "))
                      .split(",")
                      .map((c) => c.trim())
                      .filter(Boolean);
                    const fn = FUNCTIONS.find((f) => f.key === "reorderColumns");
                    applyFunction(fn, null, { ...extraParams, orderedColumns: ordered });
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Rename Column extra params */}
            {columnPicker.funcKey === "renameColumn" && columnPicker.selectedColumn && (
              <div className="extra-params">
                <p className="modal-hint">Rename <strong>{columnPicker.selectedColumn}</strong> to:</p>
                <label>
                  New name:
                  <input
                    type="text"
                    value={extraParams.newName ?? ""}
                    onChange={(e) => setExtraParams({ ...extraParams, newName: e.target.value })}
                    placeholder="new_column_name"
                  />
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  disabled={!extraParams.newName}
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === "renameColumn");
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Duplicate Column extra params */}
            {columnPicker.funcKey === "duplicateColumn" && columnPicker.selectedColumn && (
              <div className="extra-params">
                <p className="modal-hint">Duplicate <strong>{columnPicker.selectedColumn}</strong> as:</p>
                <label>
                  New column name:
                  <input
                    type="text"
                    value={extraParams.newColumn ?? `${columnPicker.selectedColumn}_copy`}
                    onChange={(e) => setExtraParams({ ...extraParams, newColumn: e.target.value })}
                  />
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  disabled={!extraParams.newColumn}
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === "duplicateColumn");
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Filter Rows extra params */}
            {columnPicker.funcKey === "filterRows" && columnPicker.selectedColumn && (
              <div className="extra-params">
                <p className="modal-hint">Filter <strong>{columnPicker.selectedColumn}</strong></p>
                <label>
                  Condition:
                  <select
                    value={extraParams.condition || "equals"}
                    onChange={(e) => setExtraParams({ ...extraParams, condition: e.target.value })}
                  >
                    <option value="equals">Equals</option>
                    <option value="not_equals">Not equals</option>
                    <option value="greater_than">Greater than</option>
                    <option value="less_than">Less than</option>
                    <option value="contains">Contains</option>
                    <option value="starts_with">Starts with</option>
                    <option value="ends_with">Ends with</option>
                  </select>
                </label>
                <label>
                  Value:
                  <input
                    type="text"
                    value={extraParams.value ?? ""}
                    onChange={(e) => setExtraParams({ ...extraParams, value: e.target.value })}
                    placeholder="Value"
                  />
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === "filterRows");
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Sort Rows extra params */}
            {columnPicker.funcKey === "sortRows" && columnPicker.selectedColumn && (
              <div className="extra-params">
                <p className="modal-hint">Sort by <strong>{columnPicker.selectedColumn}</strong></p>
                <label>
                  Direction:
                  <select
                    value={extraParams.direction || "asc"}
                    onChange={(e) => setExtraParams({ ...extraParams, direction: e.target.value })}
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === "sortRows");
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Date operation extra params (extract, age, weekend) */}
            {(columnPicker.funcKey === "extractYear" || columnPicker.funcKey === "extractMonth" || columnPicker.funcKey === "extractDay" || columnPicker.funcKey === "extractDayOfWeek" || columnPicker.funcKey === "ageFromBirthdate" || columnPicker.funcKey === "isWeekend") && columnPicker.selectedColumn && (
              <div className="extra-params">
                <p className="modal-hint">From <strong>{columnPicker.selectedColumn}</strong></p>
                <label>
                  New column name:
                  <input
                    type="text"
                    value={extraParams.newColumn ?? `${columnPicker.selectedColumn}_${columnPicker.funcKey.replace("extract", "").toLowerCase()}`}
                    onChange={(e) => setExtraParams({ ...extraParams, newColumn: e.target.value })}
                  />
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  disabled={!extraParams.newColumn}
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === columnPicker.funcKey);
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Add Days extra params */}
            {columnPicker.funcKey === "addDays" && columnPicker.selectedColumn && (
              <div className="extra-params">
                <p className="modal-hint">Add/subtract days to <strong>{columnPicker.selectedColumn}</strong></p>
                <label>
                  Days:
                  <input
                    type="number"
                    value={extraParams.days ?? 0}
                    onChange={(e) => setExtraParams({ ...extraParams, days: e.target.value })}
                  />
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === "addDays");
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Date Difference extra params (no column) */}
            {columnPicker.funcKey === "dateDifference" && columnPicker.showParams && (
              <div className="extra-params">
                <label>
                  Start date column:
                  <select
                    value={extraParams.columnA || ""}
                    onChange={(e) => setExtraParams({ ...extraParams, columnA: e.target.value })}
                  >
                    <option value="">Select column</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </label>
                <label>
                  End date column:
                  <select
                    value={extraParams.columnB || ""}
                    onChange={(e) => setExtraParams({ ...extraParams, columnB: e.target.value })}
                  >
                    <option value="">Select column</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Unit:
                  <select
                    value={extraParams.unit || "days"}
                    onChange={(e) => setExtraParams({ ...extraParams, unit: e.target.value })}
                  >
                    <option value="days">Days</option>
                    <option value="hours">Hours</option>
                    <option value="minutes">Minutes</option>
                  </select>
                </label>
                <label>
                  New column name:
                  <input
                    type="text"
                    value={extraParams.newColumn ?? "date_diff"}
                    onChange={(e) => setExtraParams({ ...extraParams, newColumn: e.target.value })}
                  />
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  disabled={!extraParams.columnA || !extraParams.columnB || !extraParams.newColumn}
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === "dateDifference");
                    applyFunction(fn, null, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Currency / Percentage Format extra params */}
            {(columnPicker.funcKey === "currencyFormat" || columnPicker.funcKey === "percentageFormat") && columnPicker.selectedColumn && (
              <div className="extra-params">
                <p className="modal-hint">Formatting <strong>{columnPicker.selectedColumn}</strong></p>
                {columnPicker.funcKey === "currencyFormat" && (
                  <label>
                    Symbol:
                    <input
                      type="text"
                      value={extraParams.symbol ?? "$"}
                      onChange={(e) => setExtraParams({ ...extraParams, symbol: e.target.value })}
                    />
                  </label>
                )}
                {columnPicker.funcKey === "percentageFormat" && (
                  <label>
                    Decimals:
                    <input
                      type="number"
                      min="0"
                      value={extraParams.decimals ?? 1}
                      onChange={(e) => setExtraParams({ ...extraParams, decimals: e.target.value })}
                    />
                  </label>
                )}
                <label>
                  Output column (blank = same column):
                  <input
                    type="text"
                    value={extraParams.newColumn ?? ""}
                    onChange={(e) => setExtraParams({ ...extraParams, newColumn: e.target.value })}
                    placeholder={columnPicker.selectedColumn}
                  />
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === columnPicker.funcKey);
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Validation extra params (email, phone, outliers) */}
            {(columnPicker.funcKey === "emailValidityCheck" || columnPicker.funcKey === "phoneFormatCheck" || columnPicker.funcKey === "flagOutliers") && columnPicker.selectedColumn && (
              <div className="extra-params">
                <p className="modal-hint">Checking <strong>{columnPicker.selectedColumn}</strong></p>
                <label>
                  New column name:
                  <input
                    type="text"
                    value={extraParams.newColumn ?? `${columnPicker.selectedColumn}_${columnPicker.funcKey === "flagOutliers" ? "outlier" : "valid"}`}
                    onChange={(e) => setExtraParams({ ...extraParams, newColumn: e.target.value })}
                  />
                </label>
                {columnPicker.funcKey === "flagOutliers" && (
                  <label>
                    Std-dev threshold:
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={extraParams.stdDevThreshold ?? 2}
                      onChange={(e) => setExtraParams({ ...extraParams, stdDevThreshold: e.target.value })}
                    />
                  </label>
                )}
                <button
                  className="primary-btn modal-apply-btn"
                  disabled={!extraParams.newColumn}
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === columnPicker.funcKey);
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Truncate extra params */}
            {columnPicker.funcKey === "truncateText" && columnPicker.selectedColumn && (
              <div className="extra-params">
                <p className="modal-hint">Truncate <strong>{columnPicker.selectedColumn}</strong></p>
                <label>
                  Max length:
                  <input
                    type="number"
                    min="1"
                    value={extraParams.maxLength ?? 10}
                    onChange={(e) => setExtraParams({ ...extraParams, maxLength: e.target.value })}
                  />
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === "truncateText");
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Pad Left / Right extra params */}
            {(columnPicker.funcKey === "padLeft" || columnPicker.funcKey === "padRight") && columnPicker.selectedColumn && (
              <div className="extra-params">
                <p className="modal-hint">Pad <strong>{columnPicker.selectedColumn}</strong></p>
                <label>
                  Length:
                  <input
                    type="number"
                    min="1"
                    value={extraParams.length ?? 5}
                    onChange={(e) => setExtraParams({ ...extraParams, length: e.target.value })}
                  />
                </label>
                <label>
                  Pad character:
                  <input
                    type="text"
                    maxLength="1"
                    value={extraParams.padChar ?? (columnPicker.funcKey === "padLeft" ? "0" : " ")}
                    onChange={(e) => setExtraParams({ ...extraParams, padChar: e.target.value })}
                  />
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === columnPicker.funcKey);
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Extract Substring extra params */}
            {columnPicker.funcKey === "extractSubstring" && columnPicker.selectedColumn && (
              <div className="extra-params">
                <p className="modal-hint">Extract from <strong>{columnPicker.selectedColumn}</strong></p>
                <label>
                  Start index:
                  <input
                    type="number"
                    min="0"
                    value={extraParams.start ?? 0}
                    onChange={(e) => setExtraParams({ ...extraParams, start: e.target.value })}
                  />
                </label>
                <label>
                  End index:
                  <input
                    type="number"
                    min="0"
                    value={extraParams.end ?? 10}
                    onChange={(e) => setExtraParams({ ...extraParams, end: e.target.value })}
                  />
                </label>
                <label>
                  New column name:
                  <input
                    type="text"
                    value={extraParams.newColumn ?? `${columnPicker.selectedColumn}_substring`}
                    onChange={(e) => setExtraParams({ ...extraParams, newColumn: e.target.value })}
                  />
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  disabled={extraParams.newColumn === ""}
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === "extractSubstring");
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Count Characters / Words extra params */}
            {(columnPicker.funcKey === "countCharacters" || columnPicker.funcKey === "countWords") && columnPicker.selectedColumn && (
              <div className="extra-params">
                <p className="modal-hint">Count from <strong>{columnPicker.selectedColumn}</strong></p>
                <label>
                  New column name:
                  <input
                    type="text"
                    value={extraParams.newColumn ?? `${columnPicker.selectedColumn}_${columnPicker.funcKey === "countCharacters" ? "char_count" : "word_count"}`}
                    onChange={(e) => setExtraParams({ ...extraParams, newColumn: e.target.value })}
                  />
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  disabled={!extraParams.newColumn}
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === columnPicker.funcKey);
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Contains / Starts / Ends extra params */}
            {(columnPicker.funcKey === "containsCheck" || columnPicker.funcKey === "startsWithCheck" || columnPicker.funcKey === "endsWithCheck") && columnPicker.selectedColumn && (
              <div className="extra-params">
                <p className="modal-hint">Check <strong>{columnPicker.selectedColumn}</strong></p>
                <label>
                  {columnPicker.funcKey === "containsCheck" ? "Substring:" : columnPicker.funcKey === "startsWithCheck" ? "Prefix:" : "Suffix:"}
                  <input
                    type="text"
                    value={extraParams.substring ?? extraParams.prefix ?? extraParams.suffix ?? ""}
                    onChange={(e) => {
                      const key = columnPicker.funcKey === "containsCheck" ? "substring" : columnPicker.funcKey === "startsWithCheck" ? "prefix" : "suffix";
                      setExtraParams({ ...extraParams, [key]: e.target.value });
                    }}
                  />
                </label>
                <label>
                  New column name:
                  <input
                    type="text"
                    value={extraParams.newColumn ?? `${columnPicker.selectedColumn}_${columnPicker.funcKey === "containsCheck" ? "contains" : columnPicker.funcKey === "startsWithCheck" ? "starts_with" : "ends_with"}`}
                    onChange={(e) => setExtraParams({ ...extraParams, newColumn: e.target.value })}
                  />
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  disabled={!extraParams.newColumn}
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === columnPicker.funcKey);
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            {/* Regex Extract / Replace extra params */}
            {(columnPicker.funcKey === "regexExtract" || columnPicker.funcKey === "regexReplace") && columnPicker.selectedColumn && (
              <div className="extra-params">
                <p className="modal-hint">Regex on <strong>{columnPicker.selectedColumn}</strong></p>
                <label>
                  Pattern:
                  <input
                    type="text"
                    value={extraParams.pattern ?? ".*"}
                    onChange={(e) => setExtraParams({ ...extraParams, pattern: e.target.value })}
                    placeholder="正则表达式"
                  />
                </label>
                <label>
                  Flags:
                  <input
                    type="text"
                    value={extraParams.flags ?? (columnPicker.funcKey === "regexReplace" ? "g" : "")}
                    onChange={(e) => setExtraParams({ ...extraParams, flags: e.target.value })}
                    placeholder="g, i, ..."
                  />
                </label>
                {columnPicker.funcKey === "regexReplace" && (
                  <label>
                    Replace with:
                    <input
                      type="text"
                      value={extraParams.replaceWith ?? ""}
                      onChange={(e) => setExtraParams({ ...extraParams, replaceWith: e.target.value })}
                    />
                  </label>
                )}
                <label>
                  New/output column name:
                  <input
                    type="text"
                    value={extraParams.newColumn ?? `${columnPicker.selectedColumn}_${columnPicker.funcKey === "regexExtract" ? "regex_extract" : "regex_replace"}`}
                    onChange={(e) => setExtraParams({ ...extraParams, newColumn: e.target.value })}
                  />
                </label>
                <button
                  className="primary-btn modal-apply-btn"
                  disabled={!extraParams.pattern || !extraParams.newColumn}
                  onClick={() => {
                    const fn = FUNCTIONS.find((f) => f.key === columnPicker.funcKey);
                    applyFunction(fn, columnPicker.selectedColumn, extraParams);
                  }}
                >
                  Apply
                </button>
              </div>
            )}

            <button className="modal-close" onClick={() => { setColumnPicker(null); setExtraParams({}); setMultiColumns([]); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ─── Math Operations Modal ─── */}
      {mathModal && (
        <div className="modal-overlay" onClick={() => { setMathModal(null); setExtraParams({}); setMultiColumns([]); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {mathModal.step === "pick" ? (
              <>
                <h3 className="modal-title">Math Operations</h3>
                <p className="modal-hint">Select an operation</p>
                <div className="column-grid">
                  {MATH_OPS.map((op) => (
                    <button
                      key={op.key}
                      className="column-chip"
                      onClick={() => {
                        setMathModal({ step: "config", mathOp: op.key, mathDef: op });
                        setMultiColumns([]);
                        setExtraParams({});
                      }}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <MathConfigStep
                mathDef={mathModal.mathDef}
                mathOp={mathModal.mathOp}
                columns={columns}
                data={data}
                multiColumns={multiColumns}
                setMultiColumns={setMultiColumns}
                extraParams={extraParams}
                setExtraParams={setExtraParams}
                onBack={() => { setMathModal({ step: "pick" }); setExtraParams({}); setMultiColumns([]); }}
                onApply={(extra) => {
                  const fn = FUNCTIONS.find((f) => f.key === "math");
                  applyFunction(fn, null, { ...extra, mathOp: mathModal.mathOp });
                  setMathModal(null);
                }}
              />
            )}
            <button className="modal-close" onClick={() => { setMathModal(null); setExtraParams({}); setMultiColumns([]); }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Math Config Step (column/param selection for chosen operation) ─── */
function MathConfigStep({ mathDef, mathOp, columns, data, multiColumns, setMultiColumns, extraParams, setExtraParams, onBack, onApply }) {
  const { type, paramLabel, paramDefault } = mathDef;
  const needsParam = type === "singleParam" || type === "singleNewColParam";
  const needsNewCol = ["singleNewCol", "singleNewColParam", "twoCol", "multiCol"].includes(type);
  const isTwoCol = type === "twoCol";
  const isMultiCol = type === "multiCol";

  return (
    <>
      <h3 className="modal-title">{mathDef.label}</h3>
      <button className="modal-back-btn" onClick={onBack} style={{ marginBottom: 12, cursor: "pointer", background: "none", border: "none", color: "var(--accent)", fontSize: 13 }}>
        &larr; Back to operations
      </button>

      {/* Single column picker */}
      {!isTwoCol && !isMultiCol && (
        <>
          <p className="modal-hint">Select a column</p>
          <div className="column-grid">
            {columns.map((col) => (
              <button key={col} className={`column-chip ${extraParams.column === col ? "selected" : ""}`}
                onClick={() => setExtraParams({ ...extraParams, column: col })}>
                {col}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Two-column picker */}
      {isTwoCol && (
        <>
          <p className="modal-hint">Select first column (A)</p>
          <div className="column-grid">
            {columns.map((col) => (
              <button key={col} className={`column-chip ${extraParams.columnA === col ? "selected" : ""}`}
                onClick={() => setExtraParams({ ...extraParams, columnA: col })}>
                {col}
              </button>
            ))}
          </div>
          <p className="modal-hint">Select second column (B)</p>
          <div className="column-grid">
            {columns.map((col) => (
              <button key={col} className={`column-chip ${extraParams.columnB === col ? "selected" : ""}`}
                onClick={() => setExtraParams({ ...extraParams, columnB: col })}>
                {col}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Multi-column picker */}
      {isMultiCol && (
        <>
          <p className="modal-hint">Select two or more columns</p>
          <div className="column-grid">
            {columns.map((col) => {
              const selected = multiColumns.includes(col);
              return (
                <button key={col} className={`column-chip ${selected ? "selected" : ""}`}
                  onClick={() => setMultiColumns((prev) => selected ? prev.filter((c) => c !== col) : [...prev, col])}>
                  {col}
                </button>
              );
            })}
          </div>
          {multiColumns.length >= 2 && (
            <div className="selected-columns-preview">
              <strong>Selected:</strong> {multiColumns.join(", ")}
            </div>
          )}
        </>
      )}

      {/* Extra params */}
      {needsParam && (
        <div className="extra-params">
          <label>
            {paramLabel}:
            <input type="number" value={extraParams.paramValue ?? paramDefault}
              onChange={(e) => setExtraParams({ ...extraParams, paramValue: e.target.value })} />
          </label>
        </div>
      )}

      {/* New column name */}
      {needsNewCol && (
        <div className="extra-params">
          <label>
            New column name:
            <input type="text" value={extraParams.newColumn ?? `${mathOp}_result`}
              onChange={(e) => setExtraParams({ ...extraParams, newColumn: e.target.value })}
              placeholder={`${mathOp}_result`} />
          </label>
        </div>
      )}

      {/* Apply button */}
      <button className="primary-btn modal-apply-btn"
        disabled={
          (!isTwoCol && !isMultiCol && !extraParams.column) ||
          (isTwoCol && (!extraParams.columnA || !extraParams.columnB)) ||
          (isMultiCol && multiColumns.length < 2)
        }
        onClick={() => {
          const extra = { ...extraParams };
          if (isMultiCol) extra.selectedColumns = multiColumns;
          onApply(extra);
        }}
      >
        Apply {mathDef.label}
      </button>
    </>
  );
}

/* ─── Excel File Component ─── */
function ExcelFile() {
  const { fileId } = useParams();
  const [file, setFile] = useState(null);
  const [activeSheet, setActiveSheet] = useState("");

  useEffect(() => {
    // Load file data directly from Neon
    fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get", fileId: Number(fileId) }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.file) {
          const f = { ...res.file, id: String(res.file.id) };
          setFile(f);
          setActiveSheet(f.sheetNames[0] || "");
        }
      })
      .catch(() => {});
  }, [fileId]);

  if (!file) {
    return (
      <div className="app-layout">
        <nav className="top-nav">
          <div className="nav-tabs">
            <Link to="/" className="nav-tab">Data Cleaner</Link>
            <span className="nav-tab active">Excel</span>
          </div>
        </nav>
        <main className="dashboard-main">
          <p className="empty-msg">File not found. <Link to="/">Go back</Link></p>
        </main>
      </div>
    );
  }

  return (
    <FileView
      file={file}
      fileType="excel"
      navLabel="Excel"
      sheetNames={file.sheetNames}
      activeSheet={activeSheet}
      onSheetChange={setActiveSheet}
    />
  );
}

export default ExcelFile;
