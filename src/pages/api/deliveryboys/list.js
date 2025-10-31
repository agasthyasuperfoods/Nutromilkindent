import { Pool } from "pg";

// Use HR database for delivery boys
const pool = new Pool({
  connectionString: process.env.HR_DATABASE_URL || "postgresql://neondb_owner:npg_JpDouvKn7xW4@ep-ancient-resonance-a1bfgl00-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
});

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          id,
          "Name" as name,
          "Designation" as designation,
          "Gross Salary" as gross_salary,
          area
        FROM public."Milk_point_Employees"
        WHERE LOWER(COALESCE("Designation", '')) = 'delivery boy'
        ORDER BY "Name";
      `;
      
      const { rows } = await client.query(query);
      return res.status(200).json({ ok: true, employees: rows });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error("GET /api/deliveryboys/list error:", e);
    return res.status(500).json({ error: "Failed to load delivery boys" });
  }
}
