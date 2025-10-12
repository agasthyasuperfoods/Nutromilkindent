// src/pages/api/login.js
import bcrypt from "bcryptjs";
import { query } from "../../lib/db";

/**
 * Login for public."Logins"
 * Columns used (exact, case-sensitive): "Empid", "Email", "Password", "Role", "timeStamp"
 *
 * Accepts POST { identifier, password }
 * identifier = Empid (EMP175 / emp175) OR email
 */

function isBcryptHash(s) {
  return typeof s === "string" && /^\$2[aby]\$/.test(s);
}
function safeEquals(a = "", b = "") {
  if (a.length !== b.length) {
    // dummy work to make timing similar
    let d = 0;
    for (let i = 0; i < 50; i++) d += i;
    return false;
  }
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
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

    // Normalize for case-insensitive match
    const idLower = identifier.toLowerCase();

    // Query using exact quoted identifiers in the public schema
    const sql = `
      SELECT "Empid", "Email", "Password", "Role", "timeStamp"
      FROM public."Logins"
      WHERE lower("Empid") = $1 OR lower("Email") = $1
      LIMIT 1
    `;

    const result = await query(sql, [idLower]);
    const row = result?.rows?.[0];

    if (!row) {
      // generic error to avoid user enumeration
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const stored = row.Password;
    if (!stored) {
      console.error("[/api/login] no stored password for", row.Empid ?? row.Email);
      return res.status(500).json({ error: "Authentication not configured for this account" });
    }

    let ok = false;
    if (isBcryptHash(stored)) {
      ok = await bcrypt.compare(password, stored);
    } else {
      // fallback safe compare (if DB currently stores plaintext). Migrate asap.
      ok = safeEquals(String(password), String(stored));
      console.warn(`[AUTH] Non-bcrypt password detected for ${row.Empid || row.Email}. Migrate to bcrypt.`);
    }

    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Return minimal, non-sensitive user info
    const safeUser = {
      id: row.Empid,           // client expects user.id
      empid: row.Empid,
      email: row.Email || null,
      role: row.Role || null,
      timeStamp: row.timeStamp || null,
    };

    return res.status(200).json({ user: safeUser });
  } catch (err) {
    console.error("[/api/login] error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Internal server error" });
  }
}