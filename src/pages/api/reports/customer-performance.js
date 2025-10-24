// pages/api/reports/customer-performance.js
// Purpose: Ranks bulk customers by total volume, average daily indent, and frequency.

import { Pool } from "pg";

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ error: 'Missing required query parameters: month and year' });
  }

  // Convert string query parameters to integers for database functions
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  let client;
  try {
    client = await db.connect(); // Acquire client from pool

    const customerPerformanceQuery = `
      SELECT
          company_name,
          SUM(quantity) AS total_quantity_for_month,
          ROUND(AVG(quantity), 2) AS average_daily_indent,
          COUNT(DISTINCT indent_date) AS days_indented
      FROM
          public.indents
      WHERE
          EXTRACT(MONTH FROM indent_date) = $1
          AND EXTRACT(YEAR FROM indent_date) = $2
          AND company_id IS NOT NULL -- CRUCIAL: Excludes delivery boy entries
      GROUP BY
          company_name
      ORDER BY
          total_quantity_for_month DESC;
    `;
    
    const params = [monthNum, yearNum];

    const result = await client.query(customerPerformanceQuery, params);

    return res.status(200).json(result.rows); 
  } catch (error) {
    console.error("Database Error in customer-performance.js:", error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    if (client) {
      client.release(); // IMPORTANT: Release client back to pool
    }
  }
}