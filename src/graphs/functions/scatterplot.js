import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../../../api/ai';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export async function scatterPlot(sheet, xColumn, yColumn, email, description) {

    //check for the data type of both columns

    const data = XLSX.utils.sheet_to_json(sheet);

    if (typeof data[0][xColumn] !== 'number' || typeof data[0][yColumn] !== 'number') {
        return "Both columns must be of number type, Please choose another column"
    }

    const points = data
        .filter(row => typeof row[xColumn] === 'number' && typeof row[yColumn] === 'number')
        .map(row => ({
            x: row[xColumn],
            y: row[yColumn]
        }));

    try {

        const prompt = `You are analyzing scatter plot data for a data visualization tool.

X column: "${xColumn}"
Y column: "${yColumn}"
Data points (JSON array of x, y): ${JSON.stringify(points)}

Based on this data, respond with ONLY a valid JSON object (no markdown, no backticks, no preamble) with exactly these fields:

{
  "title": "A short, descriptive chart title (max 8 words)",
  "x_axis": "Label for the x-axis",
  "y_axis": "Label for the y-axis",
  "description": "A 1-2 sentence plain-English insight about the relationship (e.g. positive/negative correlation, no clear pattern, clusters, outliers)"
}

Return only the JSON object, nothing else.`;

        const response = await AI(prompt);
        const rawText = response.content.map(c => c.text || "").join("");
        const clean = rawText.replace(/```json|```/g, "").trim();
        const chartMeta = JSON.parse(clean); // { title, x_axis, y_axis, description }

        const result = await pool.query(
            `INSERT INTO scatterplot (email, filepath, x_column, y_column, points, description, title, x_axis, y_axis)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [
                email,
                JSON.stringify(sheet),
                xColumn,
                yColumn,
                JSON.stringify(points),
                chartMeta.description || description,
                chartMeta.title,
                chartMeta.x_axis,
                chartMeta.y_axis
            ]
        );

        return { points, id: result.rows[0].id, ...chartMeta };
    } catch (err) {
        console.error('Error saving scatter plot to Neon:', err);
        return { points, error: 'Failed to save scatter plot results' };
    }
}