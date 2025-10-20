// pages/api/monthly-bulk-indents.js
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false } // enable if needed by your host
});

const parseNullableNumber = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { company_id, month_year, quantity_weekdays = null, quantity_saturday = null, quantity_sunday = null, quantity_holidays = null } = req.body ?? {};

  if (!company_id) return res.status(400).json({ error: "company_id is required" });
  if (!month_year) return res.status(400).json({ error: "month_year is required (YYYY-MM-DD)" });

  try {
    const client = await pool.connect();
    try {
      const sql = `
        INSERT INTO public.monthly_bulk_indents
          (company_id, month_year, quantity_weekdays, quantity_saturday, quantity_sunday, quantity_holidays)
        VALUES ($1, $2::date, $3, $4, $5, $6)
        ON CONFLICT (company_id, month_year)
        DO UPDATE SET
          quantity_weekdays = EXCLUDED.quantity_weekdays,
          quantity_saturday = EXCLUDED.quantity_saturday,
          quantity_sunday = EXCLUDED.quantity_sunday,
          quantity_holidays = EXCLUDED.quantity_holidays,
          updated_at = now()
        RETURNING company_id, month_year, quantity_weekdays, quantity_saturday, quantity_sunday, quantity_holidays;
      `;

      const values = [
        company_id,
        month_year,
        parseNullableNumber(quantity_weekdays),
        parseNullableNumber(quantity_saturday),
        parseNullableNumber(quantity_sunday),
        parseNullableNumber(quantity_holidays),
      ];

      const { rows } = await client.query(sql, values);
      return res.status(200).json({ row: rows[0] });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("monthly-bulk-indents error:", err);
    return res.status(500).json({ error: "Failed to upsert monthly indents" });
  }
}
