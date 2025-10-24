
// pages/api/reports/monthly-sales.js
// Purpose: Calculates total volume month-over-month for high-level growth tracking.

import { db } from '../../../lib/db'; // Your actual DB client import

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const monthlySalesQuery = `
      SELECT
          DATE_TRUNC('month', indent_date) AS sales_month,
          SUM(quantity) AS total_monthly_volume
      FROM
          public.indents
      GROUP BY
          sales_month
      ORDER BY
          sales_month DESC;
    `;
    
    // Mock Data for demonstration:
    const mockData = { rows: [
      { sales_month: '2025-09-01T00:00:00.000Z', total_monthly_volume: '13885.00' }, 
      { sales_month: '2025-08-01T00:00:00.000Z', total_monthly_volume: '11500.00' }, 
    ]};

    res.status(200).json(mockData.rows); 
    
  } catch (error) {
    res.status(500).json({ message: 'Error fetching monthly aggregate data' });
  }
}