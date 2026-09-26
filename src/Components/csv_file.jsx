import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { FileView } from "./excel_file";

function CsvFile() {
  const { fileId } = useParams();
  const [file, setFile] = useState(null);

  useEffect(() => {
    // Load file data directly from Neon
    fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get", fileId: Number(fileId) }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.file) {
          setFile({ ...res.file, id: String(res.file.id) });
        }
      })
      .catch(() => {});
  }, [fileId]);

  if (!file) {
    return (
      <div className="app-layout">
        <nav className="top-nav">
          <div className="nav-tabs">
            <Link to="/" className="nav-tab">Data Cleaner & Visualiser</Link>
            <span className="nav-tab active">CSV</span>
          </div>
        </nav>
        <main className="dashboard-main" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <div style={{ textAlign: "center" }}>
            <div className="loading-spinner" style={{ width: 40, height: 40, border: "4px solid #e7e0d8", borderTop: "4px solid #7e625b", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ color: "#8b7d6b", fontSize: 14 }}>Loading file...</p>
          </div>
        </main>
      </div>
    );
  }

  const sheetName = file.sheetNames[0] || "Sheet1";

  return (
    <FileView
      file={file}
      fileType="csv"
      navLabel="CSV"
      sheetNames={[sheetName]}
      activeSheet={sheetName}
      onSheetChange={() => {}}
    />
  );
}

export default CsvFile;
