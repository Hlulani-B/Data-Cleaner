import XLSX from 'xlsx';
import { Pool } from 'pg';
import { AI } from '../../../api/ai.js';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

export async function stackedBar(sheet, categoryColumn, groupColumn, email, description) {

    const data = XLSX.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
        return "No data available to generate chart";
    }

    // Check majority type instead of just first row
    const sampleSize = Math.min(data.length, 100);
    let catStrCount = 0, grpStrCount = 0;
    for (let i = 0; i < sampleSize; i++) {
        if (typeof data[i][categoryColumn] === 'string') catStrCount++;
        if (typeof data[i][groupColumn] === 'string') grpStrCount++;
    }
    if (catStrCount < sampleSize * 0.5 || grpStrCount < sampleSize * 0.5) {
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

    let chartMeta = {
        title: `${categoryColumn} by ${groupColumn}`,
        x_axis: categoryColumn,
        y_axis: "Count",
        description: description || `Stacked bar chart showing ${groupColumn} breakdown within each ${categoryColumn}`
    };

    // AI enhancement (non-fatal)
    try {
        const prompt = `You are analyzing stacked bar chart data for a data visualization tool.

Category column: "${categoryColumn}"
Group column: "${groupColumn}"
Data (JSON array, one object per category with group counts as keys): ${JSON.stringify(bars)}

Respond with ONLY a valid JSON object (no code, no backticks, no preamble):

{
  "title": "A short, descriptive chart title (max 8 words)",
  "x_axis": "Label for the x-axis",
  "y_axis": "Label for the y-axis",
  "description": "A detailed, comprehensive analysis of this stacked bar chart. Discuss which category-group combinations dominate, the relative proportions within each category, whether the group distribution is consistent across categories or varies significantly, any categories that are heavily skewed toward one group, notable imbalances, and what the breakdown reveals about the relationship between the category and group variables. Be thorough and insightful."
}

Return only the JSON object, nothing else.`;

        const response = await AI(prompt);
        if (response) {
            const clean = response.replace(/```json|```/g, "").trim();
            chartMeta = JSON.parse(clean);
        }
    } catch (err) {
        console.error('AI error for stacked bar (continuing):', err.message);
    }

    // Save to DB (always, even if AI failed)
    try {
        await pool.query(
            `INSERT INTO stackedbar (email, filepath, category_column, group_column, bars, description, title, x_axis, y_axis)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [email, JSON.stringify(sheet), categoryColumn, groupColumn, JSON.stringify(bars), chartMeta.description || description, chartMeta.title, chartMeta.x_axis, chartMeta.y_axis]
        );
    } catch (err) {
        console.error('DB error saving stacked bar:', err.message);
    }

    return { bars, rows: data.length, ...chartMeta };
}
