import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../../../api/ai.js';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export async function bubbleChart(sheet, xColumn, yColumn, sizeColumn, email, description) {

    const data = XLSX.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
        return "No data available to generate chart";
    }

    if (typeof data[0][xColumn] !== 'number' || typeof data[0][yColumn] !== 'number' || typeof data[0][sizeColumn] !== 'number') {
        return "All three columns must be of number type, Please choose another column"
    }

    const points = data
        .filter(row => typeof row[xColumn] === 'number' && typeof row[yColumn] === 'number' && typeof row[sizeColumn] === 'number')
        .map(row => ({ x: row[xColumn], y: row[yColumn], z: row[sizeColumn] }));

    let chartMeta = {
        title: `${xColumn} vs ${yColumn} (size: ${sizeColumn})`,
        x_axis: xColumn,
        y_axis: yColumn,
        description: description || `Bubble chart comparing ${xColumn}, ${yColumn}, and ${sizeColumn}`
    };

    try {
        const prompt = `You are analyzing bubble chart data for a data visualization tool.

X column: "${xColumn}"
Y column: "${yColumn}"
Size column: "${sizeColumn}"
Data points (JSON array of x, y, z where z is bubble size): ${JSON.stringify(points)}

Respond with ONLY a valid JSON object (no markdown, no backticks, no preamble):

{
  "title": "A short, descriptive chart title (max 8 words)",
  "x_axis": "Label for the x-axis",
  "y_axis": "Label for the y-axis",
  "description": "A 1-2 sentence plain-English insight (e.g. largest bubbles, any clustering, relationship between x, y, and size)"
}

Return only the JSON object, nothing else.`;

        const response = await AI(prompt);
        if (response) {
            const clean = response.replace(/```json|```/g, "").trim();
            chartMeta = JSON.parse(clean);
        }

        await pool.query(
            `INSERT INTO bubblechart (email, filepath, x_column, y_column, size_column, points, description, title, x_axis, y_axis)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id`,
            [email, JSON.stringify(sheet), xColumn, yColumn, sizeColumn, JSON.stringify(points), chartMeta.description || description, chartMeta.title, chartMeta.x_axis, chartMeta.y_axis]
        );
    } catch (err) {
        console.error('AI/DB error for bubble chart (continuing with fallback):', err.message);
    }

    return { points, ...chartMeta };
}