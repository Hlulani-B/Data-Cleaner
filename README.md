# Data-Cleaner

A full-stack web application for cleaning and processing CSV/XLSX files. Sign in with Google, upload a spreadsheet, run an automatic initial clean, then apply individual cleaning functions — with undo and draft history.

## Features

### Authentication
- **Google Sign-In** via Firebase — protects all routes behind a login screen

### Automatic Cleaning (Initial Clean)
Bundled into one action that must be run before other functions unlock:
- **Trim** — removes leading, trailing, and extra middle whitespace
- **Clean** — removes empty rows, trims strings, normalizes nulls
- **Remove Duplicates** — removes exact duplicate rows
- **Datatype Detection** — coerces numeric strings to numbers

Results are shown in a dismissible banner with row counts and stats.

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
- **Export** — download the current sheet as XLSX (client-side)
- **AI Assistance** — multi-provider AI orchestration (OpenAI, Hugging Face, Gemini, Cerebras, Groq) with rate-limit handling and cooldowns

## Tech Stack

| Layer        | Technology                                         |
|--------------|----------------------------------------------------|
| Frontend     | React 19, React Router 7, Vite 8                  |
| Auth         | Firebase Authentication (Google Sign-In)           |
| Backend      | Vercel serverless API routes (`api/`)              |
| Database     | Neon Postgres (`@neondatabase/serverless`)         |
| Spreadsheets | xlsx (client-side parsing and export)              |
| AI           | OpenAI, Hugging Face, Google Gemini, Cerebras, Groq |
| Testing      | Jest (with experimental VM modules)                |
| Linting      | Oxlint                                             |

## Setup

```bash
npm install
```

Create a `.env` file with the following variables:

```
# Database & AI (server-side)
DATABASE_URL=             # Neon Postgres connection string
OPENAI_API_KEY=           # OpenAI API key
HUGGINGFACE_API_KEY=      # Hugging Face Inference API key
GOOGLE_AI_API_KEY=        # Google Generative AI API key
CEREBRAS_API_KEY=         # Cerebras Cloud API key
GROQ_API_KEY=             # Groq API key

# Firebase (client-side, VITE_ prefix required)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Run

Start the frontend dev server:

```bash
npm run dev
```

Cleaning operations run entirely client-side — no separate API server needed for core functionality. Start the API server separately (e.g. `vercel dev`) only for AI assistance features.

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
│   │   ├── login.jsx             # Login page — Google sign-in
│   │   ├── dashboard.jsx         # Dashboard — upload + file cards
│   │   ├── excel_file.jsx        # Excel file view — sheet sidebar + functions
│   │   └── csv_file.jsx          # CSV file view — single sheet + functions
│   ├── utils/
│   │   └── cleaners.js           # Client-side cleaning utilities
│   ├── firebase.js               # Firebase config + auth exports
│   ├── App.jsx                   # React Router + auth guards
│   └── main.jsx                  # Entry point
├── ---test---/                   # Jest test files
├── wireframes.md                 # UI wireframes
├── database_schema.md            # Database schema docs
└── vercel.json                   # Vercel deployment config
```

## Database Schema

Three tables — **Users**, **Files**, and **File_Versions** — track uploaded files and their version history (drafts/undo). See [database_schema.md](database_schema.md) for full details.

## Flow

**Login** (Google sign-in) → **Dashboard** → Upload or open a file → **Excel view** (sheet sidebar) or **CSV view** (single sheet) → Run **Initial Clean** → Results banner + functions unlock → Apply functions → View drafts and undo changes.
