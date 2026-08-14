import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../../../api/ai';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export async function lineGraph(sheet, xColumn, yColumn, email, description) {

    //check for the data type of the y column (numeric value being tracked)

    const data = XLSX.utils.sheet_to_json(sheet);

    if (typeof data[0][yColumn] !== 'number') {
        return "Y column must be of number type, Please choose another column"
    }

    const points = data
        .filter(row => row[xColumn] !== undefined && typeof row[yColumn] === 'number')
        .map(row => ({
            x: row[xColumn],
            y: row[yColumn]
        }))
        .sort((a, b) => (a.x > b.x ? 1 : a.x < b.x ? -1 : 0));

    try {

        const prompt = `You are analyzing line graph data for a data visualization tool.

X column: "${xColumn}"
Y column: "${yColumn}"
Data points, ordered (JSON array of x, y): ${JSON.stringify(points)}

Based on this data, respond with ONLY a valid JSON object (no markdown, no backticks, no preamble) with exactly these fields:

{
  "title": "A short, descriptive chart title (max 8 words)",
  "x_axis": "Label for the x-axis",
  "y_axis": "Label for the y-axis",
  "description": "A 1-2 sentence plain-English insight about the trend (e.g. rising, falling, flat, sudden spikes/drops)"
}

Return only the JSON object, nothing else.`;

        const response = await AI(prompt);
        const rawText = response.content.map(c => c.text || "").join("");
        const clean = rawText.replace(/```json|```/g, "").trim();
        const chartMeta = JSON.parse(clean); // { title, x_axis, y_axis, description }

        const result = await pool.query(
            `INSERT INTO linegraph (email, filepath, x_column, y_column, points, description, title, x_axis, y_axis)
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
        console.error('Error saving line graph to Neon:', err);
        return { points, error: 'Failed to save line graph results' };
    }
}