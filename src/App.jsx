import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./Components/dashboard";
import ExcelFile from "./Components/excel_file";
import CsvFile from "./Components/csv_file";
import Login from "./Components/login";
import ChartsPage from "./graphs/pages/chartsPage";
import "./App.css";

function RequireAuth({ children }) {
  const email = localStorage.getItem("dc_userEmail");
  if (!email) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/excel/:fileId" element={<RequireAuth><ExcelFile /></RequireAuth>} />
        <Route path="/csv/:fileId" element={<RequireAuth><CsvFile /></RequireAuth>} />
        <Route path="/charts" element={<RequireAuth><ChartsPage /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
