// src/lib/db.js
/**
 * Safe DB helper for Next.js + Neon.
 * - Does NOT throw during module import.
 * - Validates DATABASE_URL only when first used (initPool).
 * - Prefers @neondatabase/serverless if available; falls back to pg.Pool.
 * - Exports query(), withClient(), withTransaction(), shutdownPool().
 */

let pool = null;
const usePgFallback = process.env.FORCE_PG === "true";

/** Initialize pool on first use. Throws only here if DATABASE_URL is missing. */
async function initPool() {
  if (pool) return pool;

  const CONNECTION_STRING = process.env.DATABASE_URL;
  if (!CONNECTION_STRING) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local or your hosting environment variables.");
  }

  // Try Neon serverless pool first (dynamic import)
  if (!usePgFallback) {
    try {
      const { createPool } = await import("@neondatabase/serverless");
      pool = globalThis.__NEON_POOL__ ?? createPool(CONNECTION_STRING);
      globalThis.__NEON_POOL__ = pool;
      pool.on?.("error", (e) => console.error("[DB][NEON_POOL] error", e && e.stack ? e.stack : e));
      console.info("[DB] initialized @neondatabase/serverless pool");
      return pool;
    } catch (e) {
      console.warn("[DB] @neondatabase/serverless unavailable — falling back to pg.Pool:", e?.message ?? e);
      // continue to fallback
    }
  }

  // Fallback: pg.Pool
  try {
    const { Pool } = await import("pg");
    const poolConfig = {
      connectionString: CONNECTION_STRING,
      ssl: { rejectUnauthorized: false }, // Neon typically requires SSL
      max: Number(process.env.PG_MAX_CLIENTS || 10),
      connectionTimeoutMillis: Number(process.env.PG_CONN_TIMEOUT_MS || 5000),
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
      allowExitOnIdle: true,
    };
    pool = globalThis.__PG_POOL__ ?? new Pool(poolConfig);
    globalThis.__PG_POOL__ = pool;
    pool.on?.("error", (e) => console.error("[DB][PG_POOL] error", e && e.stack ? e.stack : e));
    console.info("[DB] initialized pg.Pool fallback");
    return pool;
  } catch (err) {
    console.error("[DB] failed to initialize any pooler:", err && err.stack ? err.stack : err);
    throw err;
  }
}

/** Query wrapper */
export async function query(text, params) {
  const p = await initPool();
  return p.query(text, params);
}

/** Get client for transactions or multiple statements */
export async function withClient(fn) {
  const p = await initPool();
  if (typeof p.connect !== "function") {
    // createPool (neon serverless) may return a pool object without connect()
    return fn({ query: (t, params) => p.query(t, params), release: () => {} });
  }
  const client = await p.connect();
  try {
    return await fn(client);
  } finally {
    try { client.release(); } catch (e) { /* ignore */ }
  }
}

/** Simple transaction helper */
export async function withTransaction(fn) {
  return withClient(async (client) => {
    await client.query("BEGIN");
    try {
      const res = await fn(client);
      await client.query("COMMIT");
      return res;
    } catch (err) {
      try { await client.query("ROLLBACK"); } catch (e) { console.warn("[DB] rollback failed", e); }
      throw err;
    }
  });
}

/** Graceful shutdown helper */
export async function shutdownPool() {
  if (!pool) return;
  try {
    if (typeof pool.end === "function") await pool.end();
  } catch (e) {
    console.error("[DB] shutdown error", e && e.stack ? e.stack : e);
  } finally {
    pool = null;
    globalThis.__NEON_POOL__ = null;
    globalThis.__PG_POOL__ = null;
  }
}

/** Default export for backwards compatibility (async init) */
export default (async () => {
  return await initPool();
})();
