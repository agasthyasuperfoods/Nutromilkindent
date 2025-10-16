// pages/api/bulk-customers.js
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false } // uncomment if your host requires SSL
});

function normalizeDateInput(d) {
  // expect YYYY-MM-DD
  if (!d) return null;
  const iso = d.split("T")[0];
  // basic validation YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const qDate = normalizeDateInput(req.query.date) || new Date().toISOString().slice(0, 10);

  try {
    const client = await pool.connect();
    try {
      // We join monthly_bulk_indents for the month (month_year truncated to month).
      // We then choose quantity based on day-of-week for qDate:
      //   extract(dow from date) -> 0 = Sunday, 6 = Saturday (Postgres)
      // If no monthly record, quantities default to 0.
      const sql = `
        WITH params AS (
          SELECT $1::date AS target_date,
                 date_trunc('month', $1::date)::date AS month_start
        )
        SELECT
          b.company_id,
          b.company_name,
          b.area,
          b.mobile_number,
          COALESCE(
            CASE
              WHEN EXTRACT(DOW FROM (params.target_date))::int = 0 THEN m.quantity_sunday
              WHEN EXTRACT(DOW FROM (params.target_date))::int = 6 THEN m.quantity_saturday
              ELSE m.quantity_weekdays
            END
          , 0) AS quantity
        FROM public.bulk_customers b
        LEFT JOIN public.monthly_bulk_indents m
          ON m.company_id = b.company_id
          AND m.month_year = (SELECT month_start FROM params)
        CROSS JOIN params
        ORDER BY b.company_name NULLS LAST;
      `;

      const { rows } = await client.query(sql, [qDate]);

      // normalize numeric strings - convert numeric types to JS numbers or strings as needed
      const mapped = rows.map((r) => ({
        company_id: r.company_id,
        company_name: r.company_name,
        area: r.area,
        mobile_number: r.mobile_number,
        // quantity is numeric in DB -> cast to Number or string depending on front-end needs
        quantity: r.quantity === null ? 0 : Number(r.quantity),
      }));

      return res.status(200).json({ rows: mapped, date: qDate });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("bulk-customers error:", err);
    return res.status(500).json({ error: "Failed to fetch bulk customers" });
  }
}
