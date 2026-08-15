/**
 * Fetch saved charts from Neon Postgres.
 *
 * GET /api/fetchcharts?email=user@example.com&filepath=/path/to/file.xlsx
 *
 * Returns: { charts: [ { type, title, description, x_axis, y_axis, values|bins|points|boxes|matrix|bars|violins, ... }, ... ] }
 */
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

// JSON data field per table (the column that stores the chart data as a JSON string)
const dataField = {
  bargraph: "values",
  histogram: "bins",
  piechart: "values",
  scatterplot: "points",
  linegraph: "points",
  boxplot: "boxes",
  heatmap: "matrix",
  stackedbar: "bars",
  areachart: "points",
  bubblechart: "points",
  violinplot: "violins",
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, filepath } = req.query;

  if (!email) return res.status(400).json({ error: "email is required" });
  if (!filepath) return res.status(400).json({ error: "filepath is required" });

  try {
    const queries = Object.entries(tables).map(async ([table, type]) => {
      try {
        const result = await pool.query(
          `SELECT * FROM ${table} WHERE email = $1 AND filepath = $2 ORDER BY created_at DESC`,
          [email, filepath]
        );

        return result.rows.map((row) => {
          // Parse JSON data fields back into objects
          const jsonField = dataField[table];
          let parsedData = {};
          if (jsonField && row[jsonField]) {
            try {
              parsedData[jsonField] =
                typeof row[jsonField] === "string"
                  ? JSON.parse(row[jsonField])
                  : row[jsonField];
            } catch {
              parsedData[jsonField] = row[jsonField];
            }
          }

          return {
            type,
            title: row.title || "",
            description: row.description || "",
            x_axis: row.x_axis || "",
            y_axis: row.y_axis || "",
            rows: parsedData[jsonField]
              ? Array.isArray(parsedData[jsonField])
                ? parsedData[jsonField].length
                : typeof parsedData[jsonField] === "object"
                ? Object.keys(parsedData[jsonField]).length
                : 0
              : 0,
            ...parsedData,
            id: row.id,
            created_at: row.created_at,
          };
        });
      } catch (err) {
        console.error(`Error fetching from ${table}:`, err.message);
        return [];
      }
    });

    const results = await Promise.all(queries);
    const charts = results.flat();

    res.status(200).json({ charts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
