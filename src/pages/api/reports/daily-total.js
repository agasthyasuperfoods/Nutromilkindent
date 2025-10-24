// pages/api/reports/daily-total.js
// Purpose: Shows daily total volume (Bulk + Delivery) for short-term forecasting.

import { db } from '../../../lib/db'; // Your actual DB client import

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const dailyTotalQuery = `
      SELECT
          indent_date,
          SUM(quantity) AS daily_total_quantity
      FROM
          public.indents
      WHERE
          EXTRACT(MONTH FROM indent_date) = 9
          AND EXTRACT(YEAR FROM indent_date) = 2025
      GROUP BY
          indent_date
      ORDER BY
          indent_date;
    `;
    
    // Mock Data (first few days of September 2025):
    const mockData = { rows: [
      { indent_date: '2025-09-01T00:00:00.000Z', daily_total_quantity: '758.50' },
      { indent_date: '2025-09-02T00:00:00.000Z', daily_total_quantity: '782.50' },
      { indent_date: '2025-09-03T00:00:00.000Z', daily_total_quantity: '778.50' },
      { indent_date: '2025-09-04T00:00:00.000Z', daily_total_quantity: '788.50' },
      { indent_date: '2025-09-05T00:00:00.000Z', daily_total_quantity: '775.50' },
    ]};

    res.status(200).json(mockData.rows); 
  } catch (error) {
    res.status(500).json({ message: 'Error fetching daily total report' });
  }
}