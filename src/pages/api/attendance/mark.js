import { Pool } from "pg";

// Use HR database for delivery boys attendance
const pool = new Pool({
  connectionString: process.env.HR_DATABASE_URL || "postgresql://neondb_owner:npg_JpDouvKn7xW4@ep-ancient-resonance-a1bfgl00-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { employeeId, name, status, review, date } = req.body;

    if (!employeeId || !name || !status || !date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const client = await pool.connect();
    try {
      // Check if attendance already exists for this employee on this date
      const checkQuery = `
        SELECT id FROM public."Milk_point_Employees_Attendance"
        WHERE employeeid = $1 AND date = $2;
      `;
      const { rows: existing } = await client.query(checkQuery, [String(employeeId), date]);

      if (existing.length > 0) {
        // Update existing attendance
        const updateQuery = `
          UPDATE public."Milk_point_Employees_Attendance"
          SET status = $1, review = $2, name = $3
          WHERE employeeid = $4 AND date = $5
          RETURNING *;
        `;
        const { rows } = await client.query(updateQuery, [status, review || null, name, String(employeeId), date]);
        return res.status(200).json({ ok: true, message: "Attendance updated", data: rows[0] });
      } else {
        // Insert new attendance
        const insertQuery = `
          INSERT INTO public."Milk_point_Employees_Attendance" (employeeid, name, status, review, date)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *;
        `;
        const { rows } = await client.query(insertQuery, [String(employeeId), name, status, review || null, date]);
        return res.status(200).json({ ok: true, message: "Attendance marked", data: rows[0] });
      }
    } finally {
      client.release();
    }
  } catch (e) {
    console.error("POST /api/attendance/mark error:", e);
    return res.status(500).json({ error: "Failed to mark attendance" });
  }
}
