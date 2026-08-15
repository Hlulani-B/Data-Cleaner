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
        // Compute summary stats to feed into the prompt
        const counts = bins.map(b => b.count);
        const maxCount = Math.max(...counts);
        const minCount = Math.min(...counts);
        const peakBin = bins.find(b => b.count === maxCount);
        const edgeBins = [bins[0], bins[bins.length - 1]];
        const midStart = Math.floor(bins.length * 0.4);
        const midEnd = Math.ceil(bins.length * 0.6);
        const midBins = bins.slice(midStart, midEnd);
        const midAvg = midBins.reduce((s, b) => s + b.count, 0) / midBins.length;
        const edgeAvg = edgeBins.reduce((s, b) => s + b.count, 0) / edgeBins.length;
        const allCountsStr = bins.map(b => `  [${b.bin_start.toFixed(2)} – ${b.bin_end.toFixed(2)}]: ${b.count}`).join('\n');

        const prompt = `You are analyzing histogram data for a data visualization tool. You MUST reason from the actual numbers below — never from assumptions about what the data "usually" looks like.

Column charted: "${column}"

Raw bin counts and edges:
${allCountsStr}

Summary:
- Peak bin: [${peakBin.bin_start.toFixed(2)} – ${peakBin.bin_end.toFixed(2)}] with count ${maxCount}
- Edge bins average count: ${edgeAvg.toFixed(1)} (first bin: ${bins[0].count}, last bin: ${bins[bins.length - 1].count})
- Middle bins average count: ${midAvg.toFixed(1)}
- Min count across all bins: ${minCount}, Max count: ${maxCount}
- Spread ratio (max/min): ${minCount > 0 ? (maxCount / minCount).toFixed(2) : 'N/A (min is 0)'}

CRITICAL INSTRUCTIONS — follow these before writing your description:

1. COMPARE BIN COUNTS NUMERICALLY: Before describing the shape, explicitly compare the first 2 bins, middle 2 bins, and last 2 bins by their actual counts. State the numbers.

2. SHAPE CLASSIFICATION RULES:
   - Call it "normal" or "bell-shaped" ONLY if the middle bins are clearly higher than BOTH edges (middle average at least 25% higher than edge average). If bin counts are within ~20% of each other across all bins, describe it as "approximately uniform" or "flat" — NOT normal.
   - Call it "right-skewed" ONLY if the left-side bins have meaningfully higher counts than the right-side bins.
   - Call it "left-skewed" ONLY if the right-side bins have meaningfully higher counts than the left-side bins.
   - Call it "bimodal" ONLY if there are two distinct peaks (local maxima) separated by a dip.

3. IDENTIFY THE ACTUAL PEAK: State which bin has the highest count. Do NOT assume the peak is in the middle — check the numbers.

4. NO UNFOUNDED CENTRAL TENDENCY: Do NOT state a "central tendency" range unless the bins in that range have counts that are meaningfully higher (>25% more) than the rest. If counts are roughly similar across bins, say so instead of inventing a center.

5. CITE SPECIFIC NUMBERS: Reference specific bin ranges and their counts in your description (e.g., "the bin from 60000 to 67000 had the highest count at 92, while the first bin had only 68").

6. SELF-CHECK: Before finalizing, re-read the bin counts above and verify your shape description (normal/skewed/uniform/bimodal) is actually consistent with those numbers. If your description says "concentrated in the center" but the edge bins have similar counts to the middle, rewrite it.

Respond with ONLY a valid JSON object (no markdown, no backticks, no preamble) with exactly these fields:

{
  "title": "A short, descriptive chart title (max 8 words)",
  "x_axis": "Label for the x-axis",
  "y_axis": "Label for the y-axis (usually 'Count' or 'Frequency')",
  "description": "A detailed, data-driven analysis citing specific bin counts and ranges."
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
