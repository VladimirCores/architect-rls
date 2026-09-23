/**
 * E2E test backend (single entry point).
 *
 * Seeds a temp SQLite DB with the schema + a known test user, then serves the
 * Hono `app` on PORT/BIND_ADDRESS via `Bun.serve`. Replaces the old separate
 * seed.ts + server.ts helpers.
 *
 * Run: DB_PATH=/tmp/x.db PORT=3001 BIND_ADDRESS=127.0.0.1 bun tests/e2e/server.ts
 */
import { Database } from "bun:sqlite";
import app from "../../backend/src/main.js";

const dbPath = process.env.DB_PATH;
if (!dbPath) {
  console.error("DB_PATH is required");
  process.exit(1);
}
const port = Number(process.env.PORT ?? 3001);
const host = process.env.BIND_ADDRESS ?? "127.0.0.1";

// ── Seed schema + test user (schema mirrors backend/src/infrastructure/db/schemas/app.ts) ──
const conn = new Database(dbPath);
conn.exec("PRAGMA journal_mode = WAL;");
conn.exec("PRAGMA foreign_keys = ON;");
conn.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  disabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS features (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL
);
`);
conn.run(`DELETE FROM users;`);
conn.run(`DELETE FROM features;`);

const now = new Date().toISOString();
const insertFeature = conn.prepare(
  `INSERT INTO features (id, code, name, description, created_at) VALUES (?, ?, ?, ?, ?)`,
);
insertFeature.run("f_export", "radar.export", "Radar Export", "Export radar data", now);
insertFeature.run("f_history", "session.history", "Session History", "Access session history", now);

const hash = await Bun.password.hash("securePassword123");
const insertUser = conn.prepare(
  `INSERT INTO users (id, username, password_hash, role, disabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
);
insertUser.run(
  "123e4567-e89b-12d3-a456-426614174000", // valid UUID (LoginResponse zod)
  "operator_1",
  hash,
  "user",
  0,
  now,
  now,
);
conn.close();
console.log(`\n🌱 Seeded ${dbPath} (operator_1 / securePassword123, role=user)`);

// ── Serve ──
Bun.serve({ port, hostname: host, fetch: app.fetch });
console.log(`🚀 RLS e2e backend listening on http://${host}:${port}`);
