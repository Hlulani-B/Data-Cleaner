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
        <main className="dashboard-main">
          <p className="empty-msg">File not found. <Link to="/">Go back</Link></p>
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
