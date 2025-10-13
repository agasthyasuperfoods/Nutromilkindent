// src/pages/api/login.js
import bcrypt from "bcryptjs";
import crypto from "crypto"; // Imported for timingSafeEqual
import { query } from "../../lib/db";

/**
 * Login for public."Logins"
 * Columns used (exact, case-sensitive): "Empid", "Email", "Password", "Role", "timeStamp"
 *
 * Accepts POST { identifier, password }
 * identifier = Empid (EMP175 / emp175) OR email
 */

/**
 * Checks if a string is likely a bcrypt hash.
 * A simple heuristic based on prefix and length.
 * @param {string} s The string to check.
 * @returns {boolean}
 */
function isBcryptHash(s) {
  return typeof s === "string" && s.length === 60 && s.startsWith("$2");
}

/**
 * A constant-time string comparison to prevent timing attacks.
 * @param {string} a The first string (e.g., user-provided password).
 * @param {string} b The second string (e.g., stored password).
 * @returns {boolean} True if the strings are equal.
 */
function timingSafeEqual(a = "", b = "") {
  // Use Node.js's built-in, optimized, and secure implementation.
  // It requires buffers of the same length to run.
  const aBuffer = Buffer.from(String(a));
  const bBuffer = Buffer.from(String(b));

  if (aBuffer.length !== bBuffer.length) {
    // To prevent leaking length information, we compare the stored hash against itself.
    // This ensures the function takes a consistent amount of time for incorrect passwords.
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
      // Generic error to avoid user enumeration
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const storedPassword = row.Password;
    if (!storedPassword) {
      console.error(`[/api/login] No stored password for ${row.Empid ?? row.Email}`);
      return res.status(500).json({ error: "Authentication not configured for this account" });
    }

    let passwordsMatch = false;
    if (isBcryptHash(storedPassword)) {
      passwordsMatch = await bcrypt.compare(password, storedPassword);
    } else {
      // Fallback for plaintext passwords. MIGRATE TO BCRYPT ASAP.
      passwordsMatch = timingSafeEqual(password, storedPassword);
      // FIX: Removed invalid Unicode characters from the warning message.
      console.warn(`[AUTH] Non-bcrypt password detected for ${row.Empid || row.Email}. Migrate to bcrypt.`);
    }

    if (!passwordsMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Return minimal, non-sensitive user info
    const safeUser = {
      id: row.Empid,
      empid: row.Empid,
      email: row.Email || null,
      role: row.Role || null,
      timeStamp: row.timeStamp || null,
    };

    return res.status(200).json({ user: safeUser });
  } catch (err) {
    console.error("[/api/login] error:", err.stack || err);
    return res.status(500).json({ error: "Internal server error" });
  }
}