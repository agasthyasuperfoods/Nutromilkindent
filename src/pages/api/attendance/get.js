import { Pool } from "pg";

// Use HR database for delivery boys attendance
const pool = new Pool({
  connectionString: process.env.HR_DATABASE_URL || "postgresql://neondb_owner:npg_JpDouvKn7xW4@ep-ancient-resonance-a1bfgl00-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
});

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          employeeid,
          name,
          status,
          review,
          date
        FROM public."Milk_point_Employees_Attendance"
        WHERE date = $1;
      `;
      
      const { rows } = await client.query(query, [date]);
      return res.status(200).json({ ok: true, attendance: rows });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error("GET /api/attendance/get error:", e);
    return res.status(500).json({ error: "Failed to get attendance" });
  }
}
