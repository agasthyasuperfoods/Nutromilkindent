// pages/api/delivery-boys.js
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // set in Vercel/Env
  // ssl: { rejectUnauthorized: false } // uncomment if required by your host
});

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const client = await pool.connect();
    try {
      // Adjust SELECT columns as needed
      const q = `
        SELECT
          employee_id,
          delivery_boy_name,
          delivery_area,
          mobile_number
        FROM public.delivery_boys
        ORDER BY delivery_boy_name ASC
      `;
      const { rows } = await client.query(q);
      return res.status(200).json({ rows });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("delivery-boys error:", err);
    return res.status(500).json({ error: "Failed to fetch delivery boys" });
  }
}
