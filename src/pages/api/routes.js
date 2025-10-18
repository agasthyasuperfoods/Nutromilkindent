// pages/api/routes.js
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false } // enable if required by your host
});

function parseNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async function handler(req, res) {
  const method = req.method;

  try {
    const client = await pool.connect();
    try {
      if (method === "GET") {
        const q = `
          SELECT
            route_id,
            employee_id,
            delivery_boy_name,
            route_area,
            customer_count,
            total_quantity
          FROM public.routes
          ORDER BY route_area NULLS LAST;
        `;
        const { rows } = await client.query(q);
        return res.status(200).json({ rows });
      }

      if (method === "POST") {
        // create route
        const {
          employee_id = null,
          delivery_boy_name = null,
          route_area,
          customer_count = null,
          total_quantity = null,
        } = req.body ?? {};

        if (!route_area || !String(route_area).trim()) {
          return res.status(400).json({ error: "route_area is required" });
        }

        // --- ensure the SERIAL sequence for route_id is in sync with max(route_id)
        // This prevents duplicate-key errors if sequence got out of sync after imports/restores.
        try {
          await client.query(
            `SELECT setval(
               pg_get_serial_sequence('public.routes', 'route_id'),
               COALESCE((SELECT MAX(route_id) FROM public.routes), 0),
               true
             );`
          );
        } catch (seqErr) {
          // not fatal — we'll still attempt the insert and handle any duplicate errors below
          console.warn("Failed to sync route_id sequence:", seqErr);
        }

        const sql = `
          INSERT INTO public.routes
            (employee_id, delivery_boy_name, route_area, customer_count, total_quantity)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *;
        `;
        const params = [
          employee_id ? Number(employee_id) : null,
          delivery_boy_name || null,
          String(route_area).trim(),
          parseNumber(customer_count),
          parseNumber(total_quantity),
        ];

        try {
          const { rows } = await client.query(sql, params);
          return res.status(201).json({ row: rows[0] });
        } catch (err) {
          // Convert DB unique violation into a 409 with message, else rethrow
          if (err && err.code === "23505") {
            return res.status(409).json({ error: "Duplicate key — conflict", detail: err.detail ?? null });
          }
          throw err;
        }
      }

      if (method === "PUT") {
        // update route - route id can come from query id or body.route_id
        const routeIdRaw = req.query?.id ?? req.body?.route_id;
        if (!routeIdRaw) return res.status(400).json({ error: "route_id is required" });

        const routeId = Number(routeIdRaw);
        if (!Number.isFinite(routeId)) return res.status(400).json({ error: "route_id must be a number" });

        const {
          employee_id = null,
          delivery_boy_name = null,
          route_area,
          customer_count = null,
          total_quantity = null,
        } = req.body ?? {};

        if (!route_area || !String(route_area).trim()) {
          return res.status(400).json({ error: "route_area is required" });
        }

        const sql = `
          UPDATE public.routes
          SET employee_id = $1,
              delivery_boy_name = $2,
              route_area = $3,
              customer_count = $4,
              total_quantity = $5
          WHERE route_id = $6
          RETURNING *;
        `;
        const params = [
          employee_id ? Number(employee_id) : null,
          delivery_boy_name || null,
          String(route_area).trim(),
          parseNumber(customer_count),
          parseNumber(total_quantity),
          routeId,
        ];

        const { rows } = await client.query(sql, params);
        if (!rows || rows.length === 0) return res.status(404).json({ error: "Route not found" });
        return res.status(200).json({ row: rows[0] });
      }

      if (method === "DELETE") {
        const routeIdRaw = req.query?.id ?? req.body?.route_id;
        if (!routeIdRaw) return res.status(400).json({ error: "route_id is required" });

        const routeId = Number(routeIdRaw);
        if (!Number.isFinite(routeId)) return res.status(400).json({ error: "route_id must be a number" });

        const sql = `DELETE FROM public.routes WHERE route_id = $1 RETURNING *;`;
        const { rows } = await client.query(sql, [routeId]);
        if (!rows || rows.length === 0) return res.status(404).json({ error: "Route not found" });
        return res.status(200).json({ row: rows[0] });
      }

      // method not allowed
      res.setHeader("Allow", "GET, POST, PUT, DELETE");
      return res.status(405).json({ error: "Method not allowed" });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("routes api error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
