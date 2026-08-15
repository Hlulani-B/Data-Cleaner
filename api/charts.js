/**
 * Unified charts handler — consolidates all chart-generation endpoints
 * into a single serverless function to stay within Vercel's free-tier limit.
 *
 * POST /api/charts
 * Body: { chart: "bar"|"histogram"|..., sheet: [...], email, description, ...extraParams }
 */
import { barChart } from "../src/graphs/functions/bar_chart.js";
import { histogram } from "../src/graphs/functions/histogram.js";
import { pieChart } from "../src/graphs/functions/piechart.js";
import { scatterPlot } from "../src/graphs/functions/scatterplot.js";
import { lineGraph } from "../src/graphs/functions/linegraph.js";
import { boxPlot } from "../src/graphs/functions/boxplot.js";
import { heatmap } from "../src/graphs/functions/heatmap.js";
import { stackedBar } from "../src/graphs/functions/stacked.js";
import { areaChart } from "../src/graphs/functions/areachart.js";
import { bubbleChart } from "../src/graphs/functions/bubblechart.js";
import { violinPlot } from "../src/graphs/functions/violinplot.js";
import XLSX from "xlsx";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function toSheet(data) {
  return XLSX.utils.json_to_sheet(data);
}

// chart type key -> DB table name
const TABLE_MAP = {
  bar: "bargraph",
  histogram: "histogram",
  pie: "piechart",
  scatter: "scatterplot",
  line: "linegraph",
  box: "boxplot",
  heatmap: "heatmap",
  stackedBar: "stackedbar",
  area: "areachart",
  bubble: "bubblechart",
  violin: "violinplot",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { chart: bodyChart, sheet, filePath, ...rest } = req.body || {};

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

    // Fix filepath in DB — chart functions store JSON.stringify(sheet) by mistake
    if (filePath && rest.email) {
      const table = TABLE_MAP[chart];
      if (table) {
        try {
          await pool.query(
            `UPDATE ${table} SET filepath = $1 WHERE email = $2 AND id = (SELECT MAX(id) FROM ${table} WHERE email = $2)`,
            [filePath, rest.email]
          );
        } catch (err) {
          console.error('Failed to fix filepath in DB:', err.message);
        }
      }
    }

    res.status(200).json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}