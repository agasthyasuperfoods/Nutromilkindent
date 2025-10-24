// pages/api/indent-exists.js

import { query } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'Date parameter is required' });
  }

  try {
    // Check if ANY indent record exists for the given date
    const result = await query(
      `SELECT EXISTS(
         SELECT 1 
         FROM indents 
         WHERE indent_date = $1 
         LIMIT 1
      ) AS exists`,
      [date]
    );

    const exists = result.rows[0]?.exists === true;

    // Return a simple JSON object
    return res.status(200).json({ exists });

  } catch (error) {
    console.error('Indent status check failed:', error.message);
    return res.status(500).json({ error: 'Internal server error while checking indent status.' });
  }
}