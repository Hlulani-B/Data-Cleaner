import { Database } from "./database/neon.js";

const db = new Database();

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { action } = req.body;
    if (!action) return res.status(400).json({ error: "action is required" });

    // Ensure tables exist
    await db.ensureTables();

    switch (action) {
      case "list": {
        const { fileId } = req.body;
        if (!fileId) return res.status(400).json({ error: "fileId is required" });
        const notes = await db.getNotes(Number(fileId));
        return res.status(200).json({ notes });
      }

      case "create": {
        const { fileId, title, content } = req.body;
        if (!fileId) return res.status(400).json({ error: "fileId is required" });
        if (!title || !title.trim()) return res.status(400).json({ error: "title is required" });
        const note = await db.addNote(Number(fileId), title.trim(), content || "");
        return res.status(201).json({ note });
      }

      case "update": {
        const { noteId, title, content } = req.body;
        if (!noteId) return res.status(400).json({ error: "noteId is required" });
        if (!title || !title.trim()) return res.status(400).json({ error: "title is required" });
        const note = await db.updateNote(Number(noteId), title.trim(), content || "");
        if (!note) return res.status(404).json({ error: "Note not found" });
        return res.status(200).json({ note });
      }

      case "delete": {
        const { noteId } = req.body;
        if (!noteId) return res.status(400).json({ error: "noteId is required" });
        await db.deleteNote(Number(noteId));
        return res.status(200).json({ ok: true });
      }

      default:
        return res.status(400).json({ error: `unknown action: ${action}` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
