import { Database } from "./database/neon.js";

const db = new Database();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { action } = req.body;
    if (!action) return res.status(400).json({ error: "action is required" });

    // Ensure tables exist
    await db.ensureTables();

    switch (action) {
      case "save": {
        const { filename, filetype, sheets, sheetNames, userEmail } = req.body;
        if (!filename || !filetype || !userEmail) {
          return res.status(400).json({ error: "filename, filetype, and userEmail are required" });
        }
        const filePath = JSON.stringify({ sheets, sheetNames });
        const file = await db.addFile(filename, filetype, filePath, userEmail);
        return res.status(201).json({ file });
      }

      case "update": {
        const { fileId, sheets, sheetNames } = req.body;
        if (!fileId) return res.status(400).json({ error: "fileId is required" });
        const filePath = JSON.stringify({ sheets, sheetNames });
        await db.updateFile(fileId, filePath);
        return res.status(200).json({ ok: true });
      }

      case "list": {
        const { userEmail } = req.body;
        if (!userEmail) return res.status(400).json({ error: "userEmail is required" });
        const files = await db.getAllFiles(userEmail);
        // Parse file_path back to sheets data
        const parsed = files.map((f) => {
          try {
            const data = JSON.parse(f.file_path);
            return {
              id: f.id,
              filename: f.filename,
              filetype: f.filetype,
              sheets: data.sheets || {},
              sheetNames: data.sheetNames || [],
              createdAt: new Date().toISOString(),
            };
          } catch {
            return { id: f.id, filename: f.filename, filetype: f.filetype, sheets: {}, sheetNames: [], createdAt: new Date().toISOString() };
          }
        });
        return res.status(200).json({ files: parsed });
      }

      case "get": {
        const { fileId } = req.body;
        if (!fileId) return res.status(400).json({ error: "fileId is required" });
        const file = await db.getFile(fileId);
        if (!file) return res.status(404).json({ error: "File not found" });
        const data = JSON.parse(file.file_path);
        return res.status(200).json({
          file: {
            id: file.id,
            filename: file.filename,
            filetype: file.filetype,
            sheets: data.sheets || {},
            sheetNames: data.sheetNames || [],
          },
        });
      }

      case "delete": {
        const { fileId } = req.body;
        if (!fileId) return res.status(400).json({ error: "fileId is required" });
        await db.deleteFile(fileId);
        return res.status(200).json({ ok: true });
      }

      case "saveVersion": {
        const { fileId, filename, filetype, sheets, sheetNames, userEmail } = req.body;
        if (!fileId || !userEmail) return res.status(400).json({ error: "fileId and userEmail are required" });
        const filePath = JSON.stringify({ sheets, sheetNames });
        const pos = await db.getLatestPosition(fileId);
        const version = await db.addFileVersion(fileId, filename || "version", filetype || "excel", filePath, userEmail, pos + 1);
        return res.status(201).json({ version });
      }

      case "getVersions": {
        const { fileId } = req.body;
        if (!fileId) return res.status(400).json({ error: "fileId is required" });
        const versions = await db.getPreviousFiles(fileId);
        return res.status(200).json({ versions });
      }

      default:
        return res.status(400).json({ error: `unknown action: ${action}` });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
