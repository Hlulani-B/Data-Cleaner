# Data-Cleaner

A full-stack web application for cleaning and processing CSV/XLSX files. Sign in with Google, upload a spreadsheet, run an automatic initial clean, then apply individual cleaning functions — with undo, draft history, and Neon database persistence.

## Features

### Authentication
- **Google Sign-In** via Firebase — protects all routes behind a login screen
- **Neon Postgres registration** — new users are automatically registered in the cloud database on sign-in

### Automatic Cleaning (Initial Clean)
Bundled into one action that must be run before other functions unlock. **Persists per file+sheet** so it only runs once:
- **Trim** — removes leading, trailing, and extra middle whitespace
- **Clean** — removes empty rows, trims strings, normalizes nulls
- **Remove Duplicates** — removes exact duplicate rows
- **Datatype Detection** — coerces numeric strings to numbers

Results are shown in a dismissible banner with row counts and stats.

### User-Selected Functions
Applied individually after the initial clean. Some require a column or multi-column selection:

#### Single Column
- **Lowercase / Uppercase / Proper Case** — convert text case
- **Remove Column** — drop a column from the dataset
- **Remove Empty Rows** — remove rows where all values are empty
- **Date Standardization** — reformat a date column (YYYY-MM-DD, MM/DD/YYYY, DD-MM-YYYY)
- **Type Conversion** — cast a column to number, string, or boolean
- **Separate Column** — split one column into two by a delimiter and occurrence position

#### Multi-Column
- **Join Columns** — combine multiple columns into one with a custom delimiter
- **Concatenate Columns** — combine multiple columns into one, with an optional custom string appended

#### Math Operations
21 mathematical and statistical operations accessible via a single "Math Operations" card with a two-step modal (pick operation → configure columns/params):

**Single-column (in-place):** Absolute Value, Ceiling, Floor, Negate, Round (with decimal places), Add Constant, Multiply Constant

**Single-column (new column):** Square Root, Power (with exponent), Logarithm (with base), Cumulative Sum

**Two-column (new column):** Add, Subtract, Multiply, Divide, Modulo, Min, Max, Percentage Of, Percentage Change

**Multi-column (new column):** Sum Columns, Average Columns

### Empty Values Inspector
Interactive view to inspect and remove rows with empty/missing data:
- Color-coded table: red cells for empty values, yellow rows for rows with empties
- Stats dashboard: total rows, rows with empty cells, fully empty rows, total empty cells
- Batch actions: select all empty rows, select fully empty rows only, remove selected or all

### Other
- **Neon Database Persistence** — files are saved to Neon Postgres on upload, synced on every operation, and loaded from Neon when revisiting
- **Undo** — revert the last applied operation one step at a time
- **Drafts** — saved versions of the sheet, most recent first, so you can jump back to any previous state
- **Export** — download the current sheet as XLSX (client-side)
- **AI Assistance** — multi-provider AI orchestration (OpenAI, Hugging Face, Gemini, Cerebras, Groq) with rate-limit handling and cooldowns

## Tech Stack

| Layer        | Technology                                         |
|--------------|----------------------------------------------------|
| Frontend     | React 19, React Router 7, Vite 8                  |
| Auth         | Firebase Authentication (Google Sign-In)           |
| Backend      | Vercel serverless (4 functions) + Express dev server |
| Database     | Neon Postgres (`@neondatabase/serverless`)         |
| Spreadsheets | xlsx (client-side parsing and export)              |
| AI           | OpenAI, Hugging Face, Google Gemini, Cerebras, Groq |
| Testing      | Jest (with experimental VM modules)                |
| Linting      | Oxlint                                             |

## Setup

```bash
npm install
```

Create a `.env` file with the following variables (no inline comments — dotenv doesn't support them):

```
# Database
DATABASE_URL=postgresql://...

# AI provider keys
OPENAI_API_KEY=
HUGGINGFACE_API_KEY=
GOOGLE_AI_API_KEY=
CEREBRAS_API_KEY=
GROQ_API_KEY=

# Firebase (client-side, VITE_ prefix required)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Run

Start the full-stack dev server (frontend + API on one port):

```bash
npm run dev
```

This starts Express with Vite middleware at **http://localhost:3000** — serves both the React frontend and all API routes.

For frontend-only development:

```bash
npm run dev:client
```

## Tests

```bash
npm test
```

## Build

```bash
npm run build
npm run preview   # preview the production build
```

## Architecture

### Serverless Functions (4 total — Vercel free-tier compatible)

Vercel's free tier allows **12 serverless functions max**. Early in development, each cleaning operation was its own serverless function (18 total), which exceeded the limit. The solution: consolidate all data transforms into a single unified handler (`api/operations.js`) that dispatches based on the `operation` field. Legacy routes like `/api/upper` are rewritten to `/api/operations` via `vercel.json` rewrites.

| Endpoint              | Handles                                           |
|-----------------------|---------------------------------------------------|
| `api/operations.js`   | All data transforms + 21 math operations (upper, lower, proper, clean, trim, duplicates, removeEmpty, removeColumn, missingValues, dateStandard, typeConversion, separate, join, concatenate, datatype, upload, math, absolute) |
| `api/files.js`        | File CRUD in Neon Postgres (save, list, get, update, delete, versions) |
| `api/auth.js`         | User registration in Neon Postgres                |
| `api/ai.js`           | Multi-provider AI orchestration                   |

Legacy routes like `/api/upper` are rewritten to `/api/operations` via `vercel.json` rewrites. The operations handler auto-detects the operation from the URL path or the `operation` field in the request body.

### Dev Server

`server/index.js` — Express server that:
- Loads `.env` before dynamically importing API handlers
- Mounts all API routes with backward-compatible legacy paths
- Uses Vite as middleware for the React frontend (with HMR)
- Gracefully skips the AI module if its dependencies aren't installed

## Project Structure

```
├── api/                          # Serverless API (4 functions)
│   ├── functions/
│   │   ├── automatic/            # Auto-applied operations (trim, clean, duplicates, datatype)
│   │   └── user_choice/          # User-selected operations (case, dates, types, separate, join, math, etc.)
│   ├── database/
│   │   └── neon.js               # Neon Postgres database class with ensureTables()
│   ├── operations.js             # Unified handler for all data + math transforms
│   ├── files.js                  # File CRUD (save/list/get/update/delete/versions)
│   ├── auth.js                   # User registration endpoint
│   └── ai.js                     # Multi-provider AI orchestration
├── server/
│   └── index.js                  # Express dev server (API + Vite middleware)
├── src/
│   ├── functions/                # Server-side operation classes (automatic + user_choice)
│   ├── Components/
│   │   ├── login.jsx             # Login page — Google sign-in + Neon registration
│   │   ├── dashboard.jsx         # Dashboard — upload + file cards + Neon sync
│   │   ├── excel_file.jsx        # Excel view — sheet sidebar, functions, modals
│   │   ├── csv_file.jsx          # CSV view — single sheet + functions
│   │   └── emptyvalues.jsx       # Empty values inspector component
│   ├── utils/
│   │   └── cleaners.js           # Client-side cleaning utilities
│   ├── firebase.js               # Firebase config + auth exports
│   ├── App.jsx                   # React Router + auth guards
│   └── main.jsx                  # Entry point
├── ---test---/                   # Jest test files
├── wireframes.md                 # UI wireframes
├── database_schema.md            # Database schema docs
└── vercel.json                   # Vercel deployment config + rewrites
```

## Database Schema

Four tables — **Users**, **Files**, **File_Versions**, and **Graphs** — track users, uploaded files, version history (drafts/undo), and chart images. Tables auto-create on first request via `ensureTables()`. See [database_schema.md](database_schema.md) for full details.

## Flow

**Login** (Google sign-in + Neon registration) → **Dashboard** → Upload or open a file → **Excel view** (sheet sidebar) or **CSV view** (single sheet) → Run **Initial Clean** (one-time, persisted) → Results banner + functions unlock → Apply functions (column picker or multi-column modal) → Inspect **Empty Values** → View drafts and undo changes → **Export** as XLSX.
