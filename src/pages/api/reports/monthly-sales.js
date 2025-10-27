// pages/api/reports/monthly-sales.js
import { Pool } from 'pg';

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * normalizeMonth(maybeDate) -> { iso, label } where label = 'YYYY-MM'
 */
const normalizeMonth = (maybeDate) => {
  if (!maybeDate) return null;
  const d = maybeDate instanceof Date ? maybeDate : new Date(maybeDate);
  if (Number.isNaN(d.getTime())) return null;
  return {
    iso: d.toISOString(),
    label: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  };
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { month, year } = req.query;
  const monthNum = Number.parseInt(month, 10); // 1..12
  const yearNum = Number.parseInt(year, 10);
  if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12 || !Number.isInteger(yearNum)) {
    return res.status(400).json({ error: 'Invalid or missing query parameters: month (1-12) and year required' });
  }

  let client;
  try {
    client = await db.connect();

    // Compute month bounds (date-safe)
    const boundsQ = `
      SELECT
        make_date($1::int, $2::int, 1)::date AS month_start,
        (make_date($1::int, $2::int, 1) - INTERVAL '1 month')::date AS prev_month_start,
        (make_date($1::int, $2::int, 1) + INTERVAL '1 month')::date AS next_month_start
    `;
    const boundsRes = await client.query(boundsQ, [yearNum, monthNum]);
    const bounds = boundsRes.rows[0];

    // 1) Monthly totals for prev + selected month window
    const monthlyQuery = `
      SELECT
        date_trunc('month', indent_date)::date AS sales_month,
        SUM(COALESCE(quantity, 0))::numeric(14,2) AS total_monthly_volume,
        COUNT(*) AS row_count
      FROM public.indents
      WHERE indent_date >= $1
        AND indent_date < $2
      GROUP BY sales_month
      ORDER BY sales_month DESC;
    `;
    const monthlyRes = await client.query(monthlyQuery, [bounds.prev_month_start, bounds.next_month_start]);
    const monthlyRows = (monthlyRes.rows || []).map(r => {
      const nm = normalizeMonth(r.sales_month);
      return {
        sales_month_iso: nm ? nm.iso : null,
        sales_month_label: nm ? nm.label : null,
        total_monthly_volume: r.total_monthly_volume === null ? null : Number(r.total_monthly_volume),
        row_count: Number(r.row_count || 0)
      };
    });

    const selectedLabel = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
    const selectedRow = monthlyRows.find(r => r.sales_month_label === selectedLabel) || null;

    // previous month label and row
    const prevDate = new Date(Date.UTC(yearNum, monthNum - 1, 1));
    prevDate.setUTCMonth(prevDate.getUTCMonth() - 1);
    const prevLabel = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}`;
    const prevRow = monthlyRows.find(r => r.sales_month_label === prevLabel) || null;

    // 1a) Ensure top-level total_monthly_volume is always present:
    // If selectedRow exists use that.total_monthly_volume, otherwise compute an explicit aggregate for the selected month window.
    let topTotal = selectedRow && Number.isFinite(selectedRow.total_monthly_volume) ? Number(selectedRow.total_monthly_volume) : null;
    if (topTotal === null) {
      const topAggQ = `
        SELECT SUM(COALESCE(quantity,0))::numeric(14,2) AS total_for_selected_month
        FROM public.indents
        WHERE indent_date >= $1
          AND indent_date < $2;
      `;
      const topAggRes = await client.query(topAggQ, [bounds.month_start, bounds.next_month_start]);
      const aggValue = topAggRes.rows?.[0]?.total_for_selected_month;
      topTotal = aggValue === null ? 0 : Number(aggValue);
    }

    // 2) Daily totals for selected month (month_start .. next_month_start)
    const dailyQuery = `
      SELECT
        indent_date::date AS day,
        SUM(COALESCE(quantity, 0))::numeric(14,2) AS daily_total_quantity
      FROM public.indents
      WHERE indent_date >= $1
        AND indent_date < $2
      GROUP BY day
      ORDER BY day ASC;
    `;
    const dailyRes = await client.query(dailyQuery, [bounds.month_start, bounds.next_month_start]);
    const dailyRows = (dailyRes.rows || []).map(r => ({
      indent_date: r.day ? (r.day instanceof Date ? r.day.toISOString() : new Date(r.day).toISOString()) : null,
      daily_total_quantity: r.daily_total_quantity === null ? null : Number(r.daily_total_quantity)
    }));

    // 3) Customer performance (company_id NOT NULL)
    const customerQuery = `
      SELECT
        company_id,
        company_name,
        SUM(COALESCE(quantity,0))::numeric(14,2) AS total_quantity_for_month,
        ROUND(AVG(COALESCE(quantity,0))::numeric, 2) AS average_daily_indent,
        COUNT(DISTINCT indent_date) AS days_indented
      FROM public.indents
      WHERE indent_date >= $1
        AND indent_date < $2
        AND company_id IS NOT NULL
      GROUP BY company_id, company_name
      ORDER BY total_quantity_for_month DESC;
    `;
    const customerRes = await client.query(customerQuery, [bounds.month_start, bounds.next_month_start]);
    const customerRows = (customerRes.rows || []).map(r => ({
      company_id: r.company_id,
      company_name: r.company_name,
      total_quantity_for_month: r.total_quantity_for_month === null ? null : Number(r.total_quantity_for_month),
      average_daily_indent: r.average_daily_indent === null ? null : Number(r.average_daily_indent),
      days_indented: Number(r.days_indented || 0)
    }));

    // 4) Delivery boys performance (delivery_boy_id NOT NULL)
    const deliveryQuery = `
      SELECT
        delivery_boy_id,
        SUM(COALESCE(quantity,0))::numeric(14,2) AS total_quantity_for_month,
        COUNT(*) AS deliveries_count
      FROM public.indents
      WHERE indent_date >= $1
        AND indent_date < $2
        AND delivery_boy_id IS NOT NULL
      GROUP BY delivery_boy_id
      ORDER BY total_quantity_for_month DESC;
    `;
    const deliveryRes = await client.query(deliveryQuery, [bounds.month_start, bounds.next_month_start]);
    const deliveryRows = (deliveryRes.rows || []).map(r => ({
      delivery_boy_id: r.delivery_boy_id,
      total_quantity_for_month: r.total_quantity_for_month === null ? null : Number(r.total_quantity_for_month),
      deliveries_count: Number(r.deliveries_count || 0)
    }));

    // 4a) overall delivery total (sum of quantities for delivery entries)
    const deliveryTotalQ = `
      SELECT SUM(COALESCE(quantity,0))::numeric(14,2) AS delivery_total
      FROM public.indents
      WHERE indent_date >= $1
        AND indent_date < $2
        AND delivery_boy_id IS NOT NULL;
    `;
    const deliveryTotalRes = await client.query(deliveryTotalQ, [bounds.month_start, bounds.next_month_start]);
    const deliveryTotal = deliveryTotalRes.rows?.[0]?.delivery_total;
    const total_delivery_volume = deliveryTotal === null ? 0 : Number(deliveryTotal);

    // Compose response payload
    const payload = {
      month: monthNum,
      year: yearNum,
      bounds: {
        prev_month_start: bounds.prev_month_start ? bounds.prev_month_start.toISOString().slice(0,10) : null,
        month_start: bounds.month_start ? bounds.month_start.toISOString().slice(0,10) : null,
        next_month_start: bounds.next_month_start ? bounds.next_month_start.toISOString().slice(0,10) : null
      },
      total_monthly_volume: topTotal, // top-level guaranteed number (0 if none)
      monthly: {
        selected_month_present: Boolean(selectedRow),
        selected_month: selectedRow,
        previous_month: prevRow,
        rows: monthlyRows
      },
      daily: dailyRows,
      customer: customerRows,
      delivery: {
        rows: deliveryRows,
        total_delivery_volume
      }
    };

    return res.status(200).json(payload);
  } catch (err) {
    console.error('monthly-sales combined API error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  } finally {
    if (client) client.release();
  }
}
