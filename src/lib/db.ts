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

  CREATE TABLE IF NOT EXISTS boms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bom_items (
    id TEXT PRIMARY KEY,
    bomId TEXT NOT NULL,
    partId TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    note TEXT DEFAULT '',
    FOREIGN KEY (bomId) REFERENCES boms(id) ON DELETE CASCADE,
    FOREIGN KEY (partId) REFERENCES parts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS operation_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    entityType TEXT NOT NULL,
    entityId TEXT,
    entityName TEXT,
    details TEXT DEFAULT '',
    operator TEXT DEFAULT 'system',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_parts_code ON parts(code);
  CREATE INDEX IF NOT EXISTS idx_parts_category ON parts(category);
  CREATE INDEX IF NOT EXISTS idx_stock_movements_partId ON stock_movements(partId);
  CREATE INDEX IF NOT EXISTS idx_stock_movements_createdAt ON stock_movements(createdAt);
  CREATE INDEX IF NOT EXISTS idx_favorites_partId ON favorites(partId);
  CREATE INDEX IF NOT EXISTS idx_bom_items_bomId ON bom_items(bomId);
  CREATE INDEX IF NOT EXISTS idx_bom_items_partId ON bom_items(partId);
  CREATE INDEX IF NOT EXISTS idx_operation_logs_createdAt ON operation_logs(createdAt);
  CREATE INDEX IF NOT EXISTS idx_operation_logs_entityType ON operation_logs(entityType);
`);

export default db;
