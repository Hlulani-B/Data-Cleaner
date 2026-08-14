import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../../../api/ai.js';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export async function areaChart(sheet, xColumn, yColumn, email, description) {

    const data = XLSX.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
        return "No data available to generate chart";
    }

    // Check majority type instead of just first row
    const sampleSize = Math.min(data.length, 100);
    let numCount = 0;
    for (let i = 0; i < sampleSize; i++) {
        if (typeof data[i][yColumn] === 'number') numCount++;
    }
    if (numCount < sampleSize * 0.5) {
        return "Y column must be of number type, Please choose another column"
    }

    const points = data
        .filter(row => row[xColumn] !== undefined && row[xColumn] !== null && typeof row[yColumn] === 'number' && !isNaN(row[yColumn]))
        .map(row => ({ x: row[xColumn], y: row[yColumn] }))
        .sort((a, b) => (a.x > b.x ? 1 : a.x < b.x ? -1 : 0));

    let chartMeta = {
        title: `${yColumn} over ${xColumn}`,
        x_axis: xColumn,
        y_axis: yColumn,
        description: description || `Area chart showing ${yColumn} across ${xColumn}`
    };

    try {
        const prompt = `You are analyzing area chart data for a data visualization tool.

X column: "${xColumn}"
Y column: "${yColumn}"
Data points, ordered (JSON array of x, y): ${JSON.stringify(points)}

Respond with ONLY a valid JSON object (no markdown, no backticks, no preamble):

{
  "title": "A short, descriptive chart title (max 8 words)",
  "x_axis": "Label for the x-axis",
  "y_axis": "Label for the y-axis",
  "description": "A 1-2 sentence plain-English insight about the trend or cumulative volume"
}

Return only the JSON object, nothing else.`;

        const response = await AI(prompt);
        if (response) {
            const clean = response.replace(/```json|```/g, "").trim();
            chartMeta = JSON.parse(clean);
        }

        await pool.query(
            `INSERT INTO areachart (email, filepath, x_column, y_column, points, description, title, x_axis, y_axis)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [email, JSON.stringify(sheet), xColumn, yColumn, JSON.stringify(points), chartMeta.description || description, chartMeta.title, chartMeta.x_axis, chartMeta.y_axis]
        );
    } catch (err) {
        console.error('AI/DB error for area chart (continuing with fallback):', err.message);
    }

    return { points, ...chartMeta };
}