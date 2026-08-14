/**
 * Unified charts handler — consolidates all chart-generation endpoints
 * into a single serverless function to stay within Vercel's free-tier limit.
 *
 * POST /api/charts
 * Body: { chart: "bar"|"histogram"|..., sheet: [...], email, description, ...extraParams }
 */
import { barChart } from "../src/graphs/functions/bar_chart";
import { histogram } from "../src/graphs/functions/histogram";
import { pieChart } from "../src/graphs/functions/piechart";
import { scatterPlot } from "../src/graphs/functions/scatterplot";
import { lineGraph } from "../src/graphs/functions/linegraph";
import { boxPlot } from "../src/graphs/functions/boxplot";
import { heatmap } from "../src/graphs/functions/heatmap";
import { stackedBar } from "../src/graphs/functions/stacked";
import { areaChart } from "../src/graphs/functions/areachart";
import { bubbleChart } from "../src/graphs/functions/bubblechart";
import { violinPlot } from "../src/graphs/functions/violinplot";
import XLSX from "xlsx";

function toSheet(data) {
  return XLSX.utils.json_to_sheet(data);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { chart: bodyChart, sheet, ...rest } = req.body || {};

    // Determine chart type: from body, or from URL path (for Vercel rewrites)
    let chart = bodyChart;
    if (!chart) {
      const urlPath = (req.url || "").split("?")[0];
      const segments = urlPath.split("/").filter(Boolean);
      chart = segments[segments.length - 1];
    }

    if (!chart) return res.status(400).json({ error: "chart type is required" });
    if (!sheet) return res.status(400).json({ error: "sheet data is required" });

    const ws = toSheet(sheet);

    // Dispatch to the appropriate graph function file
    let result;
    switch (chart) {
      case "bar":
        result = await barChart(ws, rest.column, rest.email, rest.description);
        break;
      case "histogram":
        result = await histogram(ws, rest.column, rest.email, rest.description, rest.binCount);
        break;
      case "pie":
        result = await pieChart(ws, rest.column, rest.email, rest.description);
        break;
      case "scatter":
        result = await scatterPlot(ws, rest.xColumn, rest.yColumn, rest.email, rest.description);
        break;
      case "line":
        result = await lineGraph(ws, rest.xColumn, rest.yColumn, rest.email, rest.description);
        break;
      case "box":
        result = await boxPlot(ws, rest.categoryColumn, rest.valueColumn, rest.email, rest.description);
        break;
      case "heatmap":
        result = await heatmap(ws, rest.columns, rest.email, rest.description);
        break;
      case "stackedBar":
        result = await stackedBar(ws, rest.categoryColumn, rest.groupColumn, rest.email, rest.description);
        break;
      case "area":
        result = await areaChart(ws, rest.xColumn, rest.yColumn, rest.email, rest.description);
        break;
      case "bubble":
        result = await bubbleChart(ws, rest.xColumn, rest.yColumn, rest.sizeColumn, rest.email, rest.description);
        break;
      case "violin":
        result = await violinPlot(ws, rest.categoryColumn, rest.valueColumn, rest.email, rest.description, rest.binCount);
        break;
      default:
        return res.status(400).json({ error: `unknown chart type: ${chart}` });
    }

    res.status(200).json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}