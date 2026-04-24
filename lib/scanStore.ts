import type { ScanResult } from './scan';
import type { Database } from 'better-sqlite3';

/** Scan results expire after 30 days (Vercel KV TTL in seconds). */
const SCAN_TTL_SECONDS = 30 * 24 * 60 * 60;

/** 12 hex chars = 48 bits of randomness ≈ 281 trillion unique IDs. */
function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function saveScan(result: ScanResult): Promise<string> {
  const id = generateId();

  if (process.env.KV_REST_API_URL) {
    try {
      const { kv } = await import('@vercel/kv');
      await kv.set(`lr:scan:${id}`, JSON.stringify(result), { ex: SCAN_TTL_SECONDS });
    } catch (e) {
      // KV write failed — return the ID anyway so the payment flow still works.
      // The share URL won't be retrievable but the in-tab unlock via postMessage will.
      console.error('[scanStore] KV save failed:', e);
    }
    return id;
  }

  try {
    return saveScanSqlite(id, result);
  } catch (e) {
    // SQLite unavailable (e.g. Vercel serverless) — return the ID so the
    // payment flow is not broken. Share URLs won't persist.
    console.error('[scanStore] SQLite save failed:', e);
    return id;
  }
}

export async function getScan(id: string): Promise<ScanResult | null> {
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

/** Mark a scan as paid. Called by the Stripe webhook handler. */
export async function markPaid(id: string): Promise<void> {
  if (!/^[0-9a-f]{12}$/.test(id)) return;

  if (process.env.KV_REST_API_URL) {
    const { kv } = await import('@vercel/kv');
    await kv.set(`lr:paid:${id}`, '1', { ex: SCAN_TTL_SECONDS });
    return;
  }

  markPaidSqlite(id);
}

/** Check whether a scan has been paid for. */
export async function isPaid(id: string): Promise<boolean> {
  if (!/^[0-9a-f]{12}$/.test(id)) return false;

  if (process.env.KV_REST_API_URL) {
    const { kv } = await import('@vercel/kv');
    const val = await kv.get(`lr:paid:${id}`);
    return val !== null;
  }

  return isPaidSqlite(id);
}

// ── SQLite path (dev only) ─────────────────────────────────────────────────

let sqliteDb: Database | null = null;

function getSqliteDb(): Database {
  if (sqliteDb) return sqliteDb;
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
      paid_at    INTEGER,
      created_at INTEGER NOT NULL
    )
  `);
  // Migrate: add paid_at column to databases created before this version
  try {
    sqliteDb.exec(`ALTER TABLE scans ADD COLUMN paid_at INTEGER`);
  } catch {
    // Column already exists — ignore
  }
  return sqliteDb;
}

function saveScanSqlite(id: string, result: ScanResult): string {
  const db = getSqliteDb();
  db.prepare('INSERT INTO scans (id, data, created_at) VALUES (?, ?, ?)').run(
    id, JSON.stringify(result), Date.now()
  );
  return id;
}

function getScanSqlite(id: string): ScanResult | null {
  const db = getSqliteDb();
  const row = db.prepare('SELECT data FROM scans WHERE id = ?').get(id) as { data: string } | undefined;
  if (!row) return null;
  try { return JSON.parse(row.data) as ScanResult; } catch { return null; }
}

function markPaidSqlite(id: string): void {
  const db = getSqliteDb();
  db.prepare('UPDATE scans SET paid_at = ? WHERE id = ?').run(Date.now(), id);
}

function isPaidSqlite(id: string): boolean {
  const db = getSqliteDb();
  const row = db.prepare('SELECT paid_at FROM scans WHERE id = ?').get(id) as { paid_at: number | null } | undefined;
  return !!row?.paid_at;
}
