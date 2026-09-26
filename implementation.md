# Implementation Guide

A deep-dive into how Data Cleaner & Visualiser was built — the architectural decisions, data flows, and patterns that hold the system together.

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Authentication Flow](#authentication-flow)
3. [File Upload & Persistence](#file-upload--persistence)
4. [Data Cleaning Pipeline](#data-cleaning-pipeline)
5. [Serverless Function Consolidation](#serverless-function-consolidation)
6. [Chart Generation & AI Enhancement](#chart-generation--ai-enhancement)
7. [Multi-Provider AI Orchestration](#multi-provider-ai-orchestration)
8. [Natural-Language Function Search](#natural-language-function-search)
9. [Notes Slideover](#notes-slideover)
10. [Export System](#export-system)
11. [Dev Server](#dev-server)
12. [Database Design](#database-design)
13. [Frontend Routing & State](#frontend-routing--state)

---

## High-Level Architecture

The application is a full-stack SPA split across three runtime environments:

```
┌─────────────────────────────────────────────────────────┐
│  Browser (React 19 + Vite 8)                            │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Cleaning  │  │ Visualiser   │  │ Export System    │  │
│  │ Functions │  │ (Recharts)   │  │ (CSV/JSON/Py)   │  │
│  └────┬─────┘  └──────┬───────┘  └──────────────────┘  │
│       │               │                                  │
└───────┼───────────────┼──────────────────────────────────┘
        │  POST /api/*  │
┌───────┼───────────────┼──────────────────────────────────┐
│  Vercel Serverless (7 functions)                         │
│  ┌────────────┐ ┌────────┐ ┌─────┐ ┌──────┐ ┌───────┐  │
│  │ operations │ │ charts │ │files│ │notes │ │ ai +  │  │
│  │  .js       │ │  .js   │ │ .js │ │ .js  │ │interpret│ │
│  └─────┬──────┘ └───┬────┘ └──┬──┘ └──┬───┘ └───┬───┘  │
│        │            │         │       │         │       │
└────────┼────────────┼─────────┼───────┼─────────┼───────┘
         │            │         │       │         │
    ┌────┴────────────┴─────────┴───────┴─────────┴───┐
    │  Neon Postgres (@neondatabase/serverless)        │
    │  Users · Files · File_Versions · Graphs · Notes  │
    │  + 11 chart-type tables + AI cooldowns           │
    └──────────────────────────────────────────────────┘
```

**Key decision:** All data-transform logic lives in shared class files under `src/functions/`. Both the client (browser) and the server (Vercel serverless) import the same classes. This avoids duplicating logic and keeps the test suite meaningful for both environments.

---

## Authentication Flow

```
User clicks "Sign in with Google"
        │
        ▼
Firebase Auth (Google OAuth popup)
        │
        ▼
On success: store email, name, photo in localStorage (dc_* keys)
        │
        ▼
POST /api/auth  →  INSERT INTO Users (email, name) ON CONFLICT DO NOTHING
        │
        ▼
<RequireAuth> wrapper checks localStorage for email on every route
        │
        ▼
Dashboard loads → POST /api/files (action: "list") → file cards render
```

**Why Firebase?** It handles the OAuth complexity (token refresh, popup flow, security rules) without needing a custom auth backend. The serverless API trusts the email from the client because this is a single-user-per-browser app — there are no cross-user security boundaries on the API side.

**Implementation files:**
- [src/firebase.js](src/firebase.js) — Firebase config + auth/provider exports
- [src/Components/login.jsx](src/Components/login.jsx) — Google sign-in UI
- [src/App.jsx](src/App.jsx) — `RequireAuth` guard component
- [api/auth.js](api/auth.js) — Neon user registration

---

## File Upload & Persistence

Files are never stored as binary blobs. Instead, the entire sheet data is serialised as JSON inside the `file_path` TEXT column:

```
Upload flow:
1. FileReader reads the .xlsx/.csv as an ArrayBuffer
2. XLSX.read() parses it into worksheets
3. Each sheet is converted to an array of row objects via sheet_to_json()
4. The { sheets, sheetNames } object is JSON.stringify'd into file_path
5. A row is INSERT'd into Files with filename, filetype, and the JSON blob
```

**Why JSON in a TEXT column?** Neon's free tier doesn't support large object storage. The datasets this tool handles (up to ~200k rows) fit comfortably in a TEXT column (Postgres max is 1 GB). This avoids needing a separate file-storage service.

**Sheet parsing** is handled by [src/utils/sheetParsers.js](src/utils/sheetParsers.js):
- `clampSheetRange()` — caps sheets at 1000 columns × 200k rows to prevent memory blow-ups
- `trim2DArray()` — drops trailing empty columns and fully empty rows
- `buildHeaders()` — generates unique, non-empty column names (appends `_2`, `_3` for duplicates)

**Implementation files:**
- [src/Components/dashboard.jsx](src/Components/dashboard.jsx) — upload handler
- [api/files.js](api/files.js) — CRUD dispatch (save/list/get/update/delete)
- [api/database/neon.js](api/database/neon.js) — `addFile()`, `getAllFiles()`, `getFile()`, `updateFile()`, `deleteFile()`

---

## Data Cleaning Pipeline

### Initial Clean (Automatic)

When a user opens a file for the first time, they run the **Initial Clean** — a bundled operation that applies four transforms in sequence:

```
Raw data → Trim → Clean → Remove Duplicates → Datatype Detection → Cleaned data
```

The result is **persisted per file+sheet** in the database so it only runs once. A banner shows the results (rows removed, types coerced).

### User-Selected Functions

After the initial clean, 40+ individual functions unlock. Each is implemented as a class in `src/functions/`:

```
src/functions/
├── automatic/        # Applied during initial clean
│   ├── clean.js      # Remove empty rows, normalise nulls
│   ├── datatype.js   # Coerce numeric strings → numbers
│   ├── duplicates.js # Remove exact duplicate rows
│   └── trim.js       # Remove leading/trailing whitespace
└── user_choice/      # Applied individually by the user
    ├── upper.js, lower.js, proper.js   # Text case
    ├── separate.js, join.js, concatenate.js  # Column splitting/merging
    ├── math.js         # 21 arithmetic operations
    ├── dateOperations.js  # Extract year/month/day, add days, age, etc.
    └── ... (20+ more)
```

### Dual Execution Model

Functions run **client-side** for instant feedback (the `FUNCTION_RUNNERS` map in `excel_file.jsx` wraps each class). The same classes are also imported by `api/operations.js` for server-side execution. The `run()` helper bridges the gap:

```javascript
// Client-side: data → sheet → class method → data
const run = (data, fn) =>
  XLSX.utils.sheet_to_json(fn(XLSX.utils.json_to_sheet(data)), { defval: "" });
```

This converts the row-objects array to a SheetJS worksheet, passes it to the class method (which expects worksheet format), then converts the result back to row objects.

**Multi-column support:** Most column functions accept a `selectedColumns` array. The UI shows a multi-select picker, and the `FUNCTION_RUNNERS` entry applies the operation to each column in sequence.

**Implementation files:**
- [src/Components/excel_file.jsx](src/Components/excel_file.jsx) — `FUNCTION_RUNNERS` map, UI, state management
- [api/operations.js](api/operations.js) — server-side dispatch (same classes)
- [src/functions/](src/functions/) — all transformation classes

---

## Serverless Function Consolidation

Vercel's free tier allows **12 serverless functions max**. The original design had 18 individual handlers (one per operation). The solution was consolidation:

```
Before (18 functions):          After (7 functions):
┌────────────┐                  ┌─────────────────────────────┐
│ upper.js   │──┐               │ operations.js               │
│ lower.js   │──┤  ┌─────────┐  │  └─ dispatches on           │
│ proper.js  │──┤  │operations│ │     operation field          │
│ clean.js   │──┤  │   .js    │  │     (or URL path for       │
│ trim.js    │──┤  └─────────┘  │      legacy rewrites)       │
│ ...13 more │──┘               │ charts.js                   │
└────────────┘                  │  └─ dispatches on chart type│
                                │ files.js, auth.js, ai.js,   │
                                │ interpret.js, notes.js       │
                                └─────────────────────────────┘
```

**How it works:** The unified handler in [api/operations.js](api/operations.js) maintains an `ops` object mapping operation names to functions. Each function instantiates the corresponding class, calls its method, and returns the result. The operation name is determined from either:
1. The `operation` field in the POST body (primary)
2. The URL path (for Vercel rewrites — `/api/upper` → `/api/operations`)

**vercel.json rewrites** map all legacy routes to their consolidated handlers:
```json
{ "source": "/api/upper", "destination": "/api/operations" }
```

This keeps the frontend's `fetch("/api/upper")` calls working without any changes.

---

## Chart Generation & AI Enhancement

### Chart Pipeline

```
User selects chart type + columns
        │
        ▼
POST /api/charts { chart: "bar", sheet: [...], column: "Name" }
        │
        ▼
charts.js dispatches to barChart() / histogram() / etc.
        │
        ▼
Chart function:
  1. Aggregates data (value_counts, correlation, bins, etc.)
  2. Calls AI for title, axis labels, and insights (non-fatal try/catch)
  3. Saves aggregated data + metadata to the chart's Neon table
  4. Returns { data, title, xAxis, yAxis, description/insights }
        │
        ▼
Frontend renders with Recharts + shows AI insights as bullet points
```

### AI-Enhanced Metadata

Each chart function sends a structured prompt to the AI asking for:
- A descriptive title (max 8 words)
- X and Y axis labels
- An `insights` array of 4-6 bullet-point observations about the data

The AI response is parsed as JSON and stored alongside the chart data. If the AI fails (rate limit, timeout), the chart still renders with fallback labels.

**Insights format change:** Originally, charts stored a single `description` string. This was changed to an `insights` array (JSON-stringified in the DB) because models returned one generic sentence when asked for a `"description"`. The array format forces 4-6 distinct observations.

**Backwards compatibility:** [api/fetchcharts.js](api/fetchcharts.js) checks if the `description` column contains a JSON array. If so, it's parsed into `insights`. Otherwise, it stays as a plain `description` string. This ensures old saved charts still display correctly.

### Matplotlib Export

[chartScripts.js](src/utils/exports/chartScripts.js) generates standalone Python scripts that reproduce any chart using matplotlib, pandas, seaborn, or plotly. When raw source data is available, the script recalculates aggregations from scratch. When only saved (pre-aggregated) data exists, it embeds the payload directly.

**Implementation files:**
- [api/charts.js](api/charts.js) — unified chart generation handler
- [src/graphs/functions/](src/graphs/functions/) — 11 chart functions
- [src/graphs/pages/chartsPage.jsx](src/graphs/pages/chartsPage.jsx) — chart UI
- [api/fetchcharts.js](api/fetchcharts.js) — loads saved charts with backwards compatibility

---

## Multi-Provider AI Orchestration

The AI system in [api/ai.js](api/ai.js) implements a **fallback chain** across five providers:

```
HuggingFace → OpenRouter → Cerebras → Gemini → Groq
```

Each provider has multiple models. The chain works as follows:

```
For each provider in the chain:
  1. Skip if no API key is set
  2. Skip if on cooldown (stored in Neon ai_provider_cooldowns table)
  3. For each model in the provider's list:
     a. Try the model (up to 1 retry with exponential backoff)
     b. If rate-limited → retry with 2^attempt seconds delay
     c. If failed → break to next model
  4. If all models exhausted → set 5-minute cooldown, try next provider
  5. If success → return the response immediately
```

**JSON enforcement:** Every provider is called with `response_format: { type: "json_object" }` (or equivalent) and a strict system instruction demanding JSON-only output. This prevents markdown fences, preambles, and other noise that would break `JSON.parse()`.

**Cooldown persistence:** When a provider exhausts all its models, a cooldown timestamp is written to Neon. Subsequent requests skip that provider entirely until the cooldown expires. This prevents wasting API calls on a provider that's clearly down or depleted.

**Lazy loading:** The Neon SQL client and all SDK instances are created lazily (on first use) to prevent import-time crashes when environment variables are missing.

---

## Natural-Language Function Search

The function search bar lets users describe what they want in plain English (e.g., "remove repetition"). The [api/interpret.js](api/interpret.js) handler:

1. Builds a prompt containing the full function catalog (60+ functions with keys and labels)
2. Sends it to the AI orchestration chain
3. Parses the JSON response for matching function keys
4. Validates keys against the catalog (rejects hallucinated keys)
5. Returns the valid keys — the frontend highlights the matching function cards

```
"remove repetition"
        │
        ▼
AI prompt: "Given these functions: [...], the user typed 'remove repetition'.
            Return { keys: [...] }"
        │
        ▼
AI responds: { "keys": ["duplicates", "removeEmpty"] }
        │
        ▼
Frontend highlights the "Remove Duplicates" and "Remove Empty Rows" cards
```

---

## Notes Slideover

The Notes feature provides per-file note-taking with a slideover UI:

```
┌──────────────────────────────────────────┬────────────────┐
│                                          │  Notes         │
│  Previous page visible as background     │  ┌──────────┐  │
│  (dimmed with rgba(0,0,0,0.18) backdrop) │  │ Note 1   │  │
│                                          │  │ Note 2   │  │
│                                          │  │ ...      │  │
│                                          │  ├──────────┤  │
│                                          │  │ Editor   │  │
│                                          │  │ (pinned) │  │
│                                          │  └──────────┘  │
└──────────────────────────────────────────┴────────────────┘
```

**Accessibility:** The Notes button appears in two places:
- **File view** (`excel_file.jsx`) — in the Inspectors section alongside Overview and Empty Values
- **Chart visualiser** (`chartsPage.jsx`) — in the top nav bar

Both pass `fileId` to the Notes component, which uses it to query the API.

**CRUD operations:** The component communicates with [api/notes.js](api/notes.js) via POST requests with an `action` field:
- `list` — fetch all notes for a file
- `create` — add a new note (requires `fileId`, `title`, `content`)
- `update` — edit an existing note (requires `noteId`, `title`, `content`)
- `delete` — remove a note (requires `noteId`)

**PDF export:** Opens a new browser window, builds the DOM using `createElement`/`textContent` (no `innerHTML` — XSS-safe), then triggers `window.print()`. The browser's print dialog lets the user save as PDF.

**Animation:** CSS `@keyframes` for `notesSlideIn` (translateX) and `notesFadeIn` (opacity) are injected via a `<style>` tag in the component. The backdrop and panel use separate z-index layers (900 and 901) to stay above all page content.

**Implementation files:**
- [src/Components/notes.jsx](src/Components/notes.jsx) — slideover UI + CRUD + PDF
- [api/notes.js](api/notes.js) — API handler
- [api/database/neon.js](api/database/neon.js) — `getNotes()`, `addNote()`, `updateNote()`, `deleteNote()`

---

## Export System

The export system in [src/utils/exports/](src/utils/exports/) generates downloadable files for selected columns:

| Format | File | What it produces |
|--------|------|-----------------|
| CSV | `csvExport.js` | Standard CSV with proper quoting |
| JSON | `jsonExport.js` | Array of row objects |
| Python (pandas) | `pythonExport.js` | Runnable pandas script with dtype inference |
| Python (numpy) | `pythonExport.js` | NumPy arrays saved as `.npy` |
| Chart scripts | `chartScripts.js` | matplotlib/pandas/seaborn/plotly reproductions |

**Shared utilities** in [exportCommon.js](src/utils/exports/exportCommon.js):
- `pickColumns()` — extract only selected columns from rows
- `sanitizeFileName()` — strip unsafe characters from filenames
- `columnValues()` — get all values for a single column
- `inferPandasDtype()` — guess int64/float64/bool/string from cell values
- `toPythonString()` — escape a JS string for safe embedding in Python source

**Column exporter** ([columnExporter.js](src/utils/exports/columnExporter.js)) is the orchestrator — it takes the user's format/library choices and delegates to the appropriate builder, returning an array of `{ filename, content, mime }` objects that the UI downloads via Blob URLs.

---

## Dev Server

[server/index.js](server/index.js) is an Express server for local development that combines:

1. **Environment loading** — `process.loadEnvFile()` runs BEFORE any dynamic imports, ensuring API handlers see the correct env vars
2. **Dynamic API imports** — each handler is imported with `await import()` wrapped in try/catch, so the server starts even if optional dependencies (AI SDKs) are missing
3. **Route mounting** — each handler is mounted at its `/api/*` path
4. **Legacy routes** — a loop creates backward-compatible paths (`/api/upper` → `operations` with `operation: "upper"` injected into the body)
5. **Vite middleware** — `createViteServer({ server: { middlewareMode: true } })` serves the React frontend with HMR on the same port

This means `npm run dev` gives you both the API and the frontend on `http://localhost:3000` — no CORS issues, no separate processes.

---

## Database Design

All tables auto-create on first request via `ensureTables()` in [api/database/neon.js](api/database/neon.js). This uses `CREATE TABLE IF NOT EXISTS` so it's safe to call on every request.

### Core Tables

| Table | Purpose |
|-------|---------|
| **Users** | email (PK) + name — populated on first sign-in |
| **Files** | id (SERIAL PK), filename, filetype (csv/excel), file_path (JSON blob of all sheet data), user (FK → Users) |
| **File_Versions** | Same as Files + file_id (FK → Files) + position — tracks draft history for undo |
| **Graphs** | id, file_id (FK), sheet_number, image_path — metadata for saved chart images |
| **Notes** | id, file_id (FK → Files, CASCADE DELETE), title, content, timestamps |

### Chart Tables (one per type)

Each chart type has its own table (bargraph, histogram, piechart, etc.) with:
- `email` + `filepath` — to query saved charts for a specific file
- Chart-specific data columns (e.g., `column` + `values` for bar, `bins` for histogram)
- `description` — stores either a plain string (legacy) or a JSON-stringified insights array
- `title`, `x_axis`, `y_axis` — AI-generated or fallback labels
- `created_at` — timestamp

### AI Cooldowns

The `ai_provider_cooldowns` table stores provider name + cooldown_until timestamp. When all models for a provider fail, a 5-minute cooldown is set. This persists across serverless cold starts.

---

## Frontend Routing & State

### Routes

```javascript
/login              → Login (Google sign-in)
/                   → Dashboard (file upload + file cards)     [auth required]
/excel/:fileId      → ExcelFile (multi-sheet view + functions) [auth required]
/csv/:fileId        → CsvFile (single-sheet view + functions)  [auth required]
/charts             → ChartsPage (visualiser + chart picker)   [auth required]
```

### State Management

There is **no global state library** (no Redux, no Zustand). State is managed with React's built-in hooks:

- **`useState`** — all component-local state (sheet data, selected columns, modal visibility, etc.)
- **`useEffect`** — data fetching on mount (load files, load saved charts, fetch notes)
- **`useCallback`** — memoise fetch functions to prevent infinite re-render loops
- **`useMemo`** — derive computed values (numeric vs string columns, available columns for chart type)
- **`useRef`** — file input references, cancellation flags for async operations

Navigation state (e.g., passing `fileId` from the file view to the charts page) uses React Router's `location.state`:

```javascript
navigate("/charts", { state: { sheet, filePath, fileId, columns, email } });
```

### Auth Guard

The `RequireAuth` component in [App.jsx](src/App.jsx) checks `localStorage` for the user's email. If missing, it redirects to `/login`. This is a client-side guard only — the API routes don't verify auth tokens.

---

## Testing Strategy

Tests live in [---test---/](---test---/) and run with Jest (250+ tests across 23+ suites). The project uses `"type": "module"` in package.json, so Jest runs with `--experimental-vm-modules` and `unstable_mockModule` for ESM mocking.

**What's tested:**
- All automatic functions (clean, trim, duplicates, datatype)
- All user-choice functions (upper, lower, proper, separate, join, math, dates, etc.)
- The `getOverview()` analysis function
- Chart script generation (boxplot regression test for `ax.bxp`)
- Column/row operations, text operations, formatting validation

**What's not tested:**
- API handlers (they're thin dispatchers over the same classes)
- React components (no component rendering tests)
- AI orchestration (non-deterministic, provider-dependent)
