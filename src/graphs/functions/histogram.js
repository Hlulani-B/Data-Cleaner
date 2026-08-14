import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../../../api/ai.js';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
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

    const data = XLSX.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
        return "No data available to generate chart";
    }

    // Check majority type instead of just first row
    const sampleSize = Math.min(data.length, 100);
    let numCount = 0;
    for (let i = 0; i < sampleSize; i++) {
        if (typeof data[i][column] === 'number') numCount++;
    }
    if (numCount < sampleSize * 0.5) {
        return "This column is not of number type, Please choose another column"
    }

    const numbers = data.map(row => row[column]).filter(val => typeof val === 'number' && !isNaN(val));

    if (numbers.length === 0) {
        return "No numeric values found in this column";
    }

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

    let chartMeta = {
        title: `${column} Distribution`,
        x_axis: column,
        y_axis: "Frequency",
        description: description || `Histogram showing distribution of ${column} values`
    };

    // AI enhancement (non-fatal)
    try {
        const prompt = `You are analyzing histogram data for a data visualization tool.

Column charted: "${column}"
Bins (JSON array of bin_start, bin_end, count): ${JSON.stringify(bins)}

Based on this data, respond with ONLY a valid JSON object (no markdown, no backticks, no preamble) with exactly these fields:

{
  "title": "A short, descriptive chart title (max 8 words)",
  "x_axis": "Label for the x-axis",
  "y_axis": "Label for the y-axis (usually 'Count' or 'Frequency')",
  "description": "A detailed, comprehensive analysis of this histogram's distribution. Discuss the shape (normal, skewed left/right, bimodal, uniform), where values concentrate, the spread and range, any gaps between bins, potential outliers in the tails, the central tendency, and what this distribution reveals about the underlying data. Be thorough and insightful."
}

Return only the JSON object, nothing else.`;

        const response = await AI(prompt);
        if (response) {
            const clean = response.replace(/```json|```/g, "").trim();
            chartMeta = JSON.parse(clean);
        }
    } catch (err) {
        console.error('AI error for histogram (continuing):', err.message);
    }

    // Save to DB (always, even if AI failed)
    try {
        await pool.query(
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
    } catch (err) {
        console.error('DB error saving histogram:', err.message);
    }

    return { bins, rows: data.length, ...chartMeta };
}
