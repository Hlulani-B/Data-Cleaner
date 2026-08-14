import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../../../api/ai';

const pool = new Pool({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});


/**
 * 
 * bins=
  { "bin_start": 0, "bin_end": 10, "count": 5 },
  { "bin_start": 10, "bin_end": 20, "count": 12 }
]} sheet 
 * 
 */
export async function histogram(sheet, column, email, description, binCount = 10) {

    //check for the data type of the column

    const data = XLSX.utils.sheet_to_json(sheet);

    if (typeof data[0][column] !== 'number') {
        return "This column is not of number type, Please choose another column"
    }

    const numbers = data.map(row => row[column]).filter(val => typeof val === 'number');

    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const binWidth = (max - min) / binCount;

    const bins = Array.from({ length: binCount }, (_, i) => ({
        bin_start: min + i * binWidth,
        bin_end: min + (i + 1) * binWidth,
        count: 0
    }));

    numbers.map((value) => {
        let binIndex = Math.floor((value - min) / binWidth);
        //edge case: max value falls exactly on the last bin's upper edge
        if (binIndex === binCount) binIndex = binCount - 1;
        bins[binIndex].count++;
    });

    try {

        const prompt = `You are analyzing histogram data for a data visualization tool.

Column charted: "${column}"
Bins (JSON array of bin_start, bin_end, count): ${JSON.stringify(bins)}

Based on this data, respond with ONLY a valid JSON object (no markdown, no backticks, no preamble) with exactly these fields:

{
  "title": "A short, descriptive chart title (max 8 words)",
  "x_axis": "Label for the x-axis",
  "y_axis": "Label for the y-axis (usually 'Count' or 'Frequency')",
  "description": "A 1-2 sentence plain-English insight about the distribution shape (e.g. skew, concentration, outliers)"
}

Return only the JSON object, nothing else.`;

        const response = await AI(prompt);
        const rawText = response.content.map(c => c.text || "").join("");
        const clean = rawText.replace(/```json|```/g, "").trim();
        const chartMeta = JSON.parse(clean); // { title, x_axis, y_axis, description }

        const result = await pool.query(
            `INSERT INTO histogram (email, filepath, "column", bins, description, title, x_axis, y_axis)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [
                email,
                JSON.stringify(sheet),
                column,
                JSON.stringify(bins),
                chartMeta.description || description,
                chartMeta.title,
                chartMeta.x_axis,
                chartMeta.y_axis
            ]
        );

        return { bins, id: result.rows[0].id, ...chartMeta };
    } catch (err) {
        console.error('Error saving histogram to Neon:', err);
        return { bins, error: 'Failed to save histogram results' };
    }
}
