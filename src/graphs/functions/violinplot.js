import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../../../api/ai.js';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export async function violinPlot(sheet, categoryColumn, valueColumn, email, description, binCount = 10) {

    const data = XLSX.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
        return "No data available to generate chart";
    }

    // Check majority type instead of just first row
    const sampleSize = Math.min(data.length, 100);
    let numCount = 0;
    for (let i = 0; i < sampleSize; i++) {
        if (typeof data[i][valueColumn] === 'number') numCount++;
    }
    if (numCount < sampleSize * 0.5) {
        return "Value column must be of number type, Please choose another column"
    }

    const groups = {};
    data.map((row) => {
        const cat = row[categoryColumn];
        const val = row[valueColumn];
        if (typeof val !== 'number') return;
        if (!(cat in groups)) groups[cat] = [];
        groups[cat].push(val);
    });

    const violins = Object.entries(groups).map(([category, vals]) => {
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        const binWidth = (max - min) / binCount || 1;

        const density = Array.from({ length: binCount }, (_, i) => ({
            bin_start: min + i * binWidth,
            bin_end: min + (i + 1) * binWidth,
            count: 0
        }));

        vals.map((v) => {
            let binIndex = Math.floor((v - min) / binWidth);
            if (binIndex === binCount) binIndex = binCount - 1;
            density[binIndex].count++;
        });

        return { category, min, max, density };
    });

    let chartMeta = {
        title: `${valueColumn} Distribution by ${categoryColumn}`,
        x_axis: categoryColumn,
        y_axis: valueColumn,
        description: description || `Violin plot showing density of ${valueColumn} across ${categoryColumn} groups`
    };

    // AI enhancement (non-fatal)
    try {
        const prompt = `You are analyzing violin plot data for a data visualization tool.

Category column: "${categoryColumn}"
Value column: "${valueColumn}"
Density per category (JSON array of category, min, max, density bins): ${JSON.stringify(violins)}

Respond with ONLY a valid JSON object (no markdown, no backticks, no preamble):

{
  "title": "A short, descriptive chart title (max 8 words)",
  "x_axis": "Label for the x-axis",
  "y_axis": "Label for the y-axis",
  "description": "A 1-2 sentence plain-English insight (e.g. which category is more spread out or concentrated)"
}

Return only the JSON object, nothing else.`;

        const response = await AI(prompt);
        if (response) {
            const clean = response.replace(/```json|```/g, "").trim();
            chartMeta = JSON.parse(clean);
        }
    } catch (err) {
        console.error('AI error for violin plot (continuing):', err.message);
    }

    // Save to DB (always, even if AI failed)
    try {
        await pool.query(
            `INSERT INTO violinplot (email, filepath, category_column, value_column, violins, description, title, x_axis, y_axis)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [email, JSON.stringify(sheet), categoryColumn, valueColumn, JSON.stringify(violins), chartMeta.description || description, chartMeta.title, chartMeta.x_axis, chartMeta.y_axis]
        );
    } catch (err) {
        console.error('DB error saving violin plot:', err.message);
    }

    return { violins, ...chartMeta };
}
