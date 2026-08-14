// [{ id, email, filepath, column, values, title, ..., type: "bar" }, { ..., type: "pie" }, ...]

import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// table name -> chart type tag
const tables = {
  bargraph: "bar",
  histogram: "histogram",
  piechart: "pie",
  scatterplot: "scatter",
  linegraph: "line",
  boxplot: "box",
  heatmap: "heatmap",
  stackedbar: "stackedBar",
  areachart: "area",
  bubblechart: "bubble",
  violinplot: "violin",
};

export async function getCharts(email, filepath) {
  if (!email) throw new Error("email is required");
  if (!filepath) throw new Error("filepath is required");

  const queries = Object.entries(tables).map(async ([table, type]) => {
    try {
      const result = await pool.query(
        `SELECT * FROM ${table} WHERE email = $1 AND filepath = $2`,
        [email, filepath]
      );

      return result.rows.map((row) => ({ ...row, type }));
    } catch (err) {
      console.error(`Error fetching from ${table}:`, err);
      return [];
    }
  });

  const results = await Promise.all(queries);

  return results.flat();
}