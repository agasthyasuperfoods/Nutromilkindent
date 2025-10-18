// pages/api/delivery-boys/[[...id]].js
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false } // enable if required by your host
});

/**
 * Parse numeric id from a variety of places:
 * - req.query.id may be undefined, ['3'] or '3' depending on route.
 * - req.body.employee_id may be present.
 */
function parseIdFromReq(req) {
  const q = req.query?.id;
  if (Array.isArray(q)) {
    if (q.length === 0) return null;
    // support URLs like /api/delivery-boys/3  => ['3']
    const n = Number(q[0]);
    if (Number.isFinite(n)) return n;
    return null;
  }
  if (q !== undefined) {
    const n = Number(q);
    if (Number.isFinite(n)) return n;
  }
  const bodyId = req.body?.employee_id;
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
      // GET /api/delivery-boys or GET /api/delivery-boys/:id (optional)
      if (method === "GET") {
        // if id provided, return single row; else list
        const id = parseIdFromReq(req);
        if (id) {
          const qSingle = `
            SELECT employee_id, delivery_boy_name, delivery_area, mobile_number
            FROM public.delivery_boys
            WHERE employee_id = $1
            LIMIT 1;
          `;
          const { rows } = await client.query(qSingle, [id]);
          if (!rows || rows.length === 0) return res.status(404).json({ error: "Delivery partner not found" });
          return res.status(200).json({ row: rows[0] });
        }

        const q = `
          SELECT employee_id, delivery_boy_name, delivery_area, mobile_number
          FROM public.delivery_boys
          ORDER BY delivery_boy_name ASC;
        `;
        const { rows } = await client.query(q);
        return res.status(200).json({ rows });
      }

      // POST /api/delivery-boys
      if (method === "POST") {
        const { delivery_boy_name, delivery_area = null, mobile_number = null } = req.body ?? {};

        if (!delivery_boy_name || !String(delivery_boy_name).trim()) {
          return res.status(400).json({ error: "delivery_boy_name is required" });
        }

        const sql = `
          INSERT INTO public.delivery_boys
            (delivery_boy_name, delivery_area, mobile_number)
          VALUES ($1, $2, $3)
          RETURNING *;
        `;

        try {
          const { rows } = await client.query(sql, [
            String(delivery_boy_name).trim(),
            delivery_area ? String(delivery_area).trim() : null,
            mobile_number ? String(mobile_number).trim() : null,
          ]);
          return res.status(201).json({ row: rows[0] });
        } catch (err) {
          if (err && err.code === "23505") {
            return res.status(409).json({ error: "Duplicate key — conflict", detail: err.detail ?? null });
          }
          throw err;
        }
      }

      // PUT /api/delivery-boys/:id  OR PUT /api/delivery-boys with body.employee_id
      if (method === "PUT") {
        const id = parseIdFromReq(req);
        if (!id) return res.status(400).json({ error: "employee_id (numeric) is required" });

        const { delivery_boy_name, delivery_area = null, mobile_number = null } = req.body ?? {};

        if (!delivery_boy_name || !String(delivery_boy_name).trim()) {
          return res.status(400).json({ error: "delivery_boy_name is required" });
        }

        const sql = `
          UPDATE public.delivery_boys
          SET delivery_boy_name = $1,
              delivery_area = $2,
              mobile_number = $3
          WHERE employee_id = $4
          RETURNING *;
        `;

        try {
          const { rows } = await client.query(sql, [
            String(delivery_boy_name).trim(),
            delivery_area ? String(delivery_area).trim() : null,
            mobile_number ? String(mobile_number).trim() : null,
            id,
          ]);
          if (!rows || rows.length === 0) return res.status(404).json({ error: "Delivery partner not found" });
          return res.status(200).json({ row: rows[0] });
        } catch (err) {
          if (err && err.code === "23505") {
            return res.status(409).json({ error: "Duplicate key — conflict", detail: err.detail ?? null });
          }
          throw err;
        }
      }

      // DELETE /api/delivery-boys/:id  OR DELETE with body.employee_id
      if (method === "DELETE") {
        const id = parseIdFromReq(req);
        if (!id) return res.status(400).json({ error: "employee_id (numeric) is required" });

        const sql = `DELETE FROM public.delivery_boys WHERE employee_id = $1 RETURNING *;`;
        const { rows } = await client.query(sql, [id]);
        if (!rows || rows.length === 0) return res.status(404).json({ error: "Delivery partner not found" });
        return res.status(200).json({ row: rows[0] });
      }

      // method not allowed
      res.setHeader("Allow", "GET, POST, PUT, DELETE");
      return res.status(405).json({ error: "Method not allowed" });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("delivery-boys api error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
