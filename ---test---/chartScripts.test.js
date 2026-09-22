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
});
