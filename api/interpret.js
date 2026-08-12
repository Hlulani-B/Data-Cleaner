import { AI } from "./ai.js";

const FUNCTION_CATALOG = [
  { key: "removeEmpty", label: "Remove Empty Rows" },
  { key: "duplicates", label: "Remove Duplicates" },
  { key: "search", label: "Search Rows" },
  { key: "sampleRows", label: "Sample Rows" },
  { key: "reorderColumns", label: "Reorder Columns" },
  { key: "filterRows", label: "Filter Rows" },
  { key: "sortRows", label: "Sort Rows" },
  { key: "removeColumn", label: "Remove Column" },
  { key: "renameColumn", label: "Rename Column" },
  { key: "duplicateColumn", label: "Duplicate Column" },
  { key: "typeConversion", label: "Type Conversion" },
  { key: "labelEncode", label: "Label Encode" },
  { key: "oneHotEncode", label: "One-Hot Encode" },
  { key: "lower", label: "Lowercase" },
  { key: "upper", label: "Uppercase" },
  { key: "proper", label: "Proper Case" },
  { key: "sentenceCase", label: "Sentence Case" },
  { key: "removeSpecialCharacters", label: "Remove Special Chars" },
  { key: "removeNumbers", label: "Remove Numbers" },
  { key: "collapseWhitespace", label: "Collapse Whitespace" },
  { key: "reverseText", label: "Reverse Text" },
  { key: "replaceValues", label: "Replace Value" },
  { key: "rewrite", label: "Rewrite (Substring)" },
  { key: "replace", label: "Replace Text" },
  { key: "separate", label: "Separate Column" },
  { key: "truncateText", label: "Truncate" },
  { key: "padLeft", label: "Pad Left" },
  { key: "padRight", label: "Pad Right" },
  { key: "extractSubstring", label: "Extract Substring" },
  { key: "countCharacters", label: "Count Characters" },
  { key: "countWords", label: "Count Words" },
  { key: "containsCheck", label: "Contains" },
  { key: "startsWithCheck", label: "Starts With" },
  { key: "endsWithCheck", label: "Ends With" },
  { key: "regexExtract", label: "Regex Extract" },
  { key: "regexReplace", label: "Regex Replace" },
  { key: "join", label: "Join Columns" },
  { key: "concatenate", label: "Concatenate Columns" },
  { key: "math", label: "Math Operations" },
  { key: "absolute", label: "Absolute Value" },
  { key: "dateStandard", label: "Date Standardize" },
  { key: "extractYear", label: "Extract Year" },
  { key: "extractMonth", label: "Extract Month" },
  { key: "extractDay", label: "Extract Day" },
  { key: "extractDayOfWeek", label: "Extract Weekday" },
  { key: "addDays", label: "Add Days" },
  { key: "ageFromBirthdate", label: "Age from Date" },
  { key: "isWeekend", label: "Is Weekend" },
  { key: "dateDifference", label: "Date Difference" },
  { key: "currencyFormat", label: "Currency Format" },
  { key: "percentageFormat", label: "Percentage Format" },
  { key: "emailValidityCheck", label: "Email Valid" },
  { key: "phoneFormatCheck", label: "Phone Valid" },
  { key: "flagOutliers", label: "Flag Outliers" },
  { key: "getValues", label: "Get Unique Values" },
  { key: "removeRowWithValue", label: "Remove Row by Value" },
  { key: "fillEmpty", label: "Fill Empty Values" },
];

function buildPrompt(query) {
  const catalogLines = FUNCTION_CATALOG
    .map((fn) => `- ${fn.key}: ${fn.label}`)
    .join("\n");

  return (
    "You are a helpful data-cleaning assistant. Given the following functions:\n\n" +
    catalogLines +
    "\n\nThe user typed: \"" +
    query.replace(/"/g, "'") +
    "\"\n\n" +
    "Return a JSON object with a single field 'keys' containing an array of the function keys " +
    "that best match the user's intent, ordered from most relevant to least relevant. " +
    "Only include keys from the list above. If nothing matches, return {\"keys\": []}. " +
    "Respond with valid JSON only, no explanation."
  );
}

function safeParseJson(text) {
  try {
    const cleaned = text.replace(/```json\s?/gi, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { query } = req.body || {};
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "query is required" });
  }

  try {
    const prompt = buildPrompt(query);
    const aiResponse = await AI(prompt);

    if (!aiResponse) {
      return res.status(200).json({ keys: [], source: "ai_unavailable" });
    }

    const parsed = safeParseJson(aiResponse);
    if (!parsed || !Array.isArray(parsed.keys)) {
      return res.status(200).json({ keys: [], source: "ai_parse_failed" });
    }

    const validKeys = parsed.keys.filter((key) =>
      FUNCTION_CATALOG.some((fn) => fn.key === key)
    );

    return res.status(200).json({ keys: validKeys, source: "ai" });
  } catch (err) {
    console.error("Interpret error:", err);
    return res.status(500).json({ error: err.message || "Interpretation failed" });
  }
}
