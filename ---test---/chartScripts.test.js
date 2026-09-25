import {
    buildChartScript,
    buildChartScriptFiles,
    supportedLibraries,
} from '../src/utils/exports/chartScripts';

// ── One sample result payload per chart type, shaped like the charts API returns ──
const RESULTS = {
    bar: {
        title: 'Category Counts', x_axis: 'Category', y_axis: 'Count',
        values: { Apple: 4, Banana: 2, 'Cherry "red"': 7 },
    },
    histogram: {
        title: 'Price Distribution', x_axis: 'Price', y_axis: 'Count',
        bins: [
            { bin_start: 0, bin_end: 10, count: 3 },
            { bin_start: 10, bin_end: 20, count: 5 },
        ],
    },
    pie: { title: 'Share', x_axis: 'Slice', y_axis: 'Value', values: { A: 1, B: 2 } },
    scatter: { title: 'Correlation', x_axis: 'X', y_axis: 'Y', points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] },
    line: { title: 'Trend', x_axis: 'Date', y_axis: 'Sales', points: [{ x: 1, y: 5 }, { x: 2, y: 9 }] },
    area: { title: 'Volume', x_axis: 'Hour', y_axis: 'Load', points: [{ x: 1, y: 5 }, { x: 2, y: 9 }] },
    bubble: { title: 'Sizes', x_axis: 'X', y_axis: 'Y', points: [{ x: 1, y: 2, z: 10 }, { x: 3, y: 4, z: 40 }] },
    stackedBar: {
        title: 'Stacked', x_axis: 'Category', y_axis: 'Total',
        bars: [{ name: 'Q1', Online: 3, Store: 5 }, { name: 'Q2', Online: 7, Store: 2 }],
    },
    box: {
        title: 'Spread', x_axis: 'Group', y_axis: 'Value',
        boxes: [{ category: 'A', min: 1, q1: 2, median: 3, q3: 4, max: 5 }],
    },
    heatmap: {
        title: 'Correlations',
        matrix: [
            { x: 'a', y: 'a', value: 1 }, { x: 'b', y: 'a', value: -0.5 },
            { x: 'a', y: 'b', value: -0.5 }, { x: 'b', y: 'b', value: 1 },
        ],
    },
    violin: {
        title: 'Density', x_axis: 'Group', y_axis: 'Value',
        violins: [{ category: 'A', min: 0, max: 10, density: [{ bin_start: 0, bin_end: 5, count: 2 }, { bin_start: 5, bin_end: 10, count: 1 }] }],
    },
};

const ALL_LIBRARIES = ['matplotlib', 'pandas', 'seaborn', 'plotly'];

// ── Raw sheet + column picks, shaped like the visualiser's chart params ──
const SHEET = [
    { Gender: 'F', Region: 'North', Price: 10, Qty: 2, Cost: 5 },
    { Gender: 'M', Region: 'South', Price: 20, Qty: 4, Cost: 15 },
    { Gender: 'F', Region: 'South', Price: 30, Qty: 6, Cost: 25 },
];
const PARAMS = {
    bar: { sheet: SHEET, column: 'Gender' },
    histogram: { sheet: SHEET, column: 'Price' },
    scatter: { sheet: SHEET, xColumn: 'Price', yColumn: 'Qty' },
    line: { sheet: SHEET, xColumn: 'Price', yColumn: 'Qty' },
    area: { sheet: SHEET, xColumn: 'Price', yColumn: 'Qty' },
    bubble: { sheet: SHEET, xColumn: 'Price', yColumn: 'Qty', sizeColumn: 'Cost' },
    box: { sheet: SHEET, categoryColumn: 'Gender', valueColumn: 'Price' },
    violin: { sheet: SHEET, categoryColumn: 'Region', valueColumn: 'Price' },
    stackedBar: { sheet: SHEET, categoryColumn: 'Gender', groupColumn: 'Region' },
    heatmap: { sheet: SHEET, columns: ['Price', 'Qty', 'Cost'] },
};

describe('supportedLibraries', () => {
    test('offers all four libraries for simple chart types', () => {
        for (const type of ['bar', 'histogram', 'pie', 'scatter', 'line', 'area', 'stackedBar']) {
            expect(supportedLibraries(type)).toEqual(ALL_LIBRARIES);
        }
    });

    test('omits pandas where it cannot reproduce the chart', () => {
        for (const type of ['bubble', 'box', 'heatmap', 'violin']) {
            expect(supportedLibraries(type)).not.toContain('pandas');
            expect(supportedLibraries(type)).toContain('plotly');
        }
    });

    test('returns empty list for unknown chart types', () => {
        expect(supportedLibraries('nope')).toEqual([]);
    });
});

describe('buildChartScript', () => {
    test.each(Object.keys(RESULTS))(
        'embeds data and a save call for every supported library of %s',
        (type) => {
            for (const library of supportedLibraries(type)) {
                const script = buildChartScript(type, RESULTS[type], library);

                expect(script).toContain('#!');
                expect(script).toContain(`# Library    : ${library}`);
                expect(script).toContain('DATA = json.loads(');
                expect(script).toMatch(/matplotlib|plotly/);
                if (library === 'plotly') {
                    expect(script).toContain('fig.write_html(');
                    expect(script).toContain('fig.show()');
                } else {
                    expect(script).toContain('fig.savefig(');
                    expect(script).toContain('plt.show()');
                }
            }
        }
    );

    test('generated python receives valid library imports per chart type', () => {
        const has = (type, library, ...needles) => {
            const script = buildChartScript(type, RESULTS[type], library);
            needles.forEach((n) => expect(script).toContain(n));
        };

        has('bar', 'matplotlib', 'import matplotlib.pyplot as plt', 'ax.bar(');
        has('pie', 'matplotlib', 'ax.pie(');
        has('histogram', 'matplotlib', 'align="edge"');
        has('box', 'matplotlib', 'ax.boxplot(');
        has('violin', 'matplotlib', 'ax.violinplot(');
        has('heatmap', 'matplotlib', 'ax.imshow(');
        has('bubble', 'matplotlib', 'scaled =');
        has('stackedBar', 'matplotlib', 'bottom=bottoms');

        has('bar', 'pandas', 'import pandas as pd', 'kind="bar"');
        has('pie', 'pandas', 'kind="pie"');
        has('histogram', 'pandas', 'DATA["bin_labels"]');
        has('scatter', 'pandas', 'kind="scatter"');
        has('stackedBar', 'pandas', 'stacked=True');

        has('bar', 'seaborn', 'import seaborn as sns', 'sns.barplot(');
        has('heatmap', 'seaborn', 'sns.heatmap(');
        has('violin', 'seaborn', 'sns.violinplot(');
        has('box', 'seaborn', 'ax.bxp(');
        has('histogram', 'seaborn', 'sns.histplot(');
        has('bubble', 'seaborn', 'size="size"');

        has('box', 'plotly', 'go.Box(', 'lowerfence=');
        has('heatmap', 'plotly', 'go.Heatmap(');
        has('violin', 'plotly', 'go.Violin(');
        has('area', 'plotly', 'fill="tozeroy"');
        has('stackedBar', 'plotly', 'barmode="stack"');
    });

    test('avoids invalid plotly properties that crash the generated scripts', () => {
        // go.Heatmap has no text_auto (that is a bar-only property) — use texttemplate
        const heatmap = buildChartScript('heatmap', RESULTS.heatmap, 'plotly');
        expect(heatmap).toContain('texttemplate="%{z:.2f}"');
        expect(heatmap).not.toContain('text_auto');

        // go.Scatter has no top-level size — it must live inside marker=dict(...)
        const bubble = buildChartScript('bubble', RESULTS.bubble, 'plotly');
        expect(bubble).not.toMatch(/^\s*size=/m);
        expect(bubble).toMatch(/marker=dict\([^)]*size=DATA\["sizes"\]/);
    });

    test('escapes tricky labels so the embedded JSON stays valid python', () => {
        const script = buildChartScript('bar', RESULTS.bar, 'matplotlib');
        // Python string literals are JSON string literals here — both parses must round-trip
        const match = script.match(/DATA = json\.loads\((".*")\)/m);
        expect(match).not.toBeNull();
        const payload = JSON.parse(match[1]);
        expect(JSON.parse(payload).labels).toEqual(['Apple', 'Banana', 'Cherry "red"']);
    });

    test('chart titles become safe output file names inside the scripts', () => {
        const script = buildChartScript(
            'bar',
            { title: 'Sales / 2026!!', x_axis: 'Month', y_axis: 'Revenue', values: { Jan: 1 } },
            'matplotlib'
        );
        expect(script).toContain('fig.savefig("sales_2026.png", dpi=200)');
    });

    test('throws for chart types and library combinations without scripts', () => {
        expect(() => buildChartScript('mystery', RESULTS.bar, 'matplotlib')).toThrow(/mystery/);
        expect(() => buildChartScript('heatmap', RESULTS.heatmap, 'pandas')).toThrow(/heatmap/);
        expect(() => buildChartScript('bar', RESULTS.bar, 'bokeh')).toThrow(/bokeh/);
    });
});

describe('buildChartScriptFiles', () => {
    test('produces one separate file per selected library', () => {
        const files = buildChartScriptFiles('bar', RESULTS.bar, ['matplotlib', 'plotly']);

        expect(files).toHaveLength(2);
        expect(files.map((f) => f.filename)).toEqual([
            'category_counts_matplotlib.py',
            'category_counts_plotly.py',
        ]);
        files.forEach((f) => {
            expect(f.mime).toContain('text/x-python');
            expect(f.content).toContain('#!');
        });
    });

    test('defaults to every supported library when none are given', () => {
        const files = buildChartScriptFiles('box', RESULTS.box);
        expect(files.map((f) => f.filename)).toEqual([
            'spread_matplotlib.py',
            'spread_seaborn.py',
            'spread_plotly.py',
        ]);
    });

    test('silently skips libraries that cannot render the chart type', () => {
        const files = buildChartScriptFiles('heatmap', RESULTS.heatmap, ['pandas', 'seaborn']);
        expect(files).toHaveLength(1);
        expect(files[0].filename).toBe('correlations_seaborn.py');
    });

    test('falls back to the chart type when the result has no title', () => {
        const files = buildChartScriptFiles('pie', { values: { A: 1 } }, ['plotly']);
        expect(files[0].filename).toBe('pie_plotly.py');
    });

    test('forwards the raw sheet to every script it builds', () => {
        const files = buildChartScriptFiles('bar', RESULTS.bar, ['matplotlib', 'plotly'], PARAMS.bar);
        expect(files).toHaveLength(2);
        files.forEach((f) => expect(f.content).toContain('RAW = json.loads('));
    });
});

describe('from-scratch scripts built from the raw sheet', () => {
    test('every library embeds raw data and recomputes value counts for bar', () => {
        for (const library of supportedLibraries('bar')) {
            const script = buildChartScript('bar', RESULTS.bar, library, PARAMS.bar);
            expect(script).toContain('RAW = json.loads(');
            expect(script).not.toContain('DATA = json.loads(');
            expect(script).toContain('df = pd.DataFrame(RAW)');
            expect(script).toContain('#     chart = df["Gender"]');
            expect(script).toContain('.value_counts()');
            expect(script).toContain('from scratch — raw column data embedded');
        }
    });

    test('histogram binning happens inside the script', () => {
        const mpl = buildChartScript('histogram', RESULTS.histogram, 'matplotlib', PARAMS.histogram);
        expect(mpl).toContain('values = pd.to_numeric(df["Price"], errors="coerce").dropna()');
        expect(mpl).toContain('ax.hist(values, bins=10');
        const plotly = buildChartScript('histogram', RESULTS.histogram, 'plotly', PARAMS.histogram);
        expect(plotly).toContain('nbinsx=10');
    });

    test('line and area scripts sort the raw rows by the x column', () => {
        const script = buildChartScript('line', RESULTS.line, 'seaborn', PARAMS.line);
        expect(script).toContain('sort_values("Price")');
        expect(script).toContain('sns.lineplot(plot');
    });

    test('box plots group the raw samples instead of embedding summary stats', () => {
        const mpl = buildChartScript('box', RESULTS.box, 'matplotlib', PARAMS.box);
        expect(mpl).toContain('.groupby("Gender")["Price"]');
        expect(mpl).toContain('ax.boxplot(groups)');
        expect(mpl).not.toContain('whislo');
        const sns = buildChartScript('box', RESULTS.box, 'seaborn', PARAMS.box);
        expect(sns).toContain('sns.boxplot(clean');
        const plotly = buildChartScript('box', RESULTS.box, 'plotly', PARAMS.box);
        expect(plotly).toContain('go.Box(y=samples, name=label)');
    });

    test('violin plots draw from the real per-category samples', () => {
        const sns = buildChartScript('violin', RESULTS.violin, 'seaborn', PARAMS.violin);
        expect(sns).toContain('sns.violinplot(clean');
        expect(sns).not.toContain('bin_start');
        expect(sns).not.toContain('rebuild');
    });

    test('heatmap recomputes the correlation matrix from raw columns', () => {
        const script = buildChartScript('heatmap', RESULTS.heatmap, 'seaborn', PARAMS.heatmap);
        expect(script).toContain('df[["Price", "Qty", "Cost"]]');
        expect(script).toContain('.corr()');
        expect(script).toContain('sns.heatmap(corr');
    });

    test('stacked bars recompute counts with pd.crosstab', () => {
        const script = buildChartScript('stackedBar', RESULTS.stackedBar, 'pandas', PARAMS.stackedBar);
        expect(script).toContain('ct = pd.crosstab(df["Gender"], df["Region"])');
        expect(script).toContain('stacked=True');
    });

    test('bubble marker size stays inside the plotly marker dict', () => {
        const script = buildChartScript('bubble', RESULTS.bubble, 'plotly', PARAMS.bubble);
        expect(script).toContain('size=plot["Cost"]');
        expect(script).toMatch(/marker=dict\([^)]*size=plot\[/);
    });

    test('raw payload round-trips through the embedded JSON string', () => {
        const script = buildChartScript('scatter', RESULTS.scatter, 'matplotlib', PARAMS.scatter);
        const match = script.match(/RAW = json\.loads\((".*")\)/m);
        expect(match).not.toBeNull();
        const data = JSON.parse(match[1]);
        expect(JSON.parse(data).Price).toEqual([10, 20, 30]);
        expect(JSON.parse(data).Qty).toEqual([2, 4, 6]);
    });

    test('falls back to embedded aggregates when no sheet is provided', () => {
        const script = buildChartScript('bar', RESULTS.bar, 'matplotlib');
        expect(script).toContain('DATA = json.loads(');
        expect(script).toContain('pre-aggregated chart data embedded');
    });

    test('from-scratch scripts advertise the pandas/numpy pip dependencies', () => {
        const script = buildChartScript('violin', RESULTS.violin, 'matplotlib', PARAMS.violin);
        expect(script).toContain('pip install matplotlib numpy pandas');
    });

    test('scripts without a usable column selection fall back to aggregates', () => {
        const script = buildChartScript('bar', RESULTS.bar, 'matplotlib', { sheet: SHEET });
        expect(script).toContain('DATA = json.loads(');
    });
});
