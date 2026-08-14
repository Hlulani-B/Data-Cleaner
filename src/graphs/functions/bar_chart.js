import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../../../api/ai.js';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export async function barChart(sheet, column, email, description="") {

    const data = XLSX.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
        return "No data available to generate chart";
    }

    if (typeof data[0][column] !== 'string') {
        return "This column is not of string type, Please choose another column"
    }


    const values = {};

    data.map((row) => {
        //check if value exist
        if (row[column] in values) {
            values[row[column]]++;
        }else{
            values[row[column]]=1;
        }

    });

    let chartMeta = {
        title: `${column} Distribution`,
        x_axis: column,
        y_axis: "Count",
        description: description || `Bar chart showing frequency of each ${column} value`
    };

    try {
        const prompt = `You are analyzing bar chart data for a data visualization tool.

Column charted: "${column}"
Value counts (JSON object of category: count): ${JSON.stringify(values)}

Based on this data, respond with ONLY a valid JSON object (no markdown, no backticks, no preamble) with exactly these fields:

{
  "title": "A short, descriptive chart title (max 8 words)",
  "x_axis": "Label for the x-axis",
  "y_axis": "Label for the y-axis (usually 'Count' or 'Frequency')",
  "description": "A 1-2 sentence plain-English insight about what stands out in this data (e.g. most common category, imbalance, notable gaps)"
}

Return only the JSON object, nothing else.`;

        const response = await AI(prompt);
        if (response) {
            const clean = response.replace(/```json|```/g, "").trim();
            chartMeta = JSON.parse(clean);
        }

        await pool.query(
            `INSERT INTO bargraph (email, filepath, "column", values, description, title, x_axis, y_axis)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [
                email,
                JSON.stringify(sheet),
                column,
                JSON.stringify(values),
                chartMeta.description || description,
                chartMeta.title,
                chartMeta.x_axis,
                chartMeta.y_axis
            ]
        );
    } catch (err) {
        console.error('AI/DB error for bar chart (continuing with fallback):', err.message);
    }

    return { values, ...chartMeta };
}