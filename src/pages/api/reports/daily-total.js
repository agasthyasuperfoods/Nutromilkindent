// pages/api/reports/daily-total.js
// Purpose: Shows daily total volume (Bulk + Delivery) for short-term forecasting.

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
    return res.status(400).json({ 
        error: 'Missing required query parameters: month and year' 
    });
  }
  
  // Convert string query parameters to integers for database functions
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  
  let client;
  try {
    client = await db.connect(); // Acquire client from pool

    const dailyTotalQuery = `
      SELECT
          indent_date,
          SUM(quantity) AS daily_total_quantity
      FROM
          public.indents
      WHERE
          EXTRACT(MONTH FROM indent_date) = $1
          AND EXTRACT(YEAR FROM indent_date) = $2
      GROUP BY
          indent_date
      ORDER BY
          indent_date ASC;
    `;
    
    const params = [monthNum, yearNum];

    const result = await client.query(dailyTotalQuery, params);

    return res.status(200).json(result.rows); 
    
  } catch (error) {
    console.error("Database Error in daily-total.js:", error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    if (client) {
      client.release(); // IMPORTANT: Release client back to pool
    }
  }
}