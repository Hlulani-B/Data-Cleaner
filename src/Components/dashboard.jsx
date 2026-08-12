import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import * as XLSX from "xlsx";

function Dashboard() {
  const [files, setFiles] = useState([]);
  const [username, setUsername] = useState("User");
  const [userPhoto, setUserPhoto] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("dc_files") || "[]");
    setFiles(stored);
    const name = localStorage.getItem("dc_username");
    if (name) setUsername(name);
    const photo = localStorage.getItem("dc_userPhoto");
    if (photo) setUserPhoto(photo);
  }, []);

  const saveFiles = (updated) => {
    setFiles(updated);
    localStorage.setItem("dc_files", JSON.stringify(updated));
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const ext = file.name.split(".").pop().toLowerCase();
      const filetype = ext === "csv" ? "csv" : "excel";
      const id = Date.now().toString();

      const sheets = {};
      workbook.SheetNames.forEach((name) => {
        sheets[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: "" });
      });

      const newFile = {
        id,
        filename: file.name,
        filetype,
        sheets,
        sheetNames: workbook.SheetNames,
        createdAt: new Date().toISOString(),
      };

      saveFiles([newFile, ...files]);
      navigate(`/${filetype}/${id}`);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    saveFiles(files.filter((f) => f.id !== id));
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
