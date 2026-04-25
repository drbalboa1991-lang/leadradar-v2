/**
 * Early Access storage — tracks beta sign-ups and scan results.
 *
 * First 1,000 businesses get the full pro report FREE in exchange for email.
 * We store: email + scanResult (JSON) + timestamp.
 *
 * Storage strategy (same pattern as scanStore / waitlist):
 *   - Vercel KV when KV_REST_API_URL is set (production)
 *   - SQLite when running locally
 */

import type { ScanResult } from './scan';

export const EARLY_ACCESS_LIMIT = 1000;

// ── Count ──────────────────────────────────────────────────────────────────

export async function getEarlyAccessCount(): Promise<number> {
  if (process.env.KV_REST_API_URL) {
    try {
      const { kv } = await import('@vercel/kv');
      return (await kv.scard('lr:early_access_emails')) as number;
    } catch { return 0; }
  }
  return getSqliteCount();
}

export async function isEarlyAccessOpen(): Promise<boolean> {
  const count = await getEarlyAccessCount();
  return count < EARLY_ACCESS_LIMIT;
}

// ── Save ───────────────────────────────────────────────────────────────────

export async function saveEarlyAccess(
  email:  string,
  result: ScanResult,
): Promise<{ ok: true; alreadyRegistered: boolean }> {
  const normalized = email.toLowerCase().trim();

  if (process.env.KV_REST_API_URL) {
    try {
      const { kv } = await import('@vercel/kv');
      // SADD returns 1 if new, 0 if duplicate
      const added = await kv.sadd('lr:early_access_emails', normalized);
      if (added === 1) {
        // Store scan result keyed by email (TTL: 1 year)
        await kv.set(`lr:ea:${normalized}`, JSON.stringify(result), { ex: 60 * 60 * 24 * 365 });
      }
      return { ok: true, alreadyRegistered: added === 0 };
    } catch (e) {
      console.error('[earlyAccess] KV error:', e);
    }
  }

  return saveEarlyAccessSqlite(normalized, result);
}

// ── SQLite (dev only) ──────────────────────────────────────────────────────

import type { Database } from 'better-sqlite3';

let sqliteDb: Database | null = null;

function getDb(): Database {
  if (sqliteDb) return sqliteDb;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const BetterSqlite = require('better-sqlite3');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('node:path');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs   = require('node:fs');
  const dir  = path.join(process.cwd(), 'data');
  fs.mkdirSync(dir, { recursive: true });
  sqliteDb = new BetterSqlite(path.join(dir, 'early_access.db')) as Database;
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS early_access (
      id         INTEGER PRIMARY KEY,
      email      TEXT UNIQUE NOT NULL COLLATE NOCASE,
      scan_url   TEXT,
      scan_json  TEXT,
      created_at INTEGER NOT NULL
    )
  `);
  return sqliteDb;
}

function getSqliteCount(): number {
  try {
    const db  = getDb();
    const row = db.prepare('SELECT COUNT(*) as c FROM early_access').get() as { c: number };
    return row.c;
  } catch { return 0; }
}

function saveEarlyAccessSqlite(
  email:  string,
  result: ScanResult,
): { ok: true; alreadyRegistered: boolean } {
  const db   = getDb();
  const stmt = db.prepare(
    'INSERT OR IGNORE INTO early_access (email, scan_url, scan_json, created_at) VALUES (?, ?, ?, ?)'
  );
  const res  = stmt.run(email, result.url, JSON.stringify(result), Date.now());
  return { ok: true, alreadyRegistered: res.changes === 0 };
}
