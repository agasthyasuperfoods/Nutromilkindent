// pages/api/bulk-customers.js
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false } // uncomment if your host requires SSL
});

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const client = await pool.connect();
    try {
      // Return only columns from bulk_customers that we need in the UI.
      const sql = `
        SELECT
          company_id,
          company_name,
          area,
          mobile_number,
          indent_type,
          payment_term
        FROM public.bulk_customers
        ORDER BY company_name NULLS LAST;
      `;

      const { rows } = await client.query(sql);

      const mapped = rows.map((r) => ({
        company_id: r.company_id,
        company_name: r.company_name,
        area: r.area,
        mobile_number: r.mobile_number,
        indent_type: r.indent_type,
        payment_term: r.payment_term,
      }));

      return res.status(200).json({ rows: mapped });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("bulk-customers error:", err);
    return res.status(500).json({ error: "Failed to fetch bulk customers" });
  }
}
