# Data-Cleaner

A full-stack web application for cleaning and processing CSV/XLSX files. Upload a spreadsheet, run an initial automatic clean, then apply individual cleaning functions — with undo and draft history.

## Features

### Automatic Cleaning (Initial Clean)
Bundled into one action that must be run before other functions unlock:
- **Trim** — removes leading, trailing, and extra middle whitespace
- **Clean** — removes empty rows, trims strings, normalizes nulls
- **Remove Duplicates** — removes exact duplicate rows
- **Datatype Detection** — coerces numeric strings to numbers

### User-Selected Functions
Applied individually after the initial clean. Some require a column parameter:
- **Lowercase / Uppercase / Proper Case** — convert text case in a column
- **Remove Column** — drop a column from the dataset
- **Remove Empty Rows** — remove rows where all values are empty
- **Missing Values** — find rows with missing data or remove them
- **Date Standardization** — reformat a date column (YYYY-MM-DD, MM/DD/YYYY, DD-MM-YYYY)
- **Type Conversion** — cast a column to number, string, or boolean

### Other
- **Undo** — revert the last applied operation one step at a time
- **Drafts** — saved versions of the sheet, most recent first, so you can jump back to any previous state
- **AI Assistance** — multi-provider AI orchestration (OpenAI, Hugging Face, Gemini, Cerebras, Groq) with rate-limit handling and cooldowns

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React 19, React Router 7, Vite 8       |
| Backend    | Vercel serverless API routes (`api/`)   |
| Database   | Neon Postgres (`@neondatabase/serverless`) |
| Spreadsheets | xlsx                                  |
| AI         | OpenAI, Hugging Face, Google Gemini, Cerebras, Groq |
| Testing    | Jest (with experimental VM modules)      |
| Linting    | Oxlint                                   |

## Setup

```bash
npm install
```

Set the following environment variables for database and AI features:

```
DATABASE_URL=         # Neon Postgres connection string
OPENAI_API_KEY=       # OpenAI API key
HUGGINGFACE_API_KEY=  # Hugging Face Inference API key
GOOGLE_AI_API_KEY=    # Google Generative AI API key
CEREBRAS_API_KEY=     # Cerebras Cloud API key
GROQ_API_KEY=         # Groq API key
```

## Run

Start the frontend dev server (proxies `/api` calls to `localhost:3000`):

```bash
npm run dev
```

Start the API server separately on port 3000 (e.g. with `vercel dev` or a custom Express wrapper).

## Tests

```bash
npm test
```

## Build

```bash
npm run build
npm run preview   # preview the production build
```

## Project Structure

```
├── api/                          # Serverless API routes
│   ├── functions/
│   │   ├── automatic/            # Auto-applied operations (trim, clean, duplicates, datatype)
│   │   └── user_choice/          # User-selected operations (case, dates, types, etc.)
│   ├── database/
│   │   └── neon.js               # Neon Postgres database class
│   ├── ai.js                     # Multi-provider AI orchestration
│   ├── clean.js                  # Initial clean endpoint
│   ├── upload.js                 # JSON-to-XLSX export endpoint
│   └── [operation].js            # One endpoint per cleaning function
├── src/
│   ├── Components/
│   │   ├── dashboard.jsx         # Dashboard — upload + file cards
│   │   ├── excel_file.jsx        # Excel file view — sheet sidebar + functions
│   │   └── csv_file.jsx          # CSV file view — single sheet + functions
│   ├── App.jsx                   # React Router setup
│   └── main.jsx                  # Entry point
├── ---test---/                   # Jest test files
├── wireframes.md                 # UI wireframes
├── database_schema.md            # Database schema docs
└── vercel.json                   # Vercel deployment config
```

## Database Schema

Three tables — **Users**, **Files**, and **File_Versions** — track uploaded files and their version history (drafts/undo). See [database_schema.md](database_schema.md) for full details.

## Flow

Dashboard → Upload or open a file → Excel view (sheet sidebar) or CSV view (single sheet) → Run **Initial Clean** → Functions page unlocks → Apply functions → View drafts and undo changes.
