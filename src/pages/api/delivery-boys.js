import { Pool } from "pg";

// Use HR database
const pool = new Pool({
  connectionString: process.env.HR_DATABASE_URL || "postgresql://neondb_owner:npg_JpDouvKn7xW4@ep-ancient-resonance-a1bfgl00-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
});

function parseIdFromReq(req) {
  const q = req.query?.id;
  if (Array.isArray(q)) {
    if (q.length === 0) return null;
    const n = Number(q[0]);
    if (Number.isFinite(n)) return n;
    return null;
  }
  if (q !== undefined) {
    const n = Number(q);
    if (Number.isFinite(n)) return n;
  }
  const bodyId = req.body?.employee_id || req.body?.id;
  if (bodyId !== undefined && bodyId !== null && bodyId !== "") {
    const n = Number(bodyId);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export default async function handler(req, res) {
  const method = req.method;

  try {
    const client = await pool.connect();
    try {
      // GET /api/delivery-boys or GET /api/delivery-boys/:id
      if (method === "GET") {
        const id = parseIdFromReq(req);
        if (id) {
          const qSingle = `
            SELECT 
              id, 
              "Name" as name, 
              "Designation" as designation, 
              "Gross Salary" as gross_salary,
              COALESCE(area, '') as area
            FROM public."Milk_point_Employees"
            WHERE id = $1 AND LOWER(COALESCE("Designation", '')) = 'delivery boy'
            LIMIT 1;
          `;
          const { rows } = await client.query(qSingle, [id]);
          if (!rows || rows.length === 0) return res.status(404).json({ error: "Delivery boy not found" });
          return res.status(200).json({ row: rows[0] });
        }

        const q = `
          SELECT 
            id, 
            "Name" as name, 
            "Designation" as designation, 
            "Gross Salary" as gross_salary,
            COALESCE(area, '') as area
          FROM public."Milk_point_Employees"
          WHERE LOWER(COALESCE("Designation", '')) = 'delivery boy'
          ORDER BY "Name" ASC;
        `;
        const { rows } = await client.query(q);
        return res.status(200).json({ rows });
      }

      // POST /api/delivery-boys
      if (method === "POST") {
        const { name, gross_salary = 0, area = '' } = req.body ?? {};

        if (!name || !String(name).trim()) {
          return res.status(400).json({ error: "name is required" });
        }

        const sql = `
          INSERT INTO public."Milk_point_Employees"
            ("Name", "Designation", "Gross Salary", "Location", area)
          VALUES ($1, 'Delivery Boy', $2, 'operations', $3)
          RETURNING id, "Name" as name, "Designation" as designation, "Gross Salary" as gross_salary, COALESCE(area, '') as area;
        `;

        try {
          const { rows } = await client.query(sql, [
            String(name).trim(),
            Number(gross_salary) || 0,
            String(area || '').trim(),
          ]);
          return res.status(201).json({ row: rows[0] });
        } catch (err) {
          console.error("POST /api/delivery-boys error:", err);
          if (err && err.code === "23505") {
            return res.status(409).json({ error: "Duplicate key — conflict", detail: err.detail ?? null });
          }
          throw err;
        }
      }

      // PUT /api/delivery-boys/:id
      if (method === "PUT") {
        const id = parseIdFromReq(req);
        if (!id) return res.status(400).json({ error: "id (numeric) is required" });

        const { name, gross_salary, area } = req.body ?? {};

        if (!name || !String(name).trim()) {
          return res.status(400).json({ error: "name is required" });
        }

        const sql = `
          UPDATE public."Milk_point_Employees"
          SET "Name" = $1,
              "Gross Salary" = $2,
              area = $3
          WHERE id = $4 AND LOWER(COALESCE("Designation", '')) = 'delivery boy'
          RETURNING id, "Name" as name, "Designation" as designation, "Gross Salary" as gross_salary, COALESCE(area, '') as area;
        `;

        try {
          const { rows } = await client.query(sql, [
            String(name).trim(),
            Number(gross_salary) || 0,
            String(area || '').trim(),
            id,
          ]);
          if (!rows || rows.length === 0) return res.status(404).json({ error: "Delivery boy not found" });
          return res.status(200).json({ row: rows[0] });
        } catch (err) {
          console.error("PUT /api/delivery-boys error:", err);
          if (err && err.code === "23505") {
            return res.status(409).json({ error: "Duplicate key — conflict", detail: err.detail ?? null });
          }
          throw err;
        }
      }

      // DELETE /api/delivery-boys/:id
      if (method === "DELETE") {
        const id = parseIdFromReq(req);
        if (!id) return res.status(400).json({ error: "id (numeric) is required" });

        const sql = `
          DELETE FROM public."Milk_point_Employees" 
          WHERE id = $1 AND LOWER(COALESCE("Designation", '')) = 'delivery boy'
          RETURNING *;
        `;
        const { rows } = await client.query(sql, [id]);
        if (!rows || rows.length === 0) return res.status(404).json({ error: "Delivery boy not found" });
        return res.status(200).json({ row: rows[0] });
      }

      res.setHeader("Allow", "GET, POST, PUT, DELETE");
      return res.status(405).json({ error: "Method not allowed" });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("delivery-boys api error:", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}
