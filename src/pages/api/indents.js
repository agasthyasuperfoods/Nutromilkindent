// pages/api/indents.js
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
});

export default async function handler(req, res) {
  // Only POST allowed
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, message: "Method Not Allowed" });
  }

  // Attempt to parse body
  const payload = req.body;
  console.log("📥 /api/indents called. Raw payload type:", typeof payload);
  
  // If payload might be a JSON-string due to some middleware issue, try parse
  let entries = payload;
  if (typeof payload === "string") {
    try { 
      entries = JSON.parse(payload); 
    } catch (e) {
      console.error("❌ Failed to JSON.parse request body:", e.message);
      return res.status(400).json({ ok: false, message: "Invalid JSON body" });
    }
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    console.warn("⚠️ Empty payload or non-array");
    return res.status(400).json({ ok: false, message: "No indent entries provided (expecting non-empty array)" });
  }

  let client;
  try {
    client = await pool.connect();
    
    // Log DB target — useful to ensure you are connected to the DB you think you are
    try {
      const dbInfo = await client.query("SELECT current_database() as db, current_user as user");
      console.log("🔗 Connected DB:", dbInfo.rows[0]);
    } catch (dbiErr) {
      console.warn("⚠️ Could not fetch current_database():", dbiErr.message);
    }

    await client.query("BEGIN");
    console.log("✅ Transaction started");

    // Defensive: ensure all entries have a valid date (castable to date)
    const firstDateRaw = entries[0].date;
    
    // We will normalize date to YYYY-MM-DD string
    const normalizeDate = (d) => {
      const dt = new Date(d);
      if (Number.isNaN(dt.getTime())) return null;
      return dt.toISOString().slice(0, 10);
    };
    
    const firstDate = normalizeDate(firstDateRaw);
    if (!firstDate) {
      throw new Error(`Invalid date in payload: ${firstDateRaw}`);
    }

    // Delete only rows matching that date (use ::date to be robust)
    const deleteRes = await client.query(
      `DELETE FROM indents WHERE indent_date::date = $1::date`,
      [firstDate]
    );
    console.log(`🗑️ Deleted ${deleteRes.rowCount} existing entries for date: ${firstDate}`);

    // Insert each entry and collect returned rows
    const insertedRows = [];
    let count = 0;
    let grandTotal = 0;

    const insertSql = `
      INSERT INTO indents (
        indent_date,
        delivery_boy_id,
        company_id,
        company_name,
        quantity,
        item_type,
        cans_liters,
        one_liter_packs,
        five_hundred_ml_packs
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING s_no, indent_date::text as indent_date, delivery_boy_id, company_id, company_name, quantity, item_type;
    `;

    for (const e of entries) {
      // Normalize / validate per-row fields
      const rowDate = normalizeDate(e.date);
      if (!rowDate) throw new Error(`Invalid date in entry: ${JSON.stringify(e).slice(0,200)}`);

      const quantity = Number(e.quantity);
      if (Number.isNaN(quantity) || quantity < 0) throw new Error(`Invalid quantity in entry: ${JSON.stringify(e).slice(0,200)}`);

      const values = [
        rowDate,
        e.delivery_boy_id ?? null,
        e.company_id ?? null,
        (e.company_name ?? "").toString().slice(0,150),
        quantity,
        (e.item_type ?? "REGULAR_MILK").toString().trim(),
        e.cans_liters ? Number(e.cans_liters) : 0,
        e.one_liter_packs ? parseInt(e.one_liter_packs, 10) : 0,
        e.five_hundred_ml_packs ? parseInt(e.five_hundred_ml_packs, 10) : 0,
      ];

      try {
        const r = await client.query(insertSql, values);
        insertedRows.push(r.rows[0]);
        count++;
        grandTotal += quantity;
      } catch (insErr) {
        // Log specific failing entry and propagate
        console.error("❌ Insert failed for entry:", JSON.stringify(e));
        throw insErr;
      }
    }

    await client.query("COMMIT");
    console.log(`✅ Transaction committed. Inserted ${count} rows. Grand total L: ${grandTotal}`);

    return res.status(201).json({
      ok: true,
      message: "Indent submitted successfully",
      insertedCount: count,
      grandTotal,
      insertedRows,
    });
  } catch (err) {
    // Rollback if possible
    try { 
      if (client) await client.query("ROLLBACK"); 
      console.log("↩️ Transaction rolled back"); 
    } catch (rbErr) { 
      console.error("Rollback error:", rbErr); 
    }
    
    console.error("❌ Handler error:", err.message);
    console.error(err.stack);
    
    // Return detailed info for debugging (strip in prod)
    return res.status(500).json({ 
      ok: false, 
      message: err.message || "Internal Server Error", 
      error: err.toString() 
    });
  } finally {
    if (client) client.release();
  }
}
