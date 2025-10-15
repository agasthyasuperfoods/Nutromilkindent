// src/pages/api/bulk-customers.js
import { query } from "../../lib/db";

/**
 * GET /api/bulk-customers
 * Optional query param: ?area=<areaName>  (case-insensitive)
 *
 * Response:
 *  { rows: [ { company_id, company_name, area, default_quantity_weekdays } ] }
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { area } = req.query;

    let sql = `
      SELECT company_id, company_name, area, default_quantity_weekdays
      FROM public.bulk_customers
    `;
    const params = [];

    if (area) {
      sql += ` WHERE lower(area) = $1`;
      params.push(String(area).toLowerCase());
    }

    sql += ` ORDER BY company_name ASC LIMIT 200`; // safety limit

    const result = await query(sql, params);
    return res.status(200).json({ rows: result.rows || [] });
  } catch (err) {
    console.error("[/api/bulk-customers] error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ error: "Failed to load bulk customers" });
  }
}
