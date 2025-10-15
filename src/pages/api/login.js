// src/pages/api/login.js
import bcrypt from "bcryptjs";
import crypto from "crypto"; // Imported for timingSafeEqual
import { query } from "../../lib/db";

/**
 * Login handler — Empid-only authentication
 * Columns used (exact, case-sensitive): "Empid", "Password", "Role", "timeStamp"
 *
 * Accepts POST { identifier, password }
 * identifier is treated as Empid only (case-insensitive).
 */

/** Simple bcrypt-hash heuristic */
function isBcryptHash(s) {
  return typeof s === "string" && s.length === 60 && s.startsWith("$2");
}

/** Constant-time safe comparison for non-bcrypt fallback */
function timingSafeEqual(a = "", b = "") {
  const aBuffer = Buffer.from(String(a));
  const bBuffer = Buffer.from(String(b));

  if (aBuffer.length !== bBuffer.length) {
    // compare b to itself to keep timing similar
    crypto.timingSafeEqual(bBuffer, bBuffer);
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { identifier: rawIdentifier = "", password: rawPassword = "" } = req.body || {};
    const identifier = String(rawIdentifier).trim();
    const password = String(rawPassword).trim();

    if (!identifier || !password) {
      return res.status(400).json({ error: "Missing identifier or password" });
    }

    // Use identifier strictly as Empid (case-insensitive)
    const idLower = identifier.toLowerCase();

    const sql = `
      SELECT "Empid", "Password", "Role", "timeStamp"
      FROM public."Logins"
      WHERE lower("Empid") = $1
      LIMIT 1
    `;

    const result = await query(sql, [idLower]);
    const row = result?.rows?.[0];

    if (!row) {
      // Generic message to avoid user enumeration
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const storedPassword = row.Password;
    if (!storedPassword) {
      console.error(`[/api/login] No stored password for ${row.Empid}`);
      return res.status(500).json({ error: "Authentication not configured for this account" });
    }

    let passwordsMatch = false;
    if (isBcryptHash(storedPassword)) {
      passwordsMatch = await bcrypt.compare(password, storedPassword);
    } else {
      // Fallback for plaintext passwords. Migrate these to bcrypt ASAP.
      passwordsMatch = timingSafeEqual(password, storedPassword);
      console.warn(`[AUTH] Non-bcrypt password detected for ${row.Empid}. Migrate to bcrypt.`);
    }

    if (!passwordsMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Minimal safe payload returned
    const safeUser = {
      id: row.Empid,
      empid: row.Empid,
      role: row.Role || null,
      timeStamp: row.timeStamp || null,
    };

    return res.status(200).json({ user: safeUser });
  } catch (err) {
    console.error("[/api/login] error:", err.stack || err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
