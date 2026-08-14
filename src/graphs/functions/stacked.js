import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../../../api/ai';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export async function stackedBar(sheet, categoryColumn, groupColumn, email, description) {

    const data = XLSX.utils.sheet_to_json(sheet);

    if (typeof data[0][categoryColumn] !== 'string' || typeof data[0][groupColumn] !== 'string') {
        return "Both columns must be of string type, Please choose another column"
    }

    const grouped = {};

    data.map((row) => {
        const cat = row[categoryColumn];
        const group = row[groupColumn];
        if (!(cat in grouped)) grouped[cat] = {};
        if (!(group in grouped[cat])) grouped[cat][group] = 0;
        grouped[cat][group]++;
    });

    //recharts wants one object per category, with each group as a key
    const bars = Object.entries(grouped).map(([category, groups]) => ({
        name: category,
        ...groups
    }));

    try {
        const prompt = `You are analyzing stacked bar chart data for a data visualization tool.

Category column: "${categoryColumn}"
Group column: "${groupColumn}"
Data (JSON array, one object per category with group counts as keys): ${JSON.stringify(bars)}

Respond with ONLY a valid JSON object (no markdown, no backticks, no preamble):

{
  "title": "A short, descriptive chart title (max 8 words)",
  "x_axis": "Label for the x-axis",
  "y_axis": "Label for the y-axis",
  "description": "A 1-2 sentence plain-English insight (e.g. which category/group dominates, notable imbalance)"
}

Return only the JSON object, nothing else.`;

        const response = await AI(prompt);
        const rawText = response.content.map(c => c.text || "").join("");
        const clean = rawText.replace(/```json|```/g, "").trim();
        const chartMeta = JSON.parse(clean);

        const result = await pool.query(
            `INSERT INTO stackedbar (email, filepath, category_column, group_column, bars, description, title, x_axis, y_axis)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [email, JSON.stringify(sheet), categoryColumn, groupColumn, JSON.stringify(bars), chartMeta.description || description, chartMeta.title, chartMeta.x_axis, chartMeta.y_axis]
        );

        return { bars, id: result.rows[0].id, ...chartMeta };
    } catch (err) {
        console.error('Error saving stacked bar to Neon:', err);
        return { bars, error: 'Failed to save stacked bar results' };
    }
}