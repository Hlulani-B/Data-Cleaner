# Data Cleaner — Wireframes

## 1. Dashboard.jsx

**Top nav:** Data Cleaner | Excel | CSV tabs — right side: username with dropdown icon (menu, profile, signout)

**Body:**
- "Upload File" button (large, centered)
- Grid of file cards below: File1–File8 (8 uploaded files shown as cards)

```
[Data Cleaner] [Excel] [CSV]                    [👤 username ▾]
--------------------------------------------------------------
                    [ Upload File ]

  [File1] [File2] [File3] [File4]
  [File5] [File6] [File7] [File8]
```

## 2. Excel-File.jsx

**Top nav:** Data Cleaner | Excel tabs

**Layout:** Left sidebar has Sheet1 | Sheet2 | Sheet3 (stacked, not top tabs). Selecting a sheet loads its Sheet View.

### Step A — Initial Clean (gate page)
Shown first, before any functions are available.
```
[Data Cleaner] [Excel]
--------------------------------------------------------------
| Sheet1 |                                                    |
| Sheet2 |          Sheet View (table)                        |
| Sheet3 |                                                     |
|        |          [ Initial Clean ]                         |
--------------------------------------------------------------
```
Initial Clean bundles Trim, Clean, Remove Duplicates, Datatypes into one action. It must be run before functions become accessible.

### Step B — Functions page (after Initial Clean is run)
Separate page/view, only reachable after Initial Clean completes.
```
[Data Cleaner] [Excel]
--------------------------------------------------------------
| Sheet1 |                                                    |
| Sheet2 |          Sheet View (table, cleaned)               |
| Sheet3 |                                                     |
|        |   ------------------------------------------------ |
|        |   [Func A]   [Func B]                              |
|        |   [Func C]   [Func D]  ...                          |
|        |   (each card: name + description)                  |
|        |   ------------------------------------------------ |
|        |   Drafts                                            |
|        |   [Draft 1] [Draft 2] [Draft 3] ...                 |
|        |   (each = a saved version, most recent first)       |
--------------------------------------------------------------
[ Undo ]
```
Some functions need parameters (e.g. a column) — these open the "Choose a column" popup when clicked.
```
Choose a column
[Col1] [Col2]
[Col3] [Col4]
```
**Undo:** reverts the last applied function/clean, one step at a time.
**Drafts:** below the functions grid — a list of saved versions of the sheet (each is a row in File_Versions, ordered by `position`), so the user can jump back to an earlier or more recent state instead of only stepping back one undo at a time.

## 3. CSV-File.jsx

Same as Excel-File.jsx but no sheet sidebar (CSV has a single sheet only).

**Top nav:** Data Cleaner | CSV tabs

### Step A — Initial Clean (gate page)
```
[Data Cleaner] [CSV]
--------------------------------------------------------------
|          Sheet View (table)                                |
|                                                              |
|          [ Initial Clean ]                                  |
--------------------------------------------------------------
```

### Step B — Functions page (after Initial Clean is run)
```
[Data Cleaner] [CSV]
--------------------------------------------------------------
|          Sheet View (table, cleaned)                        |
|   ---------------------------------------------------------|
|   [Func A]   [Func B]                                       |
|   [Func C]   [Func D]  ...                                  |
|   ---------------------------------------------------------|
|   Drafts                                                    |
|   [Draft 1] [Draft 2] [Draft 3] ...                          |
--------------------------------------------------------------
[ Undo ]
```
Same "Choose a column" popup for functions needing params.
Same Undo (reverts last applied step) and Drafts (list of saved versions, most recent first) as Excel-File.jsx.

## Flow
Dashboard → Upload File / click a File card → opens Excel-File view (sheet sidebar) or CSV-File view (single sheet) → Sheet View shows data → run Initial Clean (Trim, Clean, Remove Duplicates, Datatypes) → once done, Functions page unlocks → click a function (some open "Choose a column" popup for params) → apply.