import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../../../api/ai.js';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

function quartile(sortedArr, q) {
    const pos = (sortedArr.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sortedArr[base + 1] !== undefined) {
        return sortedArr[base] + rest * (sortedArr[base + 1] - sortedArr[base]);
    }
    return sortedArr[base];
}

export async function boxPlot(sheet, categoryColumn, valueColumn, email, description) {

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

    const boxes = Object.entries(groups).map(([category, vals]) => {
        const sorted = [...vals].sort((a, b) => a - b);
        const q1 = quartile(sorted, 0.25);
        const median = quartile(sorted, 0.5);
        const q3 = quartile(sorted, 0.75);
        const iqr = q3 - q1;
        const min = Math.max(sorted[0], q1 - 1.5 * iqr);
        const max = Math.min(sorted[sorted.length - 1], q3 + 1.5 * iqr);
        const outliers = sorted.filter(v => v < min || v > max);

        return { category, min, q1, median, q3, max, outliers };
    });

    let chartMeta = {
        title: `${valueColumn} by ${categoryColumn}`,
        x_axis: categoryColumn,
        y_axis: valueColumn,
        description: description || `Box plot showing distribution of ${valueColumn} across ${categoryColumn} groups`
    };

    // AI enhancement (non-fatal)
    try {
        const prompt = `You are analyzing box plot data for a data visualization tool.

Category column: "${categoryColumn}"
Value column: "${valueColumn}"
Box plot stats per category (JSON array of category, min, q1, median, q3, max, outliers): ${JSON.stringify(boxes)}

Respond with ONLY a valid JSON object (no markdown, no backticks, no preamble):

{
  "title": "A short, descriptive chart title (max 8 words)",
  "x_axis": "Label for the x-axis",
  "y_axis": "Label for the y-axis",
  "description": "A detailed, comprehensive analysis of this box plot. Discuss the median values across categories, the spread (IQR) of each category, which categories have the widest and narrowest distributions, the presence and location of outliers, whether distributions are symmetric or skewed, how the quartiles compare between categories, and any notable differences in central tendency or variability. Be thorough and insightful."
}

Return only the JSON object, nothing else.`;

        const response = await AI(prompt);
        if (response) {
            const clean = response.replace(/```json|```/g, "").trim();
            chartMeta = JSON.parse(clean);
        }
    } catch (err) {
        console.error('AI error for box plot (continuing):', err.message);
    }

    // Save to DB (always, even if AI failed)
    try {
        await pool.query(
            `INSERT INTO boxplot (email, filepath, category_column, value_column, boxes, description, title, x_axis, y_axis)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [email, JSON.stringify(sheet), categoryColumn, valueColumn, JSON.stringify(boxes), chartMeta.description || description, chartMeta.title, chartMeta.x_axis, chartMeta.y_axis]
        );
    } catch (err) {
        console.error('DB error saving box plot:', err.message);
    }

    return { boxes, rows: data.length, ...chartMeta };
}
