import React, { useState, useEffect } from 'react';
import Image from 'next/image';

// === AMBER PALETTE COLORS (Maintained for Brand Consistency) ===
const PRIMARY_ACCENT = '#d97706'; // Amber 600 (Primary/Bulk Milk)
const SUCCESS_COLOR = '#059669';  // Emerald 600
const DANGER_COLOR = '#dc2626';   // Red 600
const INFO_COLOR = '#1d4ed8';     // Blue 700 (Delivery Milk)
const BASE_BG = '#f8f9fa';        // Light Gray Background
const CARD_BG = '#ffffff';        // White Card Background
const DARK_TEXT = '#374151';      // Neutral 800 for high-contrast text
const TABLE_HEAD_BG = '#fef3c7';  // Amber 100
const ALT_ROW_BG = '#fffdf5';     // Amber 50 (Subtle row shade / Metric Box background)
const NO_DATA_TEXT_COLOR = '#9ca3af';

// Helper function to generate month/year options (Last 12 months)
const generateMonths = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    months.push({ 
      value: `${year}-${month}`, 
      label: d.toLocaleString('en-US', { year: 'numeric', month: 'long' }) 
    });
  }
  return months;
};
const ALL_MONTHS = generateMonths();

// ====================================================================
// === API SIMULATION (Replaced with your actual API fetch calls) ===
// ====================================================================

// SSR-Safe Mock Data for Initial October Load
const INITIAL_DAILY_DATA = Array.from({ length: 30 }, (_, i) => ({
  indent_date: `2025-10-${String(i + 1).padStart(2, '0')}`,
  // Deterministic formula for SSR-safe mock charting
  daily_total_quantity: (2510 + Math.sin(i * 0.5) * 500 + i * 2).toFixed(2), 
}));

const INITIAL_CUSTOMER_DATA = [
  { company_name: "Delhi Mithai", total_quantity_for_month: '5640.00', average_daily_indent: '188.00', days_indented: 30 },
  { company_name: "Dazn Company", total_quantity_for_month: '3490.00', average_daily_indent: '116.33', days_indented: 30 },
  { company_name: "Pragathinagar", total_quantity_for_month: '2690.00', average_daily_indent: '89.67', days_indented: 30 },
  { company_name: "Daspala", total_quantity_for_month: '2610.00', average_daily_indent: '87.00', days_indented: 30 },
  { company_name: "Pappusetu", total_quantity_for_month: '1660.00', average_daily_indent: '55.33', days_indented: 30 },
].sort((a, b) => parseFloat(b.total_quantity_for_month) - parseFloat(a.total_quantity_for_month));

const INITIAL_MONTHLY_DATA = [
  { sales_month: '2025-10-01T00:00:00.000Z', total_monthly_volume: '75000.00' }, // Current
  { sales_month: '2025-09-01T00:00:00.000Z', total_monthly_volume: '70000.00' }, // Previous
];


// MOCK DATA STRUCTURE: Matches the APIs you defined.
const MOCK_API_RESPONSE = {
  // INITIAL MONTH: October 2025
  '2025-10': { 
    daily: INITIAL_DAILY_DATA,
    monthly: INITIAL_MONTHLY_DATA,
    customer: INITIAL_CUSTOMER_DATA,
  },
  // SEPTEMBER 2025: Using the data from your API mock files
  '2025-09': { 
    // Data for Daily Trend
    daily: [
      { indent_date: '2025-09-01T00:00:00.000Z', daily_total_quantity: '758.50' },
      { indent_date: '2025-09-02T00:00:00.000Z', daily_total_quantity: '782.50' },
      { indent_date: '2025-09-03T00:00:00.000Z', daily_total_quantity: '778.50' },
      { indent_date: '2025-09-04T00:00:00.000Z', daily_total_quantity: '788.50' },
      { indent_date: '2025-09-05T00:00:00.000Z', daily_total_quantity: '775.50' },
    ],
    // Data for Monthly Sales (current and previous)
    monthly: [
      { sales_month: '2025-09-01T00:00:00.000Z', total_monthly_volume: '13885.00' }, 
      { sales_month: '2025-08-01T00:00:00.000Z', total_monthly_volume: '11500.00' }, 
    ],
    // Data for Customer Performance
    customer: [
      { company_name: 'Delhi Mithai', total_quantity_for_month: '5640.00', average_daily_indent: '188.00', days_indented: 30 },
      { company_name: 'Dazn Company', total_quantity_for_month: '3490.00', average_daily_indent: '116.33', days_indented: 30 },
      { company_name: 'Pragathinagar', total_quantity_for_month: '2690.00', average_daily_indent: '89.67', days_indented: 30 },
      { company_name: 'Daspala', total_quantity_for_month: '2610.00', average_daily_indent: '87.00', days_indented: 30 },
      { company_name: 'Pappusetu', total_quantity_for_month: '1660.00', average_daily_indent: '55.33', days_indented: 30 },
    ].sort((a, b) => parseFloat(b.total_quantity_for_month) - parseFloat(a.total_quantity_for_month)),
  },
  // EMPTY MONTH: Example for "No data found"
  '2025-01': { 
    daily: [],
    monthly: [],
    customer: [],
  }
};

const simulateFetchReports = (month) => {
  // In a real application, you would replace this with actual fetch calls:
  // const dailyPromise = fetch(`/api/reports/daily-total?month=${month}`).then(res => res.json());
  // const monthlyPromise = fetch(`/api/reports/monthly-sales?month=${month}`).then(res => res.json());
  // const customerPromise = fetch(`/api/reports/customer-performance?month=${month}`).then(res => res.json());
  
  const data = MOCK_API_RESPONSE[month] || { daily: [], monthly: [], customer: [] };

  return new Promise(resolve => {
    // Simulate network delay and API merging
    setTimeout(() => {
        resolve({
            daily: data.daily,
            monthly: data.monthly,
            customer: data.customer
        });
    }, 200);
  });
};

// ====================================================================
// === COMPONENT STYLES AND SUB-COMPONENTS (Unchanged) ===
// ====================================================================
const styles = {
  // ... (Styles object is kept the same for brevity but is included in the final output)
  container: { 
    padding: '8px',
    marginTop:'5rem',
    marginBottom:'5rem',
    fontFamily: 'Arial, sans-serif', 
    backgroundColor: BASE_BG 
  },
  header: { 
    color: DARK_TEXT, 
    paddingBottom: '6px', 
    fontSize: '1.4em'
  },
  selector: {
    padding: '8px 12px',
    margin: '10px 0',
    border: `1px solid ${PRIMARY_ACCENT}`,
    borderRadius: '6px',
    backgroundColor: ALT_ROW_BG,
    color: DARK_TEXT,
    fontSize: '0.9em',
    width: '100%',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  sectionContainer: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '15px',
    marginTop: '15px' 
  },
  card: { 
    padding: '12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px', 
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)', 
    backgroundColor: CARD_BG 
  },
  table: { 
    width: '100%', 
    borderCollapse: 'collapse', 
    marginTop: '8px' 
  },
  th: { 
    padding: '6px 4px',
    borderBottom: `2px solid ${PRIMARY_ACCENT}`, 
    textAlign: 'left', 
    backgroundColor: TABLE_HEAD_BG,
    fontSize: '0.75em',
    color: DARK_TEXT
  },
  td: { 
    padding: '5px 4px',
    borderBottom: '1px solid #f3f4f6',
    textAlign: 'left',
    fontSize: '0.8em',
    color: DARK_TEXT,
    wordBreak: 'break-word',
  },
  metricBox: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '12px', 
    backgroundColor: ALT_ROW_BG,
    borderRadius: '4px', 
    borderLeft: `5px solid ${PRIMARY_ACCENT}`
  },
  metricValue: {
    fontSize: '1.3em', 
    fontWeight: 'bold',
    color: PRIMARY_ACCENT
  },
  metricLabel: {
    fontSize: '0.8em', 
    color: '#6b7280'
  },
  volumeIcon: {
    marginRight: '10px',
    objectFit: 'contain',
  }
};

const DailyVolumeAreaChart = ({ dailyData }) => {
  if (!dailyData || dailyData.length === 0) {
    return <p style={{ textAlign: 'center', color: NO_DATA_TEXT_COLOR, fontSize: '0.8em', padding: '20px 0' }}>🚨 No daily indent data available for this month.</p>;
  }

  const volumes = dailyData.map(d => parseFloat(d.daily_total_quantity));
  const maxVolume = Math.max(...volumes) * 1.05 || 1; 
  const CHART_HEIGHT = 100;
  const daysInMonth = dailyData.length;
  const dayCountForScaling = Math.max(daysInMonth - 1, 1);
  
  const points = dailyData.map((d, index) => {
    const volume = parseFloat(d.daily_total_quantity);
    const y = CHART_HEIGHT - (volume / maxVolume) * CHART_HEIGHT; 
    const x = (index / dayCountForScaling) * 100; 
    return `${x} ${y}`;
  }).join(' L ');

  const areaPath = `M 0 ${CHART_HEIGHT} L ${points} L 100 ${CHART_HEIGHT} Z`;
  const linePath = `M ${points}`;

  return (
    <div style={{ position: 'relative', padding: '10px 0 30px 0', margin: '0 5px' }}>
      <div style={{ 
        position: 'absolute', 
        top: '0px', 
        left: '0px', 
        fontSize: '0.65em', 
        color: PRIMARY_ACCENT, 
        zIndex: 1 
      }}>
        {maxVolume.toFixed(0)} L 
      </div>
      <div style={{ 
        height: `${CHART_HEIGHT}px`,
        position: 'relative',
        borderLeft: `1px solid #ccc`, 
        borderBottom: `1px solid #ccc`, 
      }}>
        <svg 
          viewBox={`0 0 100 ${CHART_HEIGHT}`} 
          preserveAspectRatio="none" 
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        >
          <path 
            d={areaPath} 
            fill={PRIMARY_ACCENT} 
            fillOpacity="0.3"
          />
          <path 
            d={linePath} 
            fill="none" 
            stroke={PRIMARY_ACCENT} 
            strokeWidth="2"
          />
        </svg>
        {dailyData.map((d, index) => {
          const day = new Date(d.indent_date).toLocaleDateString('en-US', { day: 'numeric' });
          const leftPercent = (index / dayCountForScaling) * 100;
          const shouldShowLabel = index === 0 || day === '10' || day === '20' || index === daysInMonth - 1; 
          
          return (
            shouldShowLabel && (
                <span 
                    key={index}
                    style={{ 
                        position: 'absolute', 
                        bottom: '-25px', 
                        left: `${leftPercent}%`,
                        transform: 'translateX(-50%)',
                        fontSize: '0.65em', 
                        color: DARK_TEXT,
                        zIndex: 15
                    }}
                >
                    {day}
                </span>
            )
          );
        })}
      </div>
      <p style={{ fontSize: '0.6em', color: '#6b7280', textAlign: 'center', marginTop: '5px' }}>
        Day of Month
      </p>
    </div>
  );
};


const MilkProductSplit = ({ monthlyData }) => {
    // We assume the first entry of monthlyData has the total volume
    const totalVolumeString = monthlyData?.[0]?.total_monthly_volume;
    const totalVolume = parseFloat(totalVolumeString) || 0;
    
    if (totalVolume === 0) {
        return <p style={{ textAlign: 'center', color: NO_DATA_TEXT_COLOR, fontSize: '0.8em', padding: '10px 0' }}>🚨 Total volume data not available for split analysis.</p>;
    }

    // Since item_type split is not available in the monthly-sales API, we use an estimate for demo:
    const bulkVolume = (totalVolume * 0.65); 
    const deliveryVolume = (totalVolume * 0.35);
    
    const bulkPercent = (bulkVolume / totalVolume) * 100;
    const deliveryPercent = (deliveryVolume / totalVolume) * 100;

    return (
        <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75em', fontWeight: 'bold', marginBottom: '4px' }}>
                <span style={{ color: PRIMARY_ACCENT }}>Bulk ({bulkPercent.toFixed(1)}%)</span>
                <span style={{ color: INFO_COLOR }}>Delivery ({deliveryPercent.toFixed(1)}%)</span>
            </div>

            <div style={{ 
                height: '20px', 
                borderRadius: '10px', 
                backgroundColor: INFO_COLOR + '30',
                overflow: 'hidden',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <div style={{
                    width: `${bulkPercent}%`,
                    height: '100%',
                    backgroundColor: PRIMARY_ACCENT,
                    transition: 'width 0.5s ease-out',
                    borderRadius: '10px 0 0 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: bulkPercent > 10 ? '5px' : '0'
                }}>
                    {bulkPercent > 50 && (
                        <span style={{ fontSize: '0.7em', color: CARD_BG, fontWeight: 'bold' }}>
                            {bulkVolume.toFixed(0)} L
                        </span>
                    )}
                </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Image 
                        src="/milkcans.png" 
                        alt="Bulk Milk Cans" 
                        width={20} 
                        height={20} 
                        style={styles.volumeIcon} 
                    />
                    <div style={{ fontSize: '0.8em', color: PRIMARY_ACCENT, fontWeight: 'bold' }}>
                        Bulk: {bulkVolume.toFixed(0)} L
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Image 
                        src="/milkpacket.png" 
                        alt="Delivery Milk Packets" 
                        width={20} 
                        height={20} 
                        style={styles.volumeIcon} 
                    />
                    <div style={{ fontSize: '0.8em', color: INFO_COLOR, fontWeight: 'bold' }}>
                         Delivery: {deliveryVolume.toFixed(0)} L
                    </div>
                </div>
            </div>
        </div>
    );
};


// ====================================================================
// === MAIN COMPONENT ===
// ====================================================================

function Reportsmain() {
  // Use state for data and loading status
  const [selectedMonth, setSelectedMonth] = useState(ALL_MONTHS[0].value);
  const [dailyData, setDailyData] = useState(INITIAL_DAILY_DATA);
  const [monthlyData, setMonthlyData] = useState(INITIAL_MONTHLY_DATA);
  const [customerData, setCustomerData] = useState(INITIAL_CUSTOMER_DATA);
  const [isLoading, setIsLoading] = useState(false);

  // useEffect hook to simulate API calls when month changes
  useEffect(() => {
    // Only run if the month is different from the initial SSR data month
    if (selectedMonth !== ALL_MONTHS[0].value) {
        setIsLoading(true);
        // In a real app, replace simulateFetchReports with your actual API calls
        simulateFetchReports(selectedMonth)
            .then(data => {
                setDailyData(data.daily);
                setMonthlyData(data.monthly);
                setCustomerData(data.customer);
                setIsLoading(false);
            })
            .catch(error => {
                console.error("Failed to fetch reports:", error);
                // Clear data on error
                setDailyData([]);
                setMonthlyData([]);
                setCustomerData([]);
                setIsLoading(false);
            });
    }
  }, [selectedMonth]);
  
  // Helper function to render MoM Growth
  const renderMonthlySalesMetric = () => {
    const currentMonth = monthlyData?.[0];
    const previousMonth = monthlyData?.[1];

    if (monthlyData.length === 0) {
        return <div style={{...styles.metricBox, color: NO_DATA_TEXT_COLOR, justifyContent: 'center'}}>🚨 No total volume data available for this month.</div>;
    }

    let growthText = "N/A";
    let growthColor = DARK_TEXT;
    const currentVolume = parseFloat(currentMonth.total_monthly_volume);

    if (previousMonth && previousMonth.total_monthly_volume) {
      const previousVolume = parseFloat(previousMonth.total_monthly_volume);
      const growth = previousVolume > 0 ? (((currentVolume - previousVolume) / previousVolume) * 100) : (currentVolume > 0 ? 100 : 0);
      
      growthText = `${growth > 0 ? '+' : ''}${growth.toFixed(1)}% MoM`;
      growthColor = growth >= 0 ? SUCCESS_COLOR : DANGER_COLOR;
    }

    return (
      <div style={styles.metricBox}>
          <div>
              <div style={styles.metricValue}>
                  {currentVolume.toLocaleString()} L
              </div>
              <div style={styles.metricLabel}>
                  Total Monthly Indent
              </div>
          </div>
          <div style={{ fontSize: '1.1em', fontWeight: 'bold', color: growthColor }}>
              {growthText}
          </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) {
        return <div style={{ textAlign: 'center', padding: '50px 0', color: DARK_TEXT }}>Loading Report Data... 🥛</div>;
    }

    return (
        <div style={styles.sectionContainer}>
        
            {/* 1. Top Customer Performance */}
            <div style={styles.card}>
                <h2 style={{ color: DARK_TEXT, fontSize: '1.2em' }}>1. Top Customer Performance (Monthly)</h2>
                <p style={{ color: '#6b7280', fontSize: '0.8em', marginBottom: '8px' }}>Customers ranked by **SUM(quantity)** for the month.</p>
                
                {(customerData.length === 0) ? (
                    <p style={{ textAlign: 'center', color: NO_DATA_TEXT_COLOR, fontSize: '0.8em', padding: '10px 0' }}>🚨 No customer indent data found for this month.</p>
                ) : (
                    <table style={styles.table}>
                    <thead>
                        <tr>
                        <th style={styles.th}>Customer</th>
                        <th style={styles.th}>Total (L)</th>
                        <th style={styles.th}>Avg. Daily (L)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customerData.map((row, index) => (
                        <tr key={index} style={{ 
                            backgroundColor: parseFloat(row.total_quantity_for_month) > 3000 ? ALT_ROW_BG : (index % 2 === 1 ? '#f9fafb' : CARD_BG) 
                        }}>
                            <td style={styles.td}>**{row.company_name}**</td>
                            <td style={styles.td}>{parseFloat(row.total_quantity_for_month).toFixed(2)}</td>
                            <td style={styles.td}>{parseFloat(row.average_daily_indent).toFixed(2)}</td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                )}
            </div>
            
            {/* 2. Daily Volume Trend (Smoothed Area Chart) */}
            <div style={styles.card}>
                <h2 style={{ color: DARK_TEXT, fontSize: '1.2em', marginBottom: '10px' }}>2. Daily Volume Trend (Liters)</h2>
                <DailyVolumeAreaChart dailyData={dailyData} />
                <p style={{ fontSize: '0.7em', color: '#6b7280', marginTop: '15px' }}>
                    *Visualizes **SUM(quantity)** grouped by **indent_date**.*
                </p>
            </div>
            
            {/* 3. Product Mix Report (Progress Bar) */}
            <div style={styles.card}>
                <h2 style={{ color: DARK_TEXT, fontSize: '1.2em' }}>3. Milk Type Volume Split</h2>
                <p style={{ color: '#6b7280', fontSize: '0.8em', marginBottom: '8px' }}>Categorization of total monthly volume for procurement planning.</p>
                <MilkProductSplit monthlyData={monthlyData} />
                <p style={{ fontSize: '0.7em', color: '#6b7280', marginTop: '15px' }}>
                    *This requires **SUM(quantity)** filtered by **item_type** (not included in `monthly-sales.js` API).*
                </p>
            </div>
        </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Milk Indent Dashboard</h1>
      

      {/* === Month Selector === */}
      <select 
        style={styles.selector} 
        value={selectedMonth} 
        onChange={(e) => setSelectedMonth(e.target.value)}
      >
        {ALL_MONTHS.map(m => (
          <option key={m.value} value={m.value}>{m.label}</option>
        ))}
      </select>
      
      {/* Monthly Sales Metric Card */}
      <div style={{ marginTop: '15px', marginBottom: '15px' }}>
        {renderMonthlySalesMetric()}
      </div>

      {renderContent()}
    </div>
  );
}

export default Reportsmain;