/*
 * Python script exporter — returns runnable pandas / numpy scripts for the
 * selected columns. Nothing is executed here; the script text is what gets
 * downloaded so the user can continue the work in a notebook or pipeline.
 */

import {
  columnValues,
  inferPandasDtype,
  pickColumns,
  sanitizeFileName,
  toPythonString,
} from "./exportCommon";

const PY_MIME = "text/x-python;charset=utf-8";

/** ["price", "total"] -> "price_total" (used inside generated file names). */
export function columnsSlug(columns) {
  return columns.map((c) => sanitizeFileName(c)).join("_").slice(0, 60) || "columns";
}

/** Header comment block shared by every generated script. */
function scriptHeader(title, columns, rowCount, meta) {
  const lines = [`# ${title}`, `# Columns (${columns.length}): ${columns.join(", ")}`, `# Rows: ${rowCount}`];
  if (meta.sourceFile) lines.push(`# Source file: ${meta.sourceFile}`);
  if (meta.sheet) lines.push(`# Sheet: ${meta.sheet}`);
  lines.push(`# Generated: ${new Date().toISOString().slice(0, 10)}`);
  return lines.join("\n");
}

/** "# --- 2. Column types ------" padded to a consistent width. */
function section(number, title) {
  const label = `# --- ${number}. ${title} `;
  return label + "-".repeat(Math.max(3, 72 - label.length));
}

/** Embed the dataset as a JSON string literal parsed by Python's json module. */
function inlineDataLines(rows, columns) {
  const payload = JSON.stringify(pickColumns(rows, columns));
  return [`RECORDS = json.loads(${toPythonString(payload)})`, "data = RECORDS"];
}

/** Cast each column to the dtype inferred from the cleaned data. */
function dtypeLines(columns, rows) {
  const out = [];
  for (const col of columns) {
    const dtype = inferPandasDtype(columnValues(rows, col));
    const series = `df[${toPythonString(col)}]`;
    out.push(`# ${col}: ${dtype}`);
    if (dtype === "int64" || dtype === "float64") {
      out.push(`${series} = pd.to_numeric(${series}, errors="coerce")`);
      if (dtype === "int64") out.push(`${series} = ${series}.astype("Int64")`);
    } else if (dtype === "bool") {
      out.push(`${series} = ${series}.map({True: True, False: False, "True": True, "False": False})`);
    } else {
      out.push(`${series} = ${series}.astype("string")`);
    }
  }
  return out;
}

/**
 * Build one pandas script covering the given columns.
 *
 * @param {object[]} rows
 * @param {string[]} columns
 * @param {object}   options
 * @param {"inline"|"csv"|"json"} options.source  where the script reads its data
 * @param {boolean}  options.includeStats
 * @param {boolean}  options.writeCsv
 * @param {boolean}  options.writeJson
 * @param {string}   options.baseName
 * @param {string}   options.companion  file read when source is "csv"/"json"
 * @param {object}   options.meta  { sourceFile, sheet }
 */
export function buildPandasScript(rows, columns, options = {}) {
  const {
    source = "inline",
    includeStats = true,
    writeCsv = true,
    writeJson = true,
    baseName = "export",
    companion,
    meta = {},
  } = options;

  const allRows = rows || [];
  const cols = columns || [];
  const slug = columnsSlug(cols);
  const inputPath =
    companion || (source === "json" ? `${baseName}_combined.json` : `${baseName}_combined.csv`);
  const body = [];
  if (source !== "csv") body.push("import json", "");
  body.push("import numpy as np", "import pandas as pd", "");

  body.push(section(1, "Load the selected columns"));
  if (source === "inline") {
    body.push(`COLUMNS = ${JSON.stringify(cols)}`, ...inlineDataLines(allRows, cols));
    body.push("df = pd.DataFrame.from_records(data)", "df = df[COLUMNS]");
  } else if (source === "json") {
    body.push(
      `COLUMNS = ${JSON.stringify(cols)}`,
      `with open(${JSON.stringify(inputPath)}, "r", encoding="utf-8") as handle:`,
      "    data = json.load(handle)",
      "df = pd.DataFrame.from_dict(data)",
      "df = df[COLUMNS]",
    );
  } else {
    body.push(
      `COLUMNS = ${JSON.stringify(cols)}`,
      `df = pd.read_csv(${JSON.stringify(inputPath)})`,
      "df = df[COLUMNS]",
    );
  }

  body.push("", section(2, "Column types"));
  body.push('df = df.replace({"": np.nan})');
  body.push(...dtypeLines(cols, allRows));

  let step = 3;
  if (includeStats) {
    body.push("", section(step, "Quick summary"));
    body.push(
      "print(df.head())",
      "print()",
      "print(df.dtypes)",
      "print()",
      'print(df.describe(include="all"))',
      "print()",
      'print("missing per column:")',
      "print(df.isna().sum())",
    );
    step += 1;
  }

  const outputBase = `${baseName}_${slug}`;
  body.push("", section(step, "Write the outputs"));
  if (writeCsv) {
    body.push(`df.to_csv(${JSON.stringify(`${outputBase}_pandas_export.csv`)}, index=False)`);
  }
  if (writeJson) {
    body.push(
      `df.to_json(${JSON.stringify(`${outputBase}_pandas_export.json`)}, orient="records", indent=2)`,
    );
  }
  body.push(`print("wrote ${outputBase} exports")`);

  return `${scriptHeader("Pandas column export", cols, allRows.length, meta)}\n\n${body.join("\n")}\n`;
}

/**
 * Build one numpy script — the selected columns become arrays, not a DataFrame.
 */
export function buildNumpyScript(rows, columns, options = {}) {
  const { source = "inline", includeStats = true, baseName = "export", companion, meta = {} } = options;

  const allRows = rows || [];
  const cols = columns || [];
  const slug = columnsSlug(cols);
  const inputPath =
    companion || (source === "json" ? `${baseName}_combined.json` : `${baseName}_combined.csv`);
  const numericCols = cols.filter((col) => {
    const dtype = inferPandasDtype(columnValues(allRows, col));
    return dtype === "int64" || dtype === "float64";
  });

  const body = [];
  if (source === "csv") {
    body.push("import csv", "");
  } else {
    body.push("import json", "");
  }
  body.push("import numpy as np", "");
  body.push(section(1, "Load the selected columns"));
  body.push(`COLUMNS = ${JSON.stringify(cols)}`, `NUMERIC_COLUMNS = ${JSON.stringify(numericCols)}`);

  if (source === "inline") {
    body.push(...inlineDataLines(allRows, cols));
  } else if (source === "json") {
    body.push(
      `PATH = ${JSON.stringify(inputPath)}`,
      'with open(PATH, "r", encoding="utf-8") as handle:',
      "    raw = json.load(handle)",
      "# accept both {col: [values]} and [{col: value}] shapes",
      "if isinstance(raw, dict):",
      "    data = [dict(zip(raw.keys(), cells)) for cells in zip(*raw.values())]",
      "else:",
      "    data = raw",
    );
  } else {
    body.push(
      `PATH = ${JSON.stringify(inputPath)}`,
      'with open(PATH, "r", newline="", encoding="utf-8") as handle:',
      "    data = list(csv.DictReader(handle))",
    );
  }

  body.push(
    "",
    section(2, "Build the arrays"),
    "values = np.array([[rec.get(col) for col in COLUMNS] for rec in data], dtype=object)",
    "numeric = np.array(",
    "    [",
    "        [",
    '            np.nan if rec.get(col) in (None, "") else float(rec.get(col))',
    "            for col in NUMERIC_COLUMNS",
    "        ]",
    "        for rec in data",
    "    ],",
    "    dtype=float,",
    ")",
    "",
    `np.save(${JSON.stringify(`${baseName}_${slug}.npy`)}, values, allow_pickle=True)`,
  );

  if (includeStats) {
    body.push(
      "",
      section(3, "Summary"),
      'print("shape:", values.shape)',
      'print("columns:", COLUMNS)',
      "if numeric.size:",
      '    print("mean:", np.nanmean(numeric, axis=0))',
      '    print("std :", np.nanstd(numeric, axis=0))',
      '    print("min :", np.nanmin(numeric, axis=0))',
      '    print("max :", np.nanmax(numeric, axis=0))',
      '    print("nan cells:", int(np.isnan(numeric).sum()))',
      "    np.savetxt(",
      `        ${JSON.stringify(`${baseName}_${slug}_numeric.csv`)},`,
      "        numeric,",
      '        delimiter=",",',
      '        header=",".join(NUMERIC_COLUMNS),',
      '        comments="",',
      "    )",
    );
  }

  return `${scriptHeader("NumPy column export", cols, allRows.length, meta)}\n\n${body.join("\n")}\n`;
}

/**
 * Build the Python script download(s) for a column selection.
 *
 * @param {"pandas"|"numpy"} options.library
 * @param {boolean} options.combine  true -> one script for every selected column
 *                                   false -> one script per column
 */
export function buildPythonFiles(rows, columns, options = {}) {
  const { combine = true, library = "pandas", baseName = "export" } = options;
  const cols = columns || [];
  if (cols.length === 0) return [];

  const builder = library === "numpy" ? buildNumpyScript : buildPandasScript;
  const suffix = library === "numpy" ? "numpy" : "pandas";
  const stem = sanitizeFileName(baseName);

  if (combine) {
    return [
      {
        filename: `${stem}_${columnsSlug(cols)}_${suffix}.py`,
        content: builder(rows, cols, { ...options, baseName: stem }),
        mime: PY_MIME,
      },
    ];
  }

  return cols.map((col) => {
    const columnStem = `${stem}_${sanitizeFileName(col)}`;
    return {
      filename: `${columnStem}_${suffix}.py`,
      content: builder(rows, [col], {
        ...options,
        baseName: stem,
        companion: `${columnStem}.${options.source === "json" ? "json" : "csv"}`,
      }),
      mime: PY_MIME,
    };
  });
}
