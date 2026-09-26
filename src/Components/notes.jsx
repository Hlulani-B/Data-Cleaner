import { useState, useEffect, useCallback } from "react";

const API = "/api/notes";

const theme = {
  bg: "#fdfcfa",
  card: "#ffffff",
  border: "#e7e0d8",
  text: "#4a3f35",
  textMuted: "#8b7d6b",
  accent: "#7e625b",
  accentHover: "#6a524c",
  accentBg: "rgba(126, 98, 91, 0.07)",
  danger: "#b0564d",
  dangerBg: "rgba(176, 86, 77, 0.08)",
};

/**
 * Notes — slideover panel for per-file notes with full CRUD + PDF export.
 * Slides in from the right, leaving the previous page visible as background.
 *
 * Props:
 *   fileId  — the Files.id this note belongs to
 *   onClose — close handler
 */
export default function Notes({ fileId, onClose }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Editor state
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", fileId: Number(fileId) }),
      });
      const json = await res.json();
      if (json.notes) setNotes(json.notes);
    } catch (err) {
      setError("Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  function startEdit(note) {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content || "");
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle("");
    setContent("");
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    try {
      const action = editingId ? "update" : "create";
      const body = editingId
        ? { action, noteId: editingId, title: title.trim(), content }
        : { action, fileId: Number(fileId), title: title.trim(), content };

      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Save failed");
      }
      cancelEdit();
      await fetchNotes();
    } catch (err) {
      setError(err.message || "Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(noteId) {
    setError("");
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", noteId }),
      });
      if (!res.ok) throw new Error("Delete failed");
      if (editingId === noteId) cancelEdit();
      await fetchNotes();
    } catch (err) {
      setError(err.message || "Failed to delete note");
    }
  }

  function handleExportPdf() {
    const printWin = window.open("", "_blank", "width=800,height=900");
    const doc = printWin.document;

    doc.open();
    const body = doc.createElement("body");
    body.style.cssText = "font-family:system-ui,-apple-system,sans-serif;max-width:700px;margin:40px auto;padding:0 20px;color:#4a3f35;";

    const h1 = doc.createElement("h1");
    h1.style.cssText = "font-size:24px;margin:0 0 4px;";
    h1.textContent = "Notes";
    body.appendChild(h1);

    const sub = doc.createElement("p");
    sub.style.cssText = "font-size:12px;color:#8b7d6b;margin:0 0 24px;";
    sub.textContent = `${notes.length} note${notes.length !== 1 ? "s" : ""} · Exported ${new Date().toLocaleDateString()}`;
    body.appendChild(sub);

    if (notes.length === 0) {
      const empty = doc.createElement("p");
      empty.style.color = "#8b7d6b";
      empty.textContent = "No notes yet.";
      body.appendChild(empty);
    } else {
      notes.forEach((n, i) => {
        if (i > 0) {
          const hr = doc.createElement("hr");
          hr.style.cssText = "border:none;border-top:1px solid #e7e0d8;margin:16px 0;";
          body.appendChild(hr);
        }
        const wrap = doc.createElement("div");
        wrap.style.cssText = "margin-bottom:24px;page-break-inside:avoid;";

        const t = doc.createElement("h2");
        t.style.cssText = "margin:0 0 6px;font-size:18px;color:#4a3f35;";
        t.textContent = n.title;
        wrap.appendChild(t);

        const d = doc.createElement("p");
        d.style.cssText = "margin:0 0 4px;font-size:11px;color:#8b7d6b;";
        d.textContent = new Date(n.updated_at || n.created_at).toLocaleString();
        wrap.appendChild(d);

        const c = doc.createElement("div");
        c.style.cssText = "font-size:14px;color:#4a3f35;white-space:pre-wrap;line-height:1.6;";
        c.textContent = n.content || "";
        wrap.appendChild(c);

        body.appendChild(wrap);
      });
    }

    doc.body = body;
    doc.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 300);
  }

  const isEditing = editingId !== null || title !== "";

  return (
    <>
      {/* Dimmed backdrop — click to close */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.18)",
          zIndex: 900,
          animation: "notesFadeIn 0.2s ease",
        }}
      />

      {/* Slideover panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 400,
          maxWidth: "90vw",
          background: theme.card,
          borderLeft: `1px solid ${theme.border}`,
          boxShadow: "-4px 0 24px rgba(0,0,0,0.10)",
          zIndex: 901,
          display: "flex",
          flexDirection: "column",
          animation: "notesSlideIn 0.25s ease",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${theme.border}` }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: theme.text }}>Notes</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {notes.length > 0 && (
              <button onClick={handleExportPdf} style={btnStyle(theme.textMuted, "transparent", theme.border)} title="Export all notes as PDF">
                Export PDF
              </button>
            )}
            <button onClick={onClose} style={btnStyle(theme.textMuted, "transparent", "transparent")} aria-label="Close notes">
              ✕
            </button>
          </div>
        </div>

        {error && <p style={{ color: theme.danger, fontSize: 13, margin: "8px 20px 0" }}>{error}</p>}

        {/* Notes list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
          {loading ? (
            <p style={{ color: theme.textMuted, textAlign: "center", padding: 24 }}>Loading notes...</p>
          ) : notes.length === 0 && !isEditing ? (
            <p style={{ color: theme.textMuted, textAlign: "center", padding: 24, fontSize: 13, lineHeight: 1.6 }}>
              No notes yet. Add one below to keep track of observations, TODOs, or reminders for this file.
            </p>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                style={{
                  background: editingId === note.id ? theme.accentBg : theme.bg,
                  border: `1px solid ${editingId === note.id ? theme.accent : theme.border}`,
                  borderRadius: 8,
                  padding: "10px 14px",
                  marginBottom: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: theme.text }}>{note.title}</h4>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button onClick={() => startEdit(note)} style={btnSmall(theme.accent)} title="Edit">✎</button>
                    <button onClick={() => handleDelete(note.id)} style={btnSmall(theme.danger)} title="Delete">✕</button>
                  </div>
                </div>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: theme.textMuted }}>
                  {new Date(note.updated_at || note.created_at).toLocaleString()}
                </p>
                {note.content && (
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: theme.text, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                    {note.content}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Editor — pinned to bottom */}
        <div style={{ borderTop: `1px solid ${theme.border}`, padding: "12px 20px 16px" }}>
          <input
            type="text"
            placeholder="Note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={inputStyle(theme)}
          />
          <textarea
            placeholder="Write your note here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            style={{ ...inputStyle(theme), resize: "vertical", fontFamily: "inherit", marginTop: 6 }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
            {isEditing && (
              <button onClick={cancelEdit} style={btnStyle(theme.textMuted, "transparent", theme.border)}>
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!title.trim() || saving}
              style={btnStyle("#fff", theme.accent, "transparent", theme.accentHover)}
            >
              {saving ? "Saving..." : editingId ? "Update" : "Add Note"}
            </button>
          </div>
        </div>
      </div>

      {/* Keyframe animations injected once via a style tag */}
      <style>{`
        @keyframes notesSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes notesFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}

/* ── Style helpers ── */

function btnStyle(color, bg, border) {
  return {
    background: bg,
    color,
    border: `1px solid ${border}`,
    borderRadius: 6,
    padding: "5px 12px",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

function btnSmall(color) {
  return {
    background: "transparent",
    color,
    border: "none",
    borderRadius: 4,
    padding: "2px 6px",
    fontSize: 14,
    cursor: "pointer",
    lineHeight: 1,
  };
}

function inputStyle(theme) {
  return {
    width: "100%",
    padding: "8px 10px",
    fontSize: 13,
    border: `1px solid ${theme.border}`,
    borderRadius: 6,
    outline: "none",
    color: theme.text,
    background: theme.bg,
    boxSizing: "border-box",
  };
}
