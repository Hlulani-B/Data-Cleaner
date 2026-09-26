import { buildChartScriptFiles, supportedLibraries } from "./src/utils/exports/chartScripts.js";
import { writeFileSync, mkdirSync } from "node:fs";

const RESULTS = {
  bar: { title: "Category Counts", x_axis: "Category", y_axis: "Count", values: { Apple: 4, Banana: 2, 'Cherry "red"': 7 } },
  histogram: { title: "Price Distribution", x_axis: "Price", y_axis: "Count", bins: [{ bin_start: 0, bin_end: 10, count: 3 }, { bin_start: 10, bin_end: 20, count: 5 }] },
  pie: { title: "Share", x_axis: "Slice", y_axis: "Value", values: { A: 1, B: 2 } },
  scatter: { title: "Correlation", x_axis: "X", y_axis: "Y", points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] },
  line: { title: "Trend", x_axis: "Date", y_axis: "Sales", points: [{ x: 1, y: 5 }, { x: 2, y: 9 }] },
  area: { title: "Volume", x_axis: "Hour", y_axis: "Load", points: [{ x: 1, y: 5 }, { x: 2, y: 9 }] },
  bubble: { title: "Sizes", x_axis: "X", y_axis: "Y", points: [{ x: 1, y: 2, z: 10 }, { x: 3, y: 4, z: 40 }] },
  stackedBar: { title: "Stacked", x_axis: "Category", y_axis: "Total", bars: [{ name: "Q1", Online: 3, Store: 5 }, { name: "Q2", Online: 7, Store: 2 }] },
  box: { title: "Spread", x_axis: "Group", y_axis: "Value", boxes: [{ category: "A", min: 1, q1: 2, median: 3, q3: 4, max: 5 }, { category: "B", min: 2, q1: 3, median: 4, q3: 5, max: 6 }] },
  heatmap: { title: "Correlations", x_axis: "X", y_axis: "Y", matrix: [{ x: "a", y: "a", value: 1 }, { x: "b", y: "a", value: -0.5 }, { x: "a", y: "b", value: -0.5 }, { x: "b", y: "b", value: 1 }] },
  violin: { title: "Density", x_axis: "Group", y_axis: "Value", violins: [{ category: "A", min: 0, max: 10, density: [{ bin_start: 0, bin_end: 5, count: 2 }, { bin_start: 5, bin_end: 10, count: 3 }] }, { category: "B", min: 0, max: 10, density: [{ bin_start: 0, bin_end: 5, count: 3 }, { bin_start: 5, bin_end: 10, count: 2 }] }] },
};

mkdirSync("_pydump", { recursive: true });
const index = [];
for (const [type, result] of Object.entries(RESULTS)) {
  for (const lib of supportedLibraries(type)) {
    const files = buildChartScriptFiles(type, result, [lib]);
    for (const f of files) {
      writeFileSync(`_pydump/${f.filename}`, f.content);
      index.push(f.filename);
    }
  }
}
console.log(index.join("\n"));
