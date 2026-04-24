import type { ScanResult } from './scan';
import type { Database } from 'better-sqlite3';

/** Scan results expire after 30 days (Vercel KV TTL in seconds). */
const SCAN_TTL_SECONDS = 30 * 24 * 60 * 60;

/** 12 hex chars = 48 bits of randomness ≈ 281 trillion unique IDs. */
function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Persist a scan result and return its shareable ID.
 * Uses Vercel KV in production, SQLite on dev.
 */
export async function saveScan(result: ScanResult): Promise<string> {
  const id = generateId();

  if (process.env.KV_REST_API_URL) {
    const { kv } = await import('@vercel/kv');
    await kv.set(`lr:scan:${id}`, JSON.stringify(result), {
      ex: SCAN_TTL_SECONDS,
    });
    return id;
  }

  return saveScanSqlite(id, result);
}

/**
 * Retrieve a previously saved scan result by ID.
 * Returns null if the ID doesn't exist or has expired.
 */
export async function getScan(id: string): Promise<ScanResult | null> {
  // Validate ID shape to prevent injection / unexpected DB queries
  if (!/^[0-9a-f]{12}$/.test(id)) return null;

  if (process.env.KV_REST_API_URL) {
    const { kv } = await import('@vercel/kv');
    const raw = await kv.get<string | ScanResult>(`lr:scan:${id}`);
    if (!raw) return null;
    try {
      return typeof raw === 'string' ? (JSON.parse(raw) as ScanResult) : raw;
    } catch {
      return null;
    }
  }

  return getScanSqlite(id);
}

// ── SQLite path (dev only) ─────────────────────────────────────────────────

let sqliteDb: Database | null = null;

function getSqliteDb(): Database {
  if (sqliteDb) return sqliteDb;
  // Dynamic require keeps the native module out of the production bundle.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const BetterSqlite = require('better-sqlite3');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('node:path');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('node:fs');
  const dir = path.join(process.cwd(), 'data');
  fs.mkdirSync(dir, { recursive: true });
  sqliteDb = new BetterSqlite(path.join(dir, 'scans.db')) as Database;
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS scans (
      id         TEXT PRIMARY KEY,
      data       TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
  return sqliteDb;
}

function saveScanSqlite(id: string, result: ScanResult): string {
  const db = getSqliteDb();
  db.prepare('INSERT INTO scans (id, data, created_at) VALUES (?, ?, ?)').run(
    id,
    JSON.stringify(result),
    Date.now()
  );
  return id;
}

function getScanSqlite(id: string): ScanResult | null {
  const db = getSqliteDb();
  const row = db
    .prepare('SELECT data FROM scans WHERE id = ?')
    .get(id) as { data: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.data) as ScanResult;
  } catch {
    return null;
  }
}
