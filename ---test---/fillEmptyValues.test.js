import { fillEmptyValues } from "../src/utils/cleaners";

describe("fillEmptyValues", () => {
  const data = [
    { name: "A", score: "10" },
    { name: "B", score: "" },
    { name: "C", score: "30" },
    { name: "D", score: null },
    { name: "E", score: "20" },
  ];

  test("fills empty cells with a custom value", () => {
    const result = fillEmptyValues(data, "score", "value", "N/A");
    expect(result).toEqual([
      { name: "A", score: "10" },
      { name: "B", score: "N/A" },
      { name: "C", score: "30" },
      { name: "D", score: "N/A" },
      { name: "E", score: "20" },
    ]);
  });

  test("fills empty cells with the mean of numeric values", () => {
    const result = fillEmptyValues(data, "score", "mean");
    // (10 + 30 + 20) / 3 = 20
    expect(result).toEqual([
      { name: "A", score: "10" },
      { name: "B", score: 20 },
      { name: "C", score: "30" },
      { name: "D", score: 20 },
      { name: "E", score: "20" },
    ]);
  });

  test("fills empty cells with the median of numeric values (odd count)", () => {
    const result = fillEmptyValues(data, "score", "median");
    // sorted: [10, 20, 30] -> median = 20
    expect(result).toEqual([
      { name: "A", score: "10" },
      { name: "B", score: 20 },
      { name: "C", score: "30" },
      { name: "D", score: 20 },
      { name: "E", score: "20" },
    ]);
  });

  test("fills empty cells with the median of numeric values (even count)", () => {
    const evenData = [
      { name: "A", score: "10" },
      { name: "B", score: "" },
      { name: "C", score: "30" },
      { name: "D", score: null },
      { name: "E", score: "20" },
      { name: "F", score: "40" },
    ];
    const result = fillEmptyValues(evenData, "score", "median");
    // sorted: [10, 20, 30, 40] -> median = (20 + 30) / 2 = 25
    expect(result).toEqual([
      { name: "A", score: "10" },
      { name: "B", score: 25 },
      { name: "C", score: "30" },
      { name: "D", score: 25 },
      { name: "E", score: "20" },
      { name: "F", score: "40" },
    ]);
  });

  test("falls back to custom value when no numeric values exist for mean", () => {
    const textData = [
      { name: "A", label: "" },
      { name: "B", label: null },
      { name: "C", label: "ok" },
    ];
    const result = fillEmptyValues(textData, "label", "mean", "unknown");
    expect(result).toEqual([
      { name: "A", label: "unknown" },
      { name: "B", label: "unknown" },
      { name: "C", label: "ok" },
    ]);
  });

  test("does not mutate original rows", () => {
    const original = JSON.parse(JSON.stringify(data));
    fillEmptyValues(data, "score", "value", "X");
    expect(data).toEqual(original);
  });

  test("returns empty array when data is empty", () => {
    expect(fillEmptyValues([], "score", "mean")).toEqual([]);
  });
});
