import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../../../api/ai.js';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

function pearsonCorrelation(x, y) {
    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
        num += (x[i] - meanX) * (y[i] - meanY);
        denX += (x[i] - meanX) ** 2;
        denY += (y[i] - meanY) ** 2;
    }
    return num / Math.sqrt(denX * denY);
}

export async function heatmap(sheet, columns, email, description) {

    const data = XLSX.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
        return "No data available to generate chart";
    }

    // Check majority type instead of just first row
    const sampleSize = Math.min(data.length, 100);
    for (const col of columns) {
        let numCount = 0;
        for (let i = 0; i < sampleSize; i++) {
            if (typeof data[i][col] === 'number') numCount++;
        }
        if (numCount < sampleSize * 0.5) {
            return `Column "${col}" is not of number type, Please choose numeric columns only`
        }
    }

    const columnData = {};
    columns.forEach(col => {
        columnData[col] = data.map(row => row[col]).filter(v => typeof v === 'number' && !isNaN(v));
    });

    const matrix = [];
    columns.forEach(colA => {
        columns.forEach(colB => {
            matrix.push({
                x: colA,
                y: colB,
                value: colA === colB ? 1 : pearsonCorrelation(columnData[colA], columnData[colB])
            });
        });
    });

    let chartMeta = {
        title: "Correlation Heatmap",
        x_axis: "Columns",
        y_axis: "Columns",
        description: description || "Heatmap showing Pearson correlations between numeric columns"
    };

    // AI enhancement (non-fatal)
    try {
        const prompt = `You are analyzing a correlation heatmap for a data visualization tool.

Columns compared: ${JSON.stringify(columns)}
Correlation matrix (JSON array of x, y, value where value is -1 to 1): ${JSON.stringify(matrix)}

Respond with ONLY a valid JSON object (no markdown, no backticks, no preamble):

{
  "title": "A short, descriptive chart title (max 8 words)",
  "x_axis": "Label for the x-axis",
  "y_axis": "Label for the y-axis",
  "description": "A 1-2 sentence plain-English insight (e.g. strongest correlated pair, any negative correlations)"
}

Return only the JSON object, nothing else.`;

        const response = await AI(prompt);
        if (response) {
            const clean = response.replace(/```json|```/g, "").trim();
            chartMeta = JSON.parse(clean);
        }
    } catch (err) {
        console.error('AI error for heatmap (continuing):', err.message);
    }

    // Save to DB (always, even if AI failed)
    try {
        await pool.query(
            `INSERT INTO heatmap (email, filepath, columns, matrix, description, title, x_axis, y_axis)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [email, JSON.stringify(sheet), JSON.stringify(columns), JSON.stringify(matrix), chartMeta.description || description, chartMeta.title, chartMeta.x_axis, chartMeta.y_axis]
        );
    } catch (err) {
        console.error('DB error saving heatmap:', err.message);
    }

    return { matrix, rows: data.length, ...chartMeta };
}
