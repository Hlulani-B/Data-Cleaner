import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../../../api/ai.js';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export async function pieChart(sheet, column, email, description) {

    const data = XLSX.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
        return "No data available to generate chart";
    }

    // Check majority type instead of just first row
    const sampleSize = Math.min(data.length, 100);
    let stringCount = 0;
    for (let i = 0; i < sampleSize; i++) {
        if (typeof data[i][column] === 'string') stringCount++;
    }
    if (stringCount < sampleSize * 0.5) {
        return "This column is not of string type, Please choose another column"
    }


    const values = {};

    data.forEach((row) => {
        const val = row[column];
        // Skip null/undefined/empty values
        if (val == null || val === '') return;
        const key = String(val);
        if (key in values) {
            values[key]++;
        } else {
            values[key] = 1;
        }
    });

    let chartMeta = {
        title: `${column} Breakdown`,
        x_axis: column,
        y_axis: "Count",
        description: description || `Pie chart showing proportion of each ${column} value`
    };

    // AI enhancement (non-fatal)
    try {
        const prompt = `You are analyzing pie chart data for a data visualization tool.

Column charted: "${column}"
Value counts (JSON object of category: count): ${JSON.stringify(values)}

Based on this data, respond with ONLY a valid JSON object (no markdown, no backticks, no preamble) with exactly these fields:

{
  "title": "A short, descriptive chart title (max 8 words)",
  "x_axis": "Label describing the categories (e.g. the column name)",
  "y_axis": "Label describing what the slice size represents (usually 'Count' or 'Proportion')",
  "description": "A 1-2 sentence plain-English insight about the split (e.g. dominant category, near-even split, one category is negligible)"
}

Return only the JSON object, nothing else.`;

        const response = await AI(prompt);
        if (response) {
            const clean = response.replace(/```json|```/g, "").trim();
            chartMeta = JSON.parse(clean);
        }

    } catch (err) {
        console.error('AI error for pie chart (continuing):', err.message);
    }

    // Save to DB (always, even if AI failed)
    try {
        await pool.query(
            `INSERT INTO piechart (email, filepath, "column", values, description, title, x_axis, y_axis)
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
        console.error('DB error saving pie chart:', err.message);
    }

    return { values, rows: data.length, ...chartMeta };
}