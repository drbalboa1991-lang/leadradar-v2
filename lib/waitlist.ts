import type { Database } from 'better-sqlite3';

export function isValidEmail(email: string): boolean {
  return (
    typeof email === 'string' &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

export async function addEmail(
  email: string
): Promise<{ ok: true; alreadyRegistered: boolean }> {
  const normalized = email.toLowerCase().trim();

  // Production: Vercel KV (Redis SADD returns 1 if new, 0 if already a member)
  if (process.env.KV_REST_API_URL) {
    const { kv } = await import('@vercel/kv');
    const added = await kv.sadd('lr:waitlist', normalized);
    return { ok: true, alreadyRegistered: added === 0 };
  }

  // Local dev: SQLite (lazy singleton, file persists across restarts)
  return addEmailSqlite(normalized);
}

// ── SQLite path (dev only) ─────────────────────────────────────────────────

let sqliteDb: Database | null = null;

function getSqliteDb(): Database {
  if (sqliteDb) return sqliteDb;
  // Dynamic require so the native module is never loaded in production
  // (Vercel's bundler would otherwise try to package it for Linux)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const BetterSqlite = require('better-sqlite3');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('node:path');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('node:fs');
  const dir = path.join(process.cwd(), 'data');
  fs.mkdirSync(dir, { recursive: true });
  sqliteDb = new BetterSqlite(path.join(dir, 'waitlist.db')) as Database;
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id         INTEGER PRIMARY KEY,
      email      TEXT UNIQUE NOT NULL COLLATE NOCASE,
      created_at INTEGER NOT NULL
    )
  `);
  return sqliteDb;
}

function addEmailSqlite(email: string): { ok: true; alreadyRegistered: boolean } {
  const db = getSqliteDb();
  const stmt = db.prepare('INSERT OR IGNORE INTO waitlist (email, created_at) VALUES (?, ?)');
  const result = stmt.run(email, Date.now());
  return { ok: true, alreadyRegistered: result.changes === 0 };
}
