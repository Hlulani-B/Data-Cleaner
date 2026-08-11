# Data-Cleaner

A tool for cleaning and processing CSV/XLSX files. Upload a file, apply cleaning operations, and get back a cleaned spreadsheet.

## Features

### Automatic (always applied)
- **Trim** — removes leading, trailing, and extra middle whitespace from text fields

### Optional (user selects)
- **Case conversion** — lower, upper, or proper case
- **Remove duplicates** — removes exact duplicate rows

## Tech Stack
- Node.js + Express
- Multer (file uploads)
- xlsx (spreadsheet reading/writing)
- Jest (testing)

## Setup

```bash
cd server
npm install
```

## Run Tests

```bash
npm test
```

## Run Server

```bash
node index.js
```

## Project Structure

```
server/
├── Routes/
│   └── Convert.js
├── Trim.js
├── Duplicate.js
├── *.test.js
└── index.js
```
