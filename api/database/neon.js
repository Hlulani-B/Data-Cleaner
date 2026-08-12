import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

export class Database {
  // Create tables if they don't exist yet
  async ensureTables() {
    await sql`
      CREATE TABLE IF NOT EXISTS Users (
        email VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS Files (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        filetype VARCHAR(10) NOT NULL CHECK (filetype IN ('csv', 'excel')),
        file_path VARCHAR(500) NOT NULL,
        "user" VARCHAR(255) REFERENCES Users(email)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS File_Versions (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        filetype VARCHAR(10) NOT NULL CHECK (filetype IN ('csv', 'excel')),
        file_path VARCHAR(500) NOT NULL,
        "user" VARCHAR(255) REFERENCES Users(email),
        file_id INTEGER REFERENCES Files(id),
        position INTEGER NOT NULL
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS Graphs (
        id SERIAL PRIMARY KEY,
        file_id INTEGER REFERENCES Files(id),
        sheet_number INTEGER,
        image_path VARCHAR(500) NOT NULL
      )
    `;
  }

  // Get a single file by id
  async getFile(fileId) {
    const rows = await sql`
      SELECT id, filename, filetype, file_path, "user"
      FROM Files
      WHERE id = ${fileId}
    `;
    return rows[0] || null;
  }

  // Get all files for a user
  async getAllFiles(userEmail) {
    const rows = await sql`
      SELECT id, filename, filetype, file_path, "user"
      FROM Files
      WHERE "user" = ${userEmail}
      ORDER BY id DESC
    `;
    return rows;
  }

  // Add a new file and return it
  async addFile(filename, filetype, filePath, userEmail) {
    const rows = await sql`
      INSERT INTO Files (filename, filetype, file_path, "user")
      VALUES (${filename}, ${filetype}, ${filePath}, ${userEmail})
      RETURNING id, filename, filetype, file_path, "user"
    `;
    return rows[0];
  }

  // Delete a file and all its versions
  async deleteFile(fileId) {
    await sql`DELETE FROM File_Versions WHERE file_id = ${fileId}`;
    await sql`DELETE FROM Files WHERE id = ${fileId}`;
  }

  // Get previous versions (drafts) of a file, ordered by position descending (most recent first)
  async getPreviousFiles(fileId) {
    const rows = await sql`
      SELECT id, filename, filetype, file_path, "user", file_id, position
      FROM File_Versions
      WHERE file_id = ${fileId}
      ORDER BY position DESC
    `;
    return rows;
  }

  // Save a new version (draft) of a file
  async addFileVersion(fileId, filename, filetype, filePath, userEmail, position) {
    const rows = await sql`
      INSERT INTO File_Versions (filename, filetype, file_path, "user", file_id, position)
      VALUES (${filename}, ${filetype}, ${filePath}, ${userEmail}, ${fileId}, ${position})
      RETURNING id, filename, filetype, file_path, "user", file_id, position
    `;
    return rows[0];
  }

  // Get the latest position number for a file's versions
  async getLatestPosition(fileId) {
    const rows = await sql`
      SELECT MAX(position) AS max_pos
      FROM File_Versions
      WHERE file_id = ${fileId}
    `;
    return rows[0]?.max_pos || 0;
  }

  // Delete a specific file version
  async deleteFileVersion(versionId) {
    await sql`DELETE FROM File_Versions WHERE id = ${versionId}`;
  }

  // Get a user by email
  async getUser(email) {
    const rows = await sql`
      SELECT email, name FROM Users WHERE email = ${email}
    `;
    return rows[0] || null;
  }

  // Create a user (does nothing if email already exists)
  async addUser(email, name) {
    const rows = await sql`
      INSERT INTO Users (email, name)
      VALUES (${email}, ${name})
      ON CONFLICT (email) DO NOTHING
      RETURNING email, name
    `;
    return rows[0] || null;
  }
}
