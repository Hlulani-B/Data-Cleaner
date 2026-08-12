import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import * as XLSX from "xlsx";

/* ─── 2-D parsing helpers: every sheet becomes an array of objects ─── */

const MAX_COLS = 1000;
const MAX_ROWS = 200000;

/** Clamp a worksheet's !ref so SheetJS never enumerates a mega-range. */
function clampSheetRange(sheet, maxCols = MAX_COLS, maxRows = MAX_ROWS) {
  if (!sheet["!ref"]) return;
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  let changed = false;
  if (range.e.c >= maxCols) {
    range.e.c = maxCols - 1;
    changed = true;
  }
  if (range.e.r >= maxRows) {
    range.e.r = maxRows - 1;
    changed = true;
  }
  if (changed) {
    sheet["!ref"] = XLSX.utils.encode_range(range);
  }
}

/** Read a sheet as a clean 2-D array of strings (rows → cells). */
function sheetTo2DArray(sheet) {
  clampSheetRange(sheet);
  const raw = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => (Array.isArray(row) ? row : [row]));
}

/** Drop trailing empty columns and fully empty rows from a 2-D array. */
function trim2DArray(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  // Find the rightmost cell that contains data in any row.
  let lastCol = 0;
  for (const row of rows) {
    for (let i = row.length - 1; i >= 0; i--) {
      const val = row[i];
      if (val !== "" && val != null) {
        if (i + 1 > lastCol) lastCol = i + 1;
        break;
      }
    }
  }

  // Trim/pad every row to the same width and drop empty rows.
  return rows
    .map((row) => {
      const trimmed = row.slice(0, lastCol);
      while (trimmed.length < lastCol) trimmed.push("");
      return trimmed;
    })
    .filter((row) => row.some((v) => v !== "" && v != null));
}

/** Build unique, non-empty headers from the first row of a 2-D array. */
function buildHeaders(firstRow) {
  const seen = new Set();
  return (firstRow || []).map((cell, i) => {
    let h = String(cell ?? "").trim();
    if (!h) h = `Column_${i + 1}`;
    let unique = h;
    let counter = 2;
    while (seen.has(unique)) {
      unique = `${h}_${counter}`;
      counter++;
    }
    seen.add(unique);
    return unique;
  });
}

/** Convert a 2-D array into the app's expected array-of-objects shape. */
function array2DToObjects(rows) {
  const clean = trim2DArray(rows);
  if (clean.length === 0) return [];

  const headers = buildHeaders(clean[0]);
  return clean.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? "";
    });
    return obj;
  });
}

/** Coerce any parsed value into a 2-D array of primitives. */
function coerceTo2D(value) {
  if (Array.isArray(value)) {
    return value.map((row) =>
      Array.isArray(row)
        ? row.map((cell) => (cell == null ? "" : String(cell)))
        : [row == null ? "" : String(row)]
    );
  }
  if (value && typeof value === "object") {
    // Single object: turn each property into one row of two columns.
    return Object.entries(value).map(([k, v]) => [String(k), v == null ? "" : String(v)]);
  }
  return [[value == null ? "" : String(value)]];
}

/** Parse a SheetJS worksheet into a consistent array of row objects. */
function parseWorksheet(sheet) {
  try {
    const rows2D = sheetTo2DArray(sheet);
    return array2DToObjects(rows2D);
  } catch {
    // Last resort: read every cell manually and coerce to 2-D.
    const fallback = [];
    if (sheet["!ref"]) {
      const range = XLSX.utils.decode_range(sheet["!ref"]);
      for (let r = range.s.r; r <= Math.min(range.e.r, MAX_ROWS - 1); r++) {
        const row = [];
        for (let c = range.s.c; c <= Math.min(range.e.c, MAX_COLS - 1); c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = sheet[addr];
          row.push(cell?.v == null ? "" : String(cell.v));
        }
        fallback.push(row);
      }
    }
    return array2DToObjects(coerceTo2D(fallback));
  }
}

function Dashboard() {
  const [files, setFiles] = useState([]);
  const [username, setUsername] = useState("User");
  const [userPhoto, setUserPhoto] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const name = localStorage.getItem("dc_username");
    if (name) setUsername(name);
    const photo = localStorage.getItem("dc_userPhoto");
    if (photo) setUserPhoto(photo);

    const email = localStorage.getItem("dc_userEmail");
    if (email) {
      // Ensure user is registered in Neon
      fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || email.split("@")[0] }),
      }).catch(() => {});

      // Load files from Neon and merge with localStorage
      fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", userEmail: email }),
      })
        .then((r) => r.json())
        .then((res) => {
          const neonFiles = res.files || [];
          const localFiles = JSON.parse(localStorage.getItem("dc_files") || "[]");

          if (neonFiles.length > 0) {
            const neonIds = new Set(neonFiles.map((f) => String(f.id)));
            const neonNames = new Set(neonFiles.map((f) => f.filename));

            // Build merged list: start with Neon files
            const merged = [...neonFiles];

            // Keep local-only files (not yet in Neon) and
            // replace tempIds with real Neon IDs when filename matches
            for (const lf of localFiles) {
              if (neonIds.has(String(lf.id))) continue; // already in Neon
              const match = neonFiles.find(
                (nf) => nf.filename === lf.filename && !merged.find((m) => String(m.id) === String(lf.id))
              );
              if (match) {
                // Neon has same file by name — update Neon file's data if local has sheets
                const idx = merged.findIndex((m) => String(m.id) === String(match.id));
                if (idx !== -1 && lf.sheets && Object.keys(lf.sheets).length > 0) {
                  merged[idx] = { ...merged[idx], sheets: lf.sheets, sheetNames: lf.sheetNames };
                }
              } else if (!neonNames.has(lf.filename)) {
                // File only exists locally — keep it
                merged.push(lf);
              }
            }

            setFiles(merged);
            localStorage.setItem("dc_files", JSON.stringify(merged));
          } else {
            // Neon returned nothing — fall back to localStorage
            setFiles(localFiles);
          }
        })
        .catch(() => {
          const stored = JSON.parse(localStorage.getItem("dc_files") || "[]");
          setFiles(stored);
        });
    } else {
      const stored = JSON.parse(localStorage.getItem("dc_files") || "[]");
      setFiles(stored);
    }
  }, []);

  const saveFiles = (updated) => {
    setFiles(updated);
    localStorage.setItem("dc_files", JSON.stringify(updated));
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => {
      alert("Failed to read file: " + (reader.error?.message || "unknown error"));
    };
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const name = file.name.toLowerCase();
        const ext = name.includes(".") ? name.split(".").pop() : "";
        const filetype = ext === "csv" ? "csv" : "excel";
        const tempId = Date.now().toString();

        const sheets = {};
        workbook.SheetNames.forEach((sheetName) => {
          sheets[sheetName] = parseWorksheet(workbook.Sheets[sheetName]);
        });

        // Validate: at least one sheet must have a header row
        const hasData = Object.values(sheets).some(
          (rows) => Array.isArray(rows) && rows.length > 0
        );
        if (!hasData) {
          alert("Could not parse file. Make sure it's a valid CSV or Excel file.");
          return;
        }

        const newFile = {
          id: tempId,
          filename: file.name,
          filetype,
          sheets,
          sheetNames: workbook.SheetNames,
          createdAt: new Date().toISOString(),
        };

        // Save locally first for instant UI
        saveFiles([newFile, ...files]);
        navigate(`/${filetype}/${tempId}`);

        // Then save to Neon
        const email = localStorage.getItem("dc_userEmail");
        if (email) {
          fetch("/api/files", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "save",
              filename: file.name,
              filetype,
              sheets,
              sheetNames: workbook.SheetNames,
              userEmail: email,
            }),
          })
            .then((r) => {
              if (!r.ok) throw new Error(`Server error: ${r.status}`);
              return r.json();
            })
            .then((res) => {
              if (res.file) {
                // Read current localStorage (not stale closure)
                const current = JSON.parse(localStorage.getItem("dc_files") || "[]");
                const realId = String(res.file.id);
                // Replace tempId with the real Neon id
                const updated = current.map((f) =>
                  f.id === tempId ? { ...f, id: realId } : f
                );
                saveFiles(updated);
              }
            })
            .catch(() => {}); // localStorage still works if Neon fails
        }
      } catch (err) {
        alert("Failed to parse file: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    saveFiles(files.filter((f) => f.id !== id));
    // Also delete from Neon
    fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", fileId: Number(id) }),
    }).catch(() => {}); // silent
  };

  return (
    <div className="app-layout">
      <nav className="top-nav">
        <div className="nav-tabs">
          <Link to="/" className="nav-tab active">Data Cleaner</Link>
          <span className="nav-tab">Excel</span>
          <span className="nav-tab">CSV</span>
        </div>
        <div className="nav-user">
          <button className="user-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
            {userPhoto ? (
              <img className="user-avatar-img" src={userPhoto} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="user-avatar">&#128100;</span>
            )}
            <span>{username}</span>
            <span className="caret">&#9662;</span>
          </button>
          {dropdownOpen && (
            <div className="dropdown">
              <button
                className="dropdown-item"
                onClick={() => {
                  const name = prompt("Enter your name:", username);
                  if (name) {
                    setUsername(name);
                    localStorage.setItem("dc_username", name);
                  }
                  setDropdownOpen(false);
                }}
              >
                Profile
              </button>
              <button
                className="dropdown-item"
                onClick={async () => {
                  await signOut(auth);
                  localStorage.removeItem("dc_userEmail");
                  localStorage.removeItem("dc_username");
                  localStorage.removeItem("dc_userPhoto");
                  setFiles([]);
                  setUsername("User");
                  setDropdownOpen(false);
                  navigate("/login");
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="dashboard-main">
        <div className="upload-section">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,.xlsx,.xls"
            onChange={handleUpload}
            style={{ display: "none" }}
          />
          <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>
            <span className="upload-icon">+</span>
            Upload File
          </button>
          <p className="upload-hint">Supports CSV and Excel (.csv, .xlsx, .xls)</p>
        </div>

        {files.length > 0 && (
          <section className="files-section">
            <h2 className="section-title">Recent Files</h2>
            <div className="files-grid">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="file-card"
                  onClick={() => navigate(`/${file.filetype}/${file.id}`)}
                >
                  <div className={`file-badge ${file.filetype}`}>
                    {file.filetype === "csv" ? "CSV" : "XLS"}
                  </div>
                  <div className="file-info">
                    <span className="file-name" title={file.filename}>
                      {file.filename}
                    </span>
                    <span className="file-date">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button className="file-delete" onClick={(e) => handleDelete(file.id, e)}>
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
