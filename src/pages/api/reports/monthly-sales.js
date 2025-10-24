// pages/api/reports/monthly-sales.js
// Purpose: Calculates total volume month-over-month for high-level growth tracking.

// Using the direct pg Pool pattern established in delivery-boys API
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
    
    const monthlySalesQuery = `
      SELECT
          DATE_TRUNC('month', indent_date) AS sales_month,
          SUM(quantity) AS total_monthly_volume
      FROM
          public.indents
      WHERE
          -- Selects the current month and the previous month for MoM comparison
          DATE_TRUNC('month', indent_date) = MAKE_DATE($2::int, $1::int, 1) 
          OR DATE_TRUNC('month', indent_date) = (MAKE_DATE($2::int, $1::int, 1) - interval '1 month')
      GROUP BY
          sales_month
      ORDER BY
          sales_month DESC;
    `;
    
    // Parameters: [month, year]
    const params = [monthNum, yearNum];

    const result = await client.query(monthlySalesQuery, params);

    return res.status(200).json(result.rows); 
    
  } catch (error) {
    console.error("Database Error in monthly-sales.js:", error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    if (client) {
      client.release(); // IMPORTANT: Release client back to pool
    }
  }
}
