import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { FileView } from "./excel_file";

function CsvFile() {
  const { fileId } = useParams();
  const [file, setFile] = useState(null);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("dc_files") || "[]");
    const found = stored.find((f) => f.id === fileId);
    if (found) {
      setFile(found);
    }
  }, [fileId]);

  if (!file) {
    return (
      <div className="app-layout">
        <nav className="top-nav">
          <div className="nav-tabs">
            <Link to="/" className="nav-tab">Data Cleaner</Link>
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
