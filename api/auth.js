import { Database } from "./database/neon.js";

const db = new Database();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: "email is required" });

    // Ensure tables exist on first request
    await db.ensureTables();

    // Check if user already exists
    const existing = await db.getUser(email);
    if (existing) {
      return res.status(200).json({ user: existing, isNew: false });
    }

    // Register new user
    const displayName = name || email.split("@")[0];
    const user = await db.addUser(email, displayName);
    return res.status(201).json({ user, isNew: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
