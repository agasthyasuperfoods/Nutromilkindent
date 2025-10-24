// pages/api/reports/customer-performance.js
// Purpose: Ranks bulk customers by total volume, average daily indent, and frequency.

import { db } from '../../../lib/db'; // Your actual DB client import

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const customerPerformanceQuery = `
      SELECT
          company_name,
          SUM(quantity) AS total_quantity_for_month,
          ROUND(AVG(quantity), 2) AS average_daily_indent,
          COUNT(DISTINCT indent_date) AS days_indented
      FROM
          public.indents
      WHERE
          company_id IS NOT NULL -- CRUCIAL: Excludes delivery boy entries
      GROUP BY
          company_name
      ORDER BY
          total_quantity_for_month DESC;
    `;
    
    // In production, run: const result = await db.query(customerPerformanceQuery);
    // Mock Data for demonstration:
    const mockData = { rows: [
      { company_name: 'Delhi Mithai', total_quantity_for_month: '5640.00', average_daily_indent: '188.00', days_indented: 30 },
      { company_name: 'Dazn Company', total_quantity_for_month: '3490.00', average_daily_indent: '116.33', days_indented: 30 },
      { company_name: 'Pragathinagar', total_quantity_for_month: '2690.00', average_daily_indent: '89.67', days_indented: 30 },
      { company_name: 'Daspala', total_quantity_for_month: '2610.00', average_daily_indent: '87.00', days_indented: 30 },
      { company_name: 'Pappusetu', total_quantity_for_month: '1660.00', average_daily_indent: '55.33', days_indented: 30 },
      { company_name: 'Phoenix', total_quantity_for_month: '880.00', average_daily_indent: '29.33', days_indented: 30 },
      { company_name: 'Zee School', total_quantity_for_month: '173.00', average_daily_indent: '21.62', days_indented: 8 },
      { company_name: 'Navanami', total_quantity_for_month: '121.00', average_daily_indent: '4.03', days_indented: 30 },
    ]};

    res.status(200).json(mockData.rows); 
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customer performance data' });
  }
}