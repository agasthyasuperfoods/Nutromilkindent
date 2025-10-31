// components/ReportsMain.jsx
import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

/* Palette & styles (kept consistent) */
const PRIMARY_ACCENT = '#d97706';
const SUCCESS_COLOR = '#059669';
const DANGER_COLOR = '#dc2626';
const INFO_COLOR = '#1d4ed8';
const BASE_BG = '#f8f9fa';
const CARD_BG = '#ffffff';
const DARK_TEXT = '#374151';
const TABLE_HEAD_BG = '#fef3c7';
const ALT_ROW_BG = '#fffdf5';
const NO_DATA_TEXT_COLOR = '#9ca3af';

const styles = {
  container: { padding: '8px', marginTop: '5rem', marginBottom: '5rem', fontFamily: 'Inter, Arial, sans-serif', backgroundColor: BASE_BG },
  header: { color: DARK_TEXT, paddingBottom: '6px', fontSize: '1.4em' },
  selector: { padding: '8px 12px', margin: '10px 0', border: `1px solid ${PRIMARY_ACCENT}`, borderRadius: '6px', backgroundColor: ALT_ROW_BG, color: DARK_TEXT, fontSize: '0.9em', width: '100%', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  card: { padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', backgroundColor: CARD_BG, marginTop: 12 },
  metricBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: ALT_ROW_BG, borderRadius: '4px', borderLeft: `5px solid ${PRIMARY_ACCENT}` },
  metricValue: { fontSize: '1.3em', fontWeight: 'bold', color: PRIMARY_ACCENT },
  metricLabel: { fontSize: '0.8em', color: '#6b7280' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '8px' },
  th: { padding: '6px 4px', borderBottom: `2px solid ${PRIMARY_ACCENT}`, textAlign: 'left', backgroundColor: TABLE_HEAD_BG, fontSize: '0.75em', color: DARK_TEXT },
  td: { padding: '6px 4px', borderBottom: '1px solid #f3f4f6', textAlign: 'left', fontSize: '0.8em', color: DARK_TEXT }
};

/* Helpers */
const generateMonths = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    months.push({ value: `${year}-${month}`, label: d.toLocaleString('en-US', { year: 'numeric', month: 'long' }) });
  }
  return months;
};
const ALL_MONTHS = generateMonths();

const isValidNumber = (v, requirePositive = false) => {
  if (v === null || typeof v === 'undefined') return false;
  const n = Number(v);
  if (!Number.isFinite(n)) return false;
  return requirePositive ? n > 0 : true;
};

const toMonthLabel = (isoOrDateOrLabel) => {
  try {
    if (!isoOrDateOrLabel) return null;
    if (typeof isoOrDateOrLabel === 'string' && /^\d{4}-\d{2}$/.test(isoOrDateOrLabel)) {
      const [y, m] = isoOrDateOrLabel.split('-').map(Number);
      const d = new Date(Date.UTC(y, m - 1, 1));
      return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    }
    const d = new Date(isoOrDateOrLabel);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  } catch (e) {
    return null;
  }
};

// Format a daily iso date to a compact X-axis label — e.g., 'Oct 05' or '05'
const formatDayLabel = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // Show day numeric and short month when month has few data points
  return `${String(d.getUTCDate()).padStart(2, '0')} ${d.toLocaleString('en-US', { month: 'short' })}`;
};

// Convert payload.daily into chart-friendly data; ensure every day of month can be shown if you want full x-axis - here we use only existing days.
const prepareChartData = (daily = []) => {
  // daily items expected: { indent_date: ISO, daily_total_quantity: number }
  if (!Array.isArray(daily) || daily.length === 0) return [];
  return daily.map(d => ({
    date: d.indent_date ? (d.indent_date.slice(0, 10)) : null,
    label: d.indent_date ? formatDayLabel(d.indent_date) : '',
    value: isValidNumber(d.daily_total_quantity) ? Number(d.daily_total_quantity) : 0
  }));
};

export default function ReportsMain() {
  const initialMonth = ALL_MONTHS[0].value;
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [payload, setPayload] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const [year, month] = selectedMonth.split('-');
    const yearNum = Number(year);
    const monthNum = Number(month);
    setIsLoading(true);
    setError(null);
    setPayload(null);

    (async () => {
      try {
        const res = await fetch(`/api/reports/monthly-sales?month=${monthNum}&year=${yearNum}`, { cache: 'no-store' });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`API ${res.status}: ${text}`);
        }
        const data = await res.json();
        setPayload(data || null);
      } catch (err) {
        setError(err.message || 'Failed to fetch reports');
        setPayload(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [selectedMonth]);

  // Monthly rows normalization: prefer payload.monthly.selected_month, but fall back to monthly.rows
  const getMonthlyRows = () => {
    if (!payload || !payload.monthly) return [];
    const m = payload.monthly;
    if (m.selected_month_present && m.selected_month) {
      const arr = [];
      arr.push({
        sales_month: m.selected_month.sales_month_iso || m.selected_month.sales_month || (m.selected_month.sales_month_label ? `${m.selected_month.sales_month_label}-01T00:00:00.000Z` : null),
        total_monthly_volume: m.selected_month.total_monthly_volume,
        row_count: m.selected_month.row_count || 0
      });
      if (m.previous_month) {
        arr.push({
          sales_month: m.previous_month.sales_month_iso || m.previous_month.sales_month || (m.previous_month.sales_month_label ? `${m.previous_month.sales_month_label}-01T00:00:00.000Z` : null),
          total_monthly_volume: m.previous_month.total_monthly_volume,
          row_count: m.previous_month.row_count || 0
        });
      }
      return arr;
    }
    if (Array.isArray(m.rows) && m.rows.length > 0) {
      // try to find selected row
      const wanted = selectedMonth;
      const found = m.rows.find(r => (r.sales_month_label === wanted) || (r.sales_month && r.sales_month.startsWith(wanted)));
      if (!found) return [];
      const arr = [{
        sales_month: found.sales_month_iso || found.sales_month || (found.sales_month_label ? `${found.sales_month_label}-01T00:00:00.000Z` : null),
        total_monthly_volume: found.total_monthly_volume,
        row_count: found.row_count || 0
      }];
      return arr;
    }
    return [];
  };

  const monthlyRows = getMonthlyRows();
  const currentMonthRow = monthlyRows.length > 0 ? monthlyRows[0] : null;
  const previousMonthRow = monthlyRows.length > 1 ? monthlyRows[1] : null;

  // Top-level total_monthly_volume (API guarantees this field in your combined API)
  const topTotal = payload && typeof payload.total_monthly_volume !== 'undefined' ? Number(payload.total_monthly_volume) : (currentMonthRow && isValidNumber(currentMonthRow.total_monthly_volume) ? Number(currentMonthRow.total_monthly_volume) : null);

  const renderTopMetric = () => {
    if (isLoading) {
      return (
        <div style={styles.metricBox}>
          <div style={{ color: DARK_TEXT }}>Loading...</div>
        </div>
      );
    }

    if (!isValidNumber(topTotal, true)) {
      return <div style={{ ...styles.metricBox, color: NO_DATA_TEXT_COLOR, justifyContent: 'center' }}>🚨 No total volume data available for this month.</div>;
    }

    const monthLabel = (currentMonthRow && currentMonthRow.sales_month) ? toMonthLabel(currentMonthRow.sales_month) : selectedMonth;
    let growthText = 'N/A';
    let growthColor = DARK_TEXT;
    if (previousMonthRow && isValidNumber(previousMonthRow.total_monthly_volume, true)) {
      const prevVol = Number(previousMonthRow.total_monthly_volume);
      const growth = prevVol > 0 ? (((topTotal - prevVol) / prevVol) * 100) : (topTotal > 0 ? 100 : 0);
      growthText = `${growth > 0 ? '+' : ''}${growth.toFixed(1)}% MoM`;
      growthColor = growth >= 0 ? SUCCESS_COLOR : DANGER_COLOR;
    }

    return (
      <div style={styles.metricBox}>
        <div>
          <div style={styles.metricValue}>{Number(topTotal).toLocaleString(undefined, { maximumFractionDigits: 2 })} L</div>
          <div style={styles.metricLabel}>Total Monthly Sales ({monthLabel})</div>
        </div>
        <div style={{ fontSize: '1.1em', fontWeight: 'bold', color: growthColor }}>{growthText}</div>
      </div>
    );
  };

  /* ---------- Chart preparation ---------- */
  const chartData = prepareChartData(payload ? payload.daily : []);

  function prepareChartData(daily = []) {
    if (!Array.isArray(daily) || daily.length === 0) return [];
    // Sort by date ascending (safety) and map to { date, label, value }
    const sorted = daily.slice().sort((a, b) => {
      const da = new Date(a.indent_date);
      const db = new Date(b.indent_date);
      return da - db;
    });
    return sorted.map(d => {
      const iso = d.indent_date ? d.indent_date.slice(0, 10) : null;
      const label = iso ? (() => {
        const dd = new Date(iso);
        return `${String(dd.getUTCDate()).padStart(2, '0')} ${dd.toLocaleString('en-US', { month: 'short' })}`;
      })() : '';
      return {
        date: iso,
        label,
        value: isValidNumber(d.daily_total_quantity) ? Number(d.daily_total_quantity) : 0
      };
    });
  }

  const chartHasData = Array.isArray(chartData) && chartData.length > 0;

  return (
    <div style={styles.container}>
      <style>{`@keyframes spin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }`}</style>
      <h1 style={styles.header}>Milk Indent Reports Dashboard</h1>

      <select style={styles.selector} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} disabled={isLoading}>
        {ALL_MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>

      <div style={{ marginTop: '15px', marginBottom: '15px' }}>{renderTopMetric()}</div>

      {error ? <div style={{ color: DANGER_COLOR }}>{error}</div> : null}

    

      {/* Customer performance */}
      <div style={{ ...styles.card, marginTop: 12 }}>
        <h2 style={{ color: DARK_TEXT, fontSize: '1.1em' }}>Top Bulk Customer Performance</h2>
        {payload && Array.isArray(payload.customer) && payload.customer.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Customer</th>
                <th style={styles.th}>Total (L)</th>
                <th style={styles.th}>Avg Daily (L)</th>
              </tr>
            </thead>
            <tbody>
              {payload.customer.map((c, i) => (
                <tr key={i} style={{ backgroundColor: (c.total_quantity_for_month && Number(c.total_quantity_for_month) > 3000) ? ALT_ROW_BG : (i % 2 === 1 ? '#f9fafb' : CARD_BG) }}>
                  <td style={styles.td}>{c.company_name || '—'}</td>
                  <td style={styles.td}>{c.total_quantity_for_month != null ? Number(c.total_quantity_for_month).toFixed(2) : '—'}</td>
                  <td style={styles.td}>{c.average_daily_indent != null ? Number(c.average_daily_indent).toFixed(2) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: NO_DATA_TEXT_COLOR }}>No bulk customer indent data found for this month.</p>
        )}
      </div>
  {/* Delivery summary */}
      <div style={styles.card}>
        <h2 style={{ color: DARK_TEXT, fontSize: '1.1em' }}>Delivery Boys — Total Delivery Volume</h2>
        <p style={{ color: '#6b7280', fontSize: '0.8em' }}>
          Total delivery volume: {payload ? (payload.delivery?.total_delivery_volume ?? 0) : '—'} L
        </p>

        {payload && Array.isArray(payload.delivery?.rows) && payload.delivery.rows.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Delivery Boy ID</th>
                <th style={styles.th}>Total (L)</th>
                <th style={styles.th}>Deliveries</th>
              </tr>
            </thead>
            <tbody>
              {payload.delivery.rows.map((d, i) => (
                <tr key={i} style={{ backgroundColor: (d.total_quantity_for_month && Number(d.total_quantity_for_month) > 3000) ? ALT_ROW_BG : (i % 2 === 1 ? '#f9fafb' : CARD_BG) }}>
                  <td style={styles.td}>{d.delivery_boy_id ?? '—'}</td>
                  <td style={styles.td}>{d.total_quantity_for_month != null ? Number(d.total_quantity_for_month).toFixed(2) : '—'}</td>
                  <td style={styles.td}>{d.deliveries_count != null ? Number(d.deliveries_count) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: NO_DATA_TEXT_COLOR }}>No delivery records for this month.</p>
        )}
      </div>
      {/* Daily trend - improved chart */}
      <div style={{ ...styles.card, marginTop: 12 }}>
        <h2 style={{ color: DARK_TEXT, fontSize: '1.1em' }}>Daily Indent Volume Trend</h2>

        {isLoading ? (
          <p style={{ color: DARK_TEXT }}>Loading chart...</p>
        ) : !chartHasData ? (
          <p style={{ color: NO_DATA_TEXT_COLOR }}>No daily data for this month.</p>
        ) : (
          <div style={{ width: '100%', height: 360 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 16 }}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PRIMARY_ACCENT} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={PRIMARY_ACCENT} stopOpacity={0.05} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: DARK_TEXT, fontSize: 12 }} />
                <YAxis tick={{ fill: DARK_TEXT, fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => `${Number(value).toFixed(2)} L`}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend verticalAlign="top" height={24} />
                <Area type="monotone" dataKey="value" name="Daily Total (L)" stroke={PRIMARY_ACCENT} fill="url(#areaGradient)" strokeWidth={2} />
                <Line type="monotone" dataKey="value" stroke={INFO_COLOR} strokeWidth={2} dot={{ r: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
            {/* Compact summary under chart */}
            <div className=" pt-2 " style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', color: '#6b7280', fontSize: 13 }}>
              <div>Days with data: {chartData.length}</div>
              <div>Total (recomputed): {chartData.reduce((s, d) => s + (Number(d.value) || 0), 0).toFixed(2)} L</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
