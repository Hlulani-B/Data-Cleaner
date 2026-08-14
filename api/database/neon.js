let _sql = null;

async function getSql() {
  if (_sql) return _sql;
  const { neon } = await import("@neondatabase/serverless");
  _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

export class Database {
  // Create tables if they don't exist yet
  async ensureTables() {
    const sql = await getSql();
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
        file_path TEXT NOT NULL,
        "user" VARCHAR(255) REFERENCES Users(email)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS File_Versions (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        filetype VARCHAR(10) NOT NULL CHECK (filetype IN ('csv', 'excel')),
        file_path TEXT NOT NULL,
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

    // ─── Chart tables (one per chart type) ───
    await sql`
      CREATE TABLE IF NOT EXISTS bargraph (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255),
        filepath TEXT,
        "column" VARCHAR(255),
        values TEXT,
        description TEXT,
        title VARCHAR(500),
        x_axis VARCHAR(255),
        y_axis VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS histogram (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255),
        filepath TEXT,
        "column" VARCHAR(255),
        bins TEXT,
        description TEXT,
        title VARCHAR(500),
        x_axis VARCHAR(255),
        y_axis VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS piechart (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255),
        filepath TEXT,
        "column" VARCHAR(255),
        values TEXT,
        description TEXT,
        title VARCHAR(500),
        x_axis VARCHAR(255),
        y_axis VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS scatterplot (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255),
        filepath TEXT,
        x_column VARCHAR(255),
        y_column VARCHAR(255),
        points TEXT,
        description TEXT,
        title VARCHAR(500),
        x_axis VARCHAR(255),
        y_axis VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS linegraph (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255),
        filepath TEXT,
        x_column VARCHAR(255),
        y_column VARCHAR(255),
        points TEXT,
        description TEXT,
        title VARCHAR(500),
        x_axis VARCHAR(255),
        y_axis VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS boxplot (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255),
        filepath TEXT,
        category_column VARCHAR(255),
        value_column VARCHAR(255),
        boxes TEXT,
        description TEXT,
        title VARCHAR(500),
        x_axis VARCHAR(255),
        y_axis VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS heatmap (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255),
        filepath TEXT,
        columns TEXT,
        matrix TEXT,
        description TEXT,
        title VARCHAR(500),
        x_axis VARCHAR(255),
        y_axis VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS stackedbar (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255),
        filepath TEXT,
        category_column VARCHAR(255),
        group_column VARCHAR(255),
        bars TEXT,
        description TEXT,
        title VARCHAR(500),
        x_axis VARCHAR(255),
        y_axis VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS areachart (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255),
        filepath TEXT,
        x_column VARCHAR(255),
        y_column VARCHAR(255),
        points TEXT,
        description TEXT,
        title VARCHAR(500),
        x_axis VARCHAR(255),
        y_axis VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS bubblechart (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255),
        filepath TEXT,
        x_column VARCHAR(255),
        y_column VARCHAR(255),
        size_column VARCHAR(255),
        points TEXT,
        description TEXT,
        title VARCHAR(500),
        x_axis VARCHAR(255),
        y_axis VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS violinplot (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255),
        filepath TEXT,
        category_column VARCHAR(255),
        value_column VARCHAR(255),
        violins TEXT,
        description TEXT,
        title VARCHAR(500),
        x_axis VARCHAR(255),
        y_axis VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // ─── Migrations: fix tables that were created with an older schema ───

    // Ensure file_path columns are TEXT (not VARCHAR(500))
    try { await sql`ALTER TABLE Files ALTER COLUMN file_path TYPE TEXT`; } catch {}
    try { await sql`ALTER TABLE File_Versions ALTER COLUMN file_path TYPE TEXT`; } catch {}

    // Handle old user_email column — rename to "user" or drop NOT NULL
    try { await sql`ALTER TABLE Files ALTER COLUMN user_email DROP NOT NULL`; } catch {}
    try { await sql`ALTER TABLE File_Versions ALTER COLUMN user_email DROP NOT NULL`; } catch {}
    try { await sql`ALTER TABLE Files RENAME COLUMN user_email TO "user"`; } catch {}
    try { await sql`ALTER TABLE File_Versions RENAME COLUMN user_email TO "user"`; } catch {}

    // Add missing columns to Files (if not created by CREATE TABLE or rename)
    try { await sql`ALTER TABLE Files ADD COLUMN "user" VARCHAR(255) REFERENCES Users(email)`; } catch {}
    try { await sql`ALTER TABLE Files ADD COLUMN filename VARCHAR(255) NOT NULL DEFAULT ''`; } catch {}
    try { await sql`ALTER TABLE Files ADD COLUMN filetype VARCHAR(10) NOT NULL DEFAULT 'csv'`; } catch {}
    try { await sql`ALTER TABLE Files ADD COLUMN file_path TEXT NOT NULL DEFAULT ''`; } catch {}

    // Add missing columns to File_Versions
    try { await sql`ALTER TABLE File_Versions ADD COLUMN "user" VARCHAR(255) REFERENCES Users(email)`; } catch {}
    try { await sql`ALTER TABLE File_Versions ADD COLUMN file_id INTEGER REFERENCES Files(id)`; } catch {}
    try { await sql`ALTER TABLE File_Versions ADD COLUMN position INTEGER NOT NULL DEFAULT 0`; } catch {}
    try { await sql`ALTER TABLE File_Versions ADD COLUMN filename VARCHAR(255) NOT NULL DEFAULT ''`; } catch {}
    try { await sql`ALTER TABLE File_Versions ADD COLUMN filetype VARCHAR(10) NOT NULL DEFAULT 'csv'`; } catch {}
    try { await sql`ALTER TABLE File_Versions ADD COLUMN file_path TEXT NOT NULL DEFAULT ''`; } catch {}
  }

  // Update file content
  async updateFile(fileId, filePath) {
    const sql = await getSql();
    await sql`
      UPDATE Files SET file_path = ${filePath} WHERE id = ${fileId}
    `;
  }

  // Get a single file by id
  async getFile(fileId) {
    const sql = await getSql();
    const rows = await sql`
      SELECT id, filename, filetype, file_path, "user"
      FROM Files
      WHERE id = ${fileId}
    `;
    return rows[0] || null;
  }

  // Get all files for a user
  async getAllFiles(userEmail) {
    const sql = await getSql();
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
    const sql = await getSql();
    const rows = await sql`
      INSERT INTO Files (filename, filetype, file_path, "user")
      VALUES (${filename}, ${filetype}, ${filePath}, ${userEmail})
      RETURNING id, filename, filetype, file_path, "user"
    `;
    return rows[0];
  }

  // Delete a file and all its versions
  async deleteFile(fileId) {
    const sql = await getSql();
    await sql`DELETE FROM File_Versions WHERE file_id = ${fileId}`;
    await sql`DELETE FROM Files WHERE id = ${fileId}`;
  }

  // Get previous versions (drafts) of a file, ordered by position descending (most recent first)
  async getPreviousFiles(fileId) {
    const sql = await getSql();
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
    const sql = await getSql();
    const rows = await sql`
      INSERT INTO File_Versions (filename, filetype, file_path, "user", file_id, position)
      VALUES (${filename}, ${filetype}, ${filePath}, ${userEmail}, ${fileId}, ${position})
      RETURNING id, filename, filetype, file_path, "user", file_id, position
    `;
    return rows[0];
  }

  // Get the latest position number for a file's versions
  async getLatestPosition(fileId) {
    const sql = await getSql();
    const rows = await sql`
      SELECT MAX(position) AS max_pos
      FROM File_Versions
      WHERE file_id = ${fileId}
    `;
    return rows[0]?.max_pos || 0;
  }

  // Delete a specific file version
  async deleteFileVersion(versionId) {
    const sql = await getSql();
    await sql`DELETE FROM File_Versions WHERE id = ${versionId}`;
  }

  // Get a user by email
  async getUser(email) {
    const sql = await getSql();
    const rows = await sql`
      SELECT email, name FROM Users WHERE email = ${email}
    `;
    return rows[0] || null;
  }

  // Create a user (does nothing if email already exists)
  async addUser(email, name) {
    const sql = await getSql();
    const rows = await sql`
      INSERT INTO Users (email, name)
      VALUES (${email}, ${name})
      ON CONFLICT (email) DO NOTHING
      RETURNING email, name
    `;
    return rows[0] || null;
  }
}
