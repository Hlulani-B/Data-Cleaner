import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import * as XLSX from "xlsx";
import { parseWorksheet } from "../utils/sheetParsers";

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

      // Load files from Neon only (no localStorage for file data)
      fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", userEmail: email }),
      })
        .then((r) => r.json())
        .then((res) => {
          setFiles(res.files || []);
        })
        .catch(() => {
          setFiles([]);
        });
    }
  }, []);

  const saveFiles = (updated) => {
    setFiles(updated);
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

        const email = localStorage.getItem("dc_userEmail");
        if (!email) {
          alert("Please sign in first.");
          return;
        }

        // Save directly to Neon first — no localStorage for file data
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
              const realId = String(res.file.id);
              // Add to file list in state
              setFiles((prev) => [{
                id: realId,
                filename: file.name,
                filetype,
                sheetNames: workbook.SheetNames,
                createdAt: new Date().toISOString(),
              }, ...prev]);
              navigate(`/${filetype}/${realId}`);
            }
          })
          .catch((err) => {
            alert("Failed to save file: " + err.message);
          });
      } catch (err) {
        alert("Failed to parse file: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    setFiles((prev) => prev.filter((f) => f.id !== id));
    // Delete from Neon
    fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", fileId: Number(id) }),
    }).catch(() => {});
    // Clean up any local clean-done flags
    try {
      const flags = JSON.parse(localStorage.getItem("dc_cleaned") || "{}");
      delete flags[String(id)];
      localStorage.setItem("dc_cleaned", JSON.stringify(flags));
    } catch {}
  };

  return (
    <div className="app-layout">
      <nav className="top-nav">
        <div className="nav-tabs">
          <Link to="/" className="nav-tab active">Data Cleaner & Visualiser</Link>
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
