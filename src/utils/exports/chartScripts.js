/*
 * Chart script exporter — builds standalone Python scripts that reproduce a
 * chart rendered in the visualiser using matplotlib / pandas / seaborn / plotly.
 * The chart data returned by the charts API is embedded inline as JSON, so each
 * downloaded .py file runs on its own without needing any extra input files.
 * Every selected library is produced as its own separate script.
 */

import { sanitizeFileName, toPythonString } from "./exportCommon";

const PY_MIME = "text/x-python;charset=utf-8";

/** Which libraries can faithfully reproduce each chart type. */
const LIBRARY_SUPPORT = {
  bar: ["matplotlib", "pandas", "seaborn", "plotly"],
  histogram: ["matplotlib", "pandas", "seaborn", "plotly"],
  pie: ["matplotlib", "pandas", "seaborn", "plotly"],
  scatter: ["matplotlib", "pandas", "seaborn", "plotly"],
  line: ["matplotlib", "pandas", "seaborn", "plotly"],
  area: ["matplotlib", "pandas", "seaborn", "plotly"],
  stackedBar: ["matplotlib", "pandas", "seaborn", "plotly"],
  bubble: ["matplotlib", "seaborn", "plotly"],
  box: ["matplotlib", "seaborn", "plotly"],
  heatmap: ["matplotlib", "seaborn", "plotly"],
  violin: ["matplotlib", "seaborn", "plotly"],
};

/** pip packages each generated script expects to be installed. */
const LIBRARY_PIP = {
  matplotlib: "matplotlib",
  pandas: "pandas matplotlib",
  seaborn: "seaborn matplotlib pandas",
  plotly: "plotly",
};

/** Chart types the UI should offer script downloads for. */
export function supportedLibraries(type) {
  return LIBRARY_SUPPORT[type] || [];
}

/* ─────────────────────────── data normalisation ─────────────────────────── */

/** Midpoint of a density/histogram bin, rounded to keep the payload small. */
function binMidpoint(bin) {
  return Math.round(((bin.bin_start + bin.bin_end) / 2) * 1000) / 1000;
}

/**
 * Convert the chart API result into the plain data structure each Python
 * script embeds. Returns { info, payload } or null for unknown chart types.
 */
function normalize(type, result) {
  const r = result || {};
  const info = {
    title: r.title || `${type} chart`,
    x: r.x_axis || "x",
    y: r.y_axis || "y",
  };

  switch (type) {
    case "bar":
    case "pie": {
      const entries = Object.entries(r.values || {});
      return {
        info,
        payload: {
          labels: entries.map(([label]) => label),
          values: entries.map(([, value]) => Number(value) || 0),
        },
      };
    }

    case "histogram": {
      const bins = (r.bins || []).map((b) => ({
        start: b.bin_start,
        end: b.bin_end,
        count: b.count,
      }));
      return {
        info,
        payload: {
          bins,
          bin_labels: bins.map((b) => `${b.start.toFixed(1)}–${b.end.toFixed(1)}`),
          counts: bins.map((b) => b.count),
        },
      };
    }

    case "scatter":
    case "line":
    case "area": {
      const pts = r.points || [];
      return {
        info,
        payload: { xs: pts.map((p) => p.x), ys: pts.map((p) => p.y) },
      };
    }

    case "bubble": {
      const pts = r.points || [];
      return {
        info,
        payload: {
          xs: pts.map((p) => p.x),
          ys: pts.map((p) => p.y),
          sizes: pts.map((p) => Number(p.z) || 0),
        },
      };
    }

    case "stackedBar": {
      const bars = r.bars || [];
      const names = Array.from(
        new Set(bars.flatMap((row) => Object.keys(row).filter((k) => k !== "name")))
      );
      const series = {};
      for (const name of names) {
        series[name] = bars.map((row) => Number(row[name]) || 0);
      }
      return {
        info,
        payload: { labels: bars.map((b) => b.name), names, series },
      };
    }

    case "box": {
      const boxes = (r.boxes || []).map((b) => ({
        category: b.category,
        min: b.min,
        q1: b.q1,
        median: b.median,
        q3: b.q3,
        max: b.max,
      }));
      return { info, payload: { boxes } };
    }

    case "heatmap": {
      const cells = r.matrix || [];
      const cols = Array.from(new Set(cells.map((c) => c.x)));
      const rows = Array.from(new Set(cells.map((c) => c.y)));
      const matrix = rows.map((row) =>
        cols.map((col) => {
          const hit = cells.find((c) => c.x === col && c.y === row);
          return hit ? hit.value : 0;
        })
      );
      return { info, payload: { rows, cols, matrix } };
    }

    case "violin": {
      const groups = (r.violins || []).map((v) => ({
        category: v.category,
        samples: (v.density || []).flatMap((d) => Array(d.count).fill(binMidpoint(d))),
      }));
      return { info, payload: { groups } };
    }

    default:
      return null;
  }
}

/* ───────────────────────────── script helpers ───────────────────────────── */

const pyStr = toPythonString;

/** "# title / # chart type ..." comment block shared by every script. */
function scriptHeader(info, type, library, filename) {
  return [
    `# ${info.title}`,
    `# Chart type : ${type}`,
    `# Library    : ${library}`,
    `# Generated from Data Cleaner on ${new Date().toISOString().slice(0, 10)}`,
    "#",
    `# Install dependencies:  pip install ${LIBRARY_PIP[library]}`,
    `# Run this script:       python ${filename}`,
    "",
    "",
  ].join("\n");
}

/** "DATA = json.loads("...")" line with the whole chart payload embedded. */
function dataLine(payload) {
  return `DATA = json.loads(${pyStr(JSON.stringify(payload))})`;
}

/** Shared save/show tail for the matplotlib-based scripts. */
function mplFinish(info, stem, { xlabel = true, ylabel = true, rotate = false } = {}) {
  const out = [`ax.set_title(${pyStr(info.title)})`];
  if (xlabel) out.push(`ax.set_xlabel(${pyStr(info.x)})`);
  if (ylabel) out.push(`ax.set_ylabel(${pyStr(info.y)})`);
  if (rotate) out.push('plt.xticks(rotation=45, ha="right")');
  out.push(
    "fig.tight_layout()",
    `fig.savefig(${pyStr(`${stem}.png`)}, dpi=200)`,
    "plt.show()"
  );
  return out;
}

/* ────────────────────────────── matplotlib ──────────────────────────────── */

function buildMatplotlibScript(payload, info, stem) {
  const start = ["import json", "", "import matplotlib.pyplot as plt", "", dataLine(payload), ""];
  const body = [];

  switch (payload.kind) {
    case "bar":
      body.push(
        "fig, ax = plt.subplots(figsize=(9, 5))",
        'ax.bar(DATA["labels"], DATA["values"], color="#A0917E")'
      );
      return assemble(start, body, mplFinish(info, stem, { rotate: true }));
    case "pie":
      body.push(
        "fig, ax = plt.subplots(figsize=(7, 7))",
        'ax.pie(DATA["values"], labels=DATA["labels"], autopct="%1.1f%%")'
      );
      return assemble(start, body, mplFinish(info, stem, { xlabel: false, ylabel: false }));
    case "histogram":
      body.push(
        "bins = DATA[\"bins\"]",
        'starts = [b["start"] for b in bins]',
        'counts = [b["count"] for b in bins]',
        'widths = [b["end"] - b["start"] for b in bins]',
        "",
        "fig, ax = plt.subplots(figsize=(9, 5))",
        'ax.bar(starts, counts, width=widths, align="edge", color="#A0917E", edgecolor="white")'
      );
      return assemble(start, body, mplFinish(info, stem));
    case "scatter":
      body.push(
        "fig, ax = plt.subplots(figsize=(9, 5))",
        'ax.scatter(DATA["xs"], DATA["ys"], color="#A0917E", alpha=0.7)'
      );
      return assemble(start, body, mplFinish(info, stem));
    case "bubble":
      body.push(
        'sizes = DATA["sizes"]',
        "lo, hi = min(sizes), max(sizes)",
        "scaled = [120 if hi == lo else 30 + 420 * (s - lo) / (hi - lo) for s in sizes]",
        "",
        "fig, ax = plt.subplots(figsize=(9, 5))",
        'ax.scatter(DATA["xs"], DATA["ys"], s=scaled, alpha=0.6, color="#A0917E")'
      );
      return assemble(start, body, mplFinish(info, stem));
    case "line":
      body.push(
        "fig, ax = plt.subplots(figsize=(9, 5))",
        'ax.plot(DATA["xs"], DATA["ys"], color="#6B5D4F", marker="o")'
      );
      return assemble(start, body, mplFinish(info, stem));
    case "area":
      body.push(
        "fig, ax = plt.subplots(figsize=(9, 5))",
        'ax.fill_between(DATA["xs"], DATA["ys"], color="#A0917E", alpha=0.35)',
        'ax.plot(DATA["xs"], DATA["ys"], color="#6B5D4F")'
      );
      return assemble(start, body, mplFinish(info, stem));
    case "stacked":
      body.push(
        "labels = DATA[\"labels\"]",
        'names = DATA["names"]',
        'palette = plt.get_cmap("tab10").colors',
        "",
        "fig, ax = plt.subplots(figsize=(9, 5))",
        "bottoms = [0] * len(labels)",
        "for i, name in enumerate(names):",
        "    series = DATA[\"series\"][name]",
        "    ax.bar(labels, series, bottom=bottoms, label=name, color=palette[i % len(palette)])",
        "    bottoms = [b + v for b, v in zip(bottoms, series)]",
        "ax.legend()"
      );
      return assemble(start, body, mplFinish(info, stem, { rotate: true }));
    case "box":
      body.push(
        "boxes = DATA[\"boxes\"]",
        "stats = [",
        "    {",
        '        "whislo": b["min"],',
        '        "q1": b["q1"],',
        '        "med": b["median"],',
        '        "q3": b["q3"],',
        '        "whishi": b["max"],',
        '        "fliers": [],',
        "    }",
        "    for b in boxes",
        "]",
        "",
        "fig, ax = plt.subplots(figsize=(9, 5))",
        "ax.boxplot(stats, patch_artist=True)",
        'ax.set_xticklabels([b["category"] for b in boxes])'
      );
      return assemble(start, body, mplFinish(info, stem));
    case "heatmap":
      body.push(
        'fig, ax = plt.subplots(figsize=(1 + 0.9 * len(DATA["cols"]), 5))',
        'im = ax.imshow(DATA["matrix"], cmap="coolwarm", aspect="auto")',
        'ax.set_xticks(range(len(DATA["cols"])))',
        'ax.set_xticklabels(DATA["cols"])',
        'ax.set_yticks(range(len(DATA["rows"])))',
        'ax.set_yticklabels(DATA["rows"])',
        'for i, row in enumerate(DATA["matrix"]):',
        "    for j, value in enumerate(row):",
        '        ax.text(j, i, f"{value:.2f}", ha="center", va="center", fontsize=8)',
        "fig.colorbar(im, ax=ax)"
      );
      return assemble(start, body, mplFinish(info, stem, { xlabel: false, ylabel: false }));
    case "violin":
      body.push(
        "groups = DATA[\"groups\"]",
        "fig, ax = plt.subplots(figsize=(9, 5))",
        'ax.violinplot([g["samples"] for g in groups], showmedians=True)',
        'ax.set_xticks(range(1, len(groups) + 1))',
        'ax.set_xticklabels([g["category"] for g in groups])'
      );
      return assemble(start, body, mplFinish(info, stem));
    default:
      throw new Error("Unsupported chart data for the matplotlib script");
  }
}

/* ──────────────────────────────── pandas ────────────────────────────────── */

function buildPandasScript(payload, info, stem) {
  const start = [
    "import json",
    "",
    "import matplotlib.pyplot as plt",
    "import pandas as pd",
    "",
    dataLine(payload),
    "",
  ];
  const body = [];

  switch (payload.kind) {
    case "bar":
    case "histogram": {
      const labelsKey = payload.kind === "bar" ? "labels" : "bin_labels";
      const valuesKey = payload.kind === "bar" ? "values" : "counts";
      body.push(
        `df = pd.DataFrame({"label": DATA["${labelsKey}"], "value": DATA["${valuesKey}"]})`,
        'ax = df.set_index("label").plot(kind="bar", legend=False, color="#A0917E", figsize=(9, 5))'
      );
      return assemble(start, body, pandasFinish(info, stem, { rotate: true }));
    }
    case "pie":
      body.push(
        'df = pd.DataFrame({"label": DATA["labels"], "value": DATA["values"]})',
        'ax = df.set_index("label").plot(kind="pie", y="value", labels=df.index, autopct="%1.1f%%", legend=False, figsize=(7, 7))'
      );
      return assemble(start, body, pandasFinish(info, stem, { axes: false }));
    case "scatter":
    case "line":
    case "area": {
      const kind = payload.kind === "line" ? "line" : payload.kind;
      body.push(
        'df = pd.DataFrame({"x": DATA["xs"], "y": DATA["ys"]})',
        kind === "scatter"
          ? 'ax = df.plot(kind="scatter", x="x", y="y", color="#A0917E", figsize=(9, 5))'
          : kind === "line"
            ? 'ax = df.plot(x="x", y="y", color="#6B5D4F", legend=False, figsize=(9, 5), marker="o")'
            : 'ax = df.set_index("x").plot(kind="area", legend=False, color="#A0917E", alpha=0.5, figsize=(9, 5))'
      );
      return assemble(start, body, pandasFinish(info, stem));
    }
    case "stacked":
      body.push(
        'df = pd.DataFrame(DATA["series"], index=DATA["labels"])',
        'ax = df.plot(kind="bar", stacked=True, figsize=(9, 5))'
      );
      return assemble(start, body, pandasFinish(info, stem, { rotate: true }));
    default:
      throw new Error("Unsupported chart data for the pandas script");
  }
}

function pandasFinish(info, stem, { axes = true, rotate = false } = {}) {
  const out = [`ax.set_title(${pyStr(info.title)})`];
  if (axes) {
    out.push(`ax.set_xlabel(${pyStr(info.x)})`, `ax.set_ylabel(${pyStr(info.y)})`);
  }
  if (rotate) out.push('plt.xticks(rotation=45, ha="right")');
  out.push(
    "fig = ax.figure",
    "fig.tight_layout()",
    `fig.savefig(${pyStr(`${stem}.png`)}, dpi=200)`,
    "plt.show()"
  );
  return out;
}

/* ──────────────────────────────── seaborn ───────────────────────────────── */

function buildSeabornScript(payload, info, stem) {
  const start = [
    "import json",
    "",
    "import matplotlib.pyplot as plt",
    "import pandas as pd",
    "import seaborn as sns",
    "",
    'sns.set_theme(style="whitegrid")',
    "",
    dataLine(payload),
    "",
  ];
  const body = [];

  switch (payload.kind) {
    case "bar":
      body.push(
        'df = pd.DataFrame({"label": DATA["labels"], "value": DATA["values"]})',
        "fig, ax = plt.subplots(figsize=(9, 5))",
        'sns.barplot(df, x="label", y="value", color="#A0917E", ax=ax)'
      );
      return assemble(start, body, snsFinish(info, stem, { rotate: true }));
    case "pie":
      body.push(
        "# seaborn has no pie chart — matplotlib's pie rendered with the seaborn theme",
        'fig, ax = plt.subplots(figsize=(7, 7))',
        'ax.pie(DATA["values"], labels=DATA["labels"], autopct="%1.1f%%")'
      );
      return assemble(start, body, snsFinish(info, stem, { axes: false }));
    case "histogram":
      body.push(
        "bins = DATA[\"bins\"]",
        "# seaborn wants raw samples — rebuild them from the bin midpoints",
        "samples = [",
        '    (b["start"] + b["end"]) / 2 for b in bins for _ in range(b["count"])',
        "]",
        'edges = [bins[0]["start"]] + [b["end"] for b in bins]',
        "",
        "fig, ax = plt.subplots(figsize=(9, 5))",
        'sns.histplot(samples, bins=edges, color="#A0917E", ax=ax)'
      );
      return assemble(start, body, snsFinish(info, stem));
    case "scatter":
      body.push(
        'df = pd.DataFrame({"x": DATA["xs"], "y": DATA["ys"]})',
        "fig, ax = plt.subplots(figsize=(9, 5))",
        'sns.scatterplot(df, x="x", y="y", color="#A0917E", ax=ax)'
      );
      return assemble(start, body, snsFinish(info, stem));
    case "bubble":
      body.push(
        'df = pd.DataFrame({"x": DATA["xs"], "y": DATA["ys"], "size": DATA["sizes"]})',
        "fig, ax = plt.subplots(figsize=(9, 5))",
        'sns.scatterplot(df, x="x", y="y", size="size", sizes=(40, 500), ax=ax)'
      );
      return assemble(start, body, snsFinish(info, stem));
    case "line":
      body.push(
        'df = pd.DataFrame({"x": DATA["xs"], "y": DATA["ys"]})',
        "fig, ax = plt.subplots(figsize=(9, 5))",
        'sns.lineplot(df, x="x", y="y", color="#6B5D4F", ax=ax)'
      );
      return assemble(start, body, snsFinish(info, stem));
    case "area":
      body.push(
        'df = pd.DataFrame({"x": DATA["xs"], "y": DATA["ys"]})',
        "fig, ax = plt.subplots(figsize=(9, 5))",
        'sns.lineplot(df, x="x", y="y", color="#6B5D4F", ax=ax)',
        'ax.fill_between(df["x"], df["y"], color="#A0917E", alpha=0.35)'
      );
      return assemble(start, body, snsFinish(info, stem));
    case "stacked":
      body.push(
        "# seaborn has no native stacked bar — matplotlib bars under the seaborn theme",
        'labels = DATA["labels"]',
        'names = DATA["names"]',
        'palette = sns.color_palette("muted")',
        "",
        "fig, ax = plt.subplots(figsize=(9, 5))",
        "bottoms = [0] * len(labels)",
        "for i, name in enumerate(names):",
        "    series = DATA[\"series\"][name]",
        "    ax.bar(labels, series, bottom=bottoms, label=name, color=palette[i % len(palette)])",
        "    bottoms = [b + v for b, v in zip(bottoms, series)]",
        "ax.legend(title=None)"
      );
      return assemble(start, body, snsFinish(info, stem, { rotate: true }));
    case "box":
      body.push(
        "# seaborn needs raw samples but the chart stored summary statistics —",
        "# draw the summaries with matplotlib's bxp under the seaborn theme instead.",
        "stats = [",
        "    {",
        '        "label": b["category"],',
        '        "valid": 1,',
        '        "whislo": b["min"],',
        '        "q1": b["q1"],',
        '        "med": b["median"],',
        '        "mean": b["median"],',
        '        "q3": b["q3"],',
        '        "whishi": b["max"],',
        '        "fliers": [],',
        "    }",
        '    for b in DATA["boxes"]',
        "]",
        "",
        "fig, ax = plt.subplots(figsize=(9, 5))",
        "ax.bxp(stats, patch_artist=True)"
      );
      return assemble(start, body, snsFinish(info, stem));
    case "heatmap":
      body.push(
        'df = pd.DataFrame(DATA["matrix"], index=DATA["rows"], columns=DATA["cols"])',
        'fig, ax = plt.subplots(figsize=(1 + 0.9 * len(df.columns), 5))',
        'sns.heatmap(df, annot=True, fmt=".2f", cmap="coolwarm", ax=ax)'
      );
      return assemble(start, body, snsFinish(info, stem, { axes: false }));
    case "violin":
      body.push(
        "# rebuild long-form samples from the density bins shipped by the API",
        "rows = [",
        '    (g["category"], v) for g in DATA["groups"] for v in g["samples"]',
        "]",
        'df = pd.DataFrame(rows, columns=["category", "value"])',
        "",
        "fig, ax = plt.subplots(figsize=(9, 5))",
        'sns.violinplot(df, x="category", y="value", ax=ax)'
      );
      return assemble(start, body, snsFinish(info, stem));
    default:
      throw new Error("Unsupported chart data for the seaborn script");
  }
}

function snsFinish(info, stem, { axes = true, rotate = false } = {}) {
  const out = [`ax.set_title(${pyStr(info.title)})`];
  if (axes) {
    out.push(`ax.set_xlabel(${pyStr(info.x)})`, `ax.set_ylabel(${pyStr(info.y)})`);
  }
  if (rotate) out.push('plt.xticks(rotation=45, ha="right")');
  out.push(
    "fig.tight_layout()",
    `fig.savefig(${pyStr(`${stem}.png`)}, dpi=200)`,
    "plt.show()"
  );
  return out;
}

/* ───────────────────────────────── plotly ───────────────────────────────── */

function buildPlotlyScript(payload, info, stem) {
  const start = ["import json", "", "import plotly.graph_objects as go", "", dataLine(payload), ""];
  const body = [];
  let layout = { template: "plotly_white" };

  switch (payload.kind) {
    case "bar":
      body.push(
        "fig = go.Figure()",
        'fig.add_trace(go.Bar(x=DATA["labels"], y=DATA["values"], marker_color="#A0917E"))'
      );
      break;
    case "pie":
      body.push(
        "fig = go.Figure()",
        'fig.add_trace(go.Pie(labels=DATA["labels"], values=DATA["values"]))'
      );
      layout = { ...layout, axes: false };
      break;
    case "histogram":
      body.push(
        "fig = go.Figure()",
        'fig.add_trace(go.Bar(x=DATA["bin_labels"], y=DATA["counts"], marker_color="#A0917E"))'
      );
      break;
    case "scatter":
      body.push(
        "fig = go.Figure()",
        'fig.add_trace(go.Scatter(x=DATA["xs"], y=DATA["ys"], mode="markers", marker=dict(color="#A0917E")))'
      );
      break;
    case "bubble":
      body.push(
        "fig = go.Figure()",
        "fig.add_trace(",
        '    go.Scatter(',
        '        x=DATA["xs"],',
        '        y=DATA["ys"],',
        '        mode="markers",',
        '        size=DATA["sizes"],',
        '        marker=dict(color="#A0917E", opacity=0.6),',
        "    )",
        ")"
      );
      break;
    case "line":
      body.push(
        "fig = go.Figure()",
        'fig.add_trace(go.Scatter(x=DATA["xs"], y=DATA["ys"], mode="lines+markers", line=dict(color="#6B5D4F")))'
      );
      break;
    case "area":
      body.push(
        "fig = go.Figure()",
        "fig.add_trace(",
        '    go.Scatter(',
        '        x=DATA["xs"],',
        '        y=DATA["ys"],',
        '        mode="lines",',
        '        fill="tozeroy",',
        '        line=dict(color="#6B5D4F"),',
        '        fillcolor="rgba(160, 145, 126, 0.35)",',
        "    )",
        ")"
      );
      break;
    case "stacked":
      body.push(
        "fig = go.Figure()",
        'for name in DATA["names"]:',
        '    fig.add_trace(go.Bar(x=DATA["labels"], y=DATA["series"][name], name=name))',
        'fig.update_layout(barmode="stack")'
      );
      break;
    case "box":
      body.push(
        "fig = go.Figure()",
        "# the API stores the five-number summary — plotly can draw boxes from it directly",
        "for b in DATA[\"boxes\"]:",
        "    fig.add_trace(",
        "        go.Box(",
        '            name=b["category"],',
        '            q1=[b["q1"]],',
        '            median=[b["median"]],',
        '            q3=[b["q3"]],',
        '            lowerfence=[b["min"]],',
        '            upperfence=[b["max"]],',
        "        )",
        "    )"
      );
      break;
    case "heatmap":
      body.push(
        "fig = go.Figure()",
        'fig.add_trace(go.Heatmap(z=DATA["matrix"], x=DATA["cols"], y=DATA["rows"], colorscale="RdBu", text_auto=".2f"))'
      );
      layout = { ...layout, axes: false };
      break;
    case "violin":
      body.push(
        "fig = go.Figure()",
        "# samples are rebuilt from the density bins returned by the API",
        'for g in DATA["groups"]:',
        '    fig.add_trace(go.Violin(y=g["samples"], name=g["category"], box_visible=True, meanline_visible=True))'
      );
      break;
    default:
      throw new Error("Unsupported chart data for the plotly script");
  }

  const finish = ["fig.update_layout("];
  finish.push(`    title=${pyStr(info.title)},`);
  if (!layout.axes) {
    finish.push('    template="plotly_white",');
  } else {
    finish.push(
      `    xaxis_title=${pyStr(info.x)},`,
      `    yaxis_title=${pyStr(info.y)},`,
      '    template="plotly_white",'
    );
  }
  finish.push(
    ")",
    `fig.write_html(${pyStr(`${stem}.html`)})`,
    "fig.show()",
    `print("saved ${stem}.html — export to PNG from the browser toolbar if needed")`
  );

  return assemble(start, body, finish);
}

/* ──────────────────────────────── assembly ──────────────────────────────── */

/** Join the start / body / finish line arrays into one Python source string. */
function assemble(start, body, finish) {
  return [...start, ...body, ...finish, ""].join("\n");
}

/**
 * Build one standalone Python script reproducing the chart with the given library.
 *
 * @param {string} type     chart type key used by the visualiser (bar, pie, ...)
 * @param {object} result   chart data returned by the charts API / saved in the DB
 * @param {"matplotlib"|"pandas"|"seaborn"|"plotly"} library
 */
export function buildChartScript(type, result, library) {
  const normalized = normalize(type, result);
  if (!normalized) throw new Error(`No Python script support for chart type "${type}"`);
  const builder = {
    matplotlib: buildMatplotlibScript,
    pandas: buildPandasScript,
    seaborn: buildSeabornScript,
    plotly: buildPlotlyScript,
  }[library];
  if (!builder) throw new Error(`Unknown chart script library "${library}"`);
  if (!(LIBRARY_SUPPORT[type] || []).includes(library)) {
    throw new Error(`The ${library} script cannot reproduce a ${type} chart`);
  }
  const stem = sanitizeFileName(result?.title || type).toLowerCase();
  const content = builder({ kind: kindFor(type), ...normalized.payload }, normalized.info, stem);
  return `#!/usr/bin/env python3\n${scriptHeader(normalized.info, type, library, `${stem}_${library}.py`)}${content}`;
}

/** Chart type key -> normalised payload kind. */
function kindFor(type) {
  return type === "stackedBar" ? "stacked" : type;
}

/**
 * Build the chart-script downloads — one separate .py file per library.
 * Libraries unsupported for the chart type are silently skipped.
 *
 * @param {string[]} libraries  defaults to every library supported for the type
 */
export function buildChartScriptFiles(type, result, libraries) {
  const stem = sanitizeFileName(result?.title || type).toLowerCase();
  const wanted = (libraries && libraries.length ? libraries : supportedLibraries(type))
    .filter((lib) => supportedLibraries(type).includes(lib));

  return wanted.map((library) => ({
    filename: `${stem}_${library}.py`,
    content: buildChartScript(type, result, library),
    mime: PY_MIME,
  }));
}
