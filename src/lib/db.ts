import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "inventory.db");

// Ensure data directory exists
import fs from "fs";
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS parts (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT '',
    package TEXT DEFAULT '',
    brand TEXT DEFAULT '',
    model TEXT DEFAULT '',
    unit TEXT DEFAULT 'pcs',
    minStock INTEGER DEFAULT 0,
    location TEXT DEFAULT '',
    note TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stock (
    id TEXT PRIMARY KEY,
    partId TEXT UNIQUE NOT NULL,
    quantity INTEGER DEFAULT 0,
    updatedAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (partId) REFERENCES parts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    partId TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    operator TEXT DEFAULT '',
    reason TEXT DEFAULT '',
    code TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (partId) REFERENCES parts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY,
    partId TEXT UNIQUE NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (partId) REFERENCES parts(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_parts_code ON parts(code);
  CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category);
  CREATE INDEX IF NOT EXISTS idx_stock_movements_partId ON stock_movements(partId);
  CREATE INDEX IF NOT EXISTS idx_stock_movements_createdAt ON stock_movements(createdAt);
  CREATE INDEX IF NOT EXISTS idx_favorites_partId ON favorites(partId);
`);

export default db;
