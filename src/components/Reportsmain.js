import React, { useState, useEffect } from 'react';

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
// === CORE API FETCH LOGIC ===
// ====================================================================

/**
 * Fetches all three reports concurrently from the dynamic APIs
 * with exponential backoff for resilience.
 */
const fetchReports = async (month, year) => {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    const params = `month=${month}&year=${year}`;
    const apiEndpoints = [
        `/api/reports/daily-total?${params}`,
        `/api/reports/monthly-sales?${params}`,
        `/api/reports/customer-performance?${params}`
    ];

    const fetchWithRetry = async (url, attempt = 1) => {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                // Throw an error with status for clearer logging
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            if (attempt < maxRetries) {
                const delay = baseDelay * (2 ** (attempt - 1));
                console.warn(`Fetch failed for ${url} (Attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`);
                // Wait for the calculated delay (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, delay));
                return fetchWithRetry(url, attempt + 1);
            }
            console.error(`Failed to fetch ${url} after ${maxRetries} attempts.`, error);
            return []; // Return empty array on final failure
        }
    };

    // Use Promise.all to fetch all data concurrently
    const [dailyData, monthlyData, customerData] = await Promise.all([
        fetchWithRetry(apiEndpoints[0]), // daily-total
        fetchWithRetry(apiEndpoints[1]), // monthly-sales (fetches current and previous month)
        fetchWithRetry(apiEndpoints[2]), // customer-performance
    ]);

    return {
        daily: dailyData || [],
        monthly: monthlyData || [],
        customer: customerData || []
    };
};

// ====================================================================
// === COMPONENT STYLES AND SUB-COMPONENTS ===
// ====================================================================

const styles = {
  container: { 
    padding: '8px',
    marginTop:'5rem',
    marginBottom:'5rem',
    fontFamily: 'Inter, Arial, sans-serif', 
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
    width: '20px', // Explicit size for standard <img> tag
    height: '20px', // Explicit size for standard <img> tag
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
  // Use a sensible scaling factor based on the number of points actually plotted
  const dayCountForScaling = Math.max(daysInMonth - 1, 1);
  
  const points = dailyData.map((d, index) => {
    const volume = parseFloat(d.daily_total_quantity);
    const y = CHART_HEIGHT - (volume / maxVolume) * CHART_HEIGHT; 
    const x = (index / dayCountForScaling) * 100; 
    return `${x} ${y}`;
  }).join(' L '); // ' L ' denotes a line segment in SVG path

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
          
          // Show labels only for start, end, and 10th/20th day for clarity
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
    // We assume the first entry of monthlyData has the total volume for the current month
    const totalVolumeString = monthlyData?.[0]?.total_monthly_volume;
    const totalVolume = parseFloat(totalVolumeString) || 0;
    
    // Using 65/35 split as approximation since the API doesn't provide item_type split.
    const bulkVolume = (totalVolume * 0.65); 
    const deliveryVolume = (totalVolume * 0.35);
    
    const bulkPercent = (bulkVolume / totalVolume) * 100;
    const deliveryPercent = (deliveryVolume / totalVolume) * 100;

    // These paths are included to fulfill the user's requirement to use their asset names
    const MILK_CAN_URL = "/milkcans.png"; 
    const MILK_PACKET_URL = "/milkpacket.png"; 

    return (
        <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75em', fontWeight: 'bold', marginBottom: '4px' }}>
                <span style={{ color: PRIMARY_ACCENT }}>Bulk Customers ({bulkPercent.toFixed(1)}%)</span>
                <span style={{ color: INFO_COLOR }}>Delivery Boys ({deliveryPercent.toFixed(1)}%)</span>
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
                    {/* Using standard <img> tag for milkcans.png */}
                    <img 
                        src={MILK_CAN_URL} 
                        alt="Bulk Milk Cans" 
                        style={styles.volumeIcon} 
                    />
                    <div style={{ fontSize: '0.8em', color: PRIMARY_ACCENT, fontWeight: 'bold' }}>
                        Bulk Customers: {bulkVolume.toFixed(0)} L
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {/* Using standard <img> tag for milkpacket.png */}
                    <img 
                        src={MILK_PACKET_URL} 
                        alt="Delivery Milk Packets" 
                        style={styles.volumeIcon} 
                    />
                    <div style={{ fontSize: '0.8em', color: INFO_COLOR, fontWeight: 'bold' }}>
                         Delivery Boys: {deliveryVolume.toFixed(0)} L
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
  // Get the most recent month for initial load
  const initialMonth = ALL_MONTHS[0].value;
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  
  // Initialize state to empty arrays, relying entirely on fetch
  const [dailyData, setDailyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [customerData, setCustomerData] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Start loading on mount

  // useEffect hook to fetch data on mount and whenever month changes
  useEffect(() => {
    const [year, month] = selectedMonth.split('-');
    
    // Set loading state
    setIsLoading(true);
    
    // Fetch data using the dynamic APIs
    fetchReports(month, year)
        .then(data => {
            setDailyData(data.daily);
            // Sort monthly data so current month is always first (index 0)
            setMonthlyData(data.monthly.sort((a, b) => new Date(b.sales_month) - new Date(a.sales_month)));
            setCustomerData(data.customer);
        })
        .catch(error => {
            // Clear data on failure
            setDailyData([]);
            setMonthlyData([]);
            setCustomerData([]);
        })
        .finally(() => {
            setIsLoading(false);
        });
  }, [selectedMonth]); // Dependency on selectedMonth

  
  // Helper function to render MoM Growth
  const renderMonthlySalesMetric = () => {
    // monthlyData is sorted DESC by date, so index 0 is current month, 1 is previous
    const currentMonth = monthlyData?.[0];
    const previousMonth = monthlyData?.[1];

    if (monthlyData.length === 0) {
        return <div style={{...styles.metricBox, color: NO_DATA_TEXT_COLOR, justifyContent: 'center'}}>🚨 No total volume data available for this month.</div>;
    }

    let growthText = "N/A";
    let growthColor = DARK_TEXT;
    const currentVolume = parseFloat(currentMonth.total_monthly_volume) || 0;
    
    const monthLabel = new Date(currentMonth.sales_month).toLocaleString('en-US', { month: 'short', year: 'numeric' });

    if (previousMonth && previousMonth.total_monthly_volume) {
      const previousVolume = parseFloat(previousMonth.total_monthly_volume) || 0;
      // Calculate MoM growth percentage
      const growth = previousVolume > 0 ? (((currentVolume - previousVolume) / previousVolume) * 100) : (currentVolume > 0 ? 100 : 0);
      
      growthText = `${growth > 0 ? '+' : ''}${growth.toFixed(1)}% MoM`;
      growthColor = growth >= 0 ? SUCCESS_COLOR : DANGER_COLOR;
    }

    return (
      <div style={styles.metricBox}>
          <div>
              <div style={styles.metricValue}>
                  {currentVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })} L
              </div>
              <div style={styles.metricLabel}>
                  Total Monthly Indent ({monthLabel})
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
        return <div style={{ textAlign: 'center', padding: '50px 0', color: DARK_TEXT }}>
          {/* Custom CSS for spin animation is added at the end of the return statement */}
          <div style={{ 
            fontSize: '2em', 
            animation: 'spin 1s linear infinite',
            display: 'inline-block' 
          }}>🥛</div>
          <p style={{ marginTop: '10px' }}>Fetching Real-time Report Data...</p>
        </div>;
    }

    // Check if we have total volume for the current month to decide on rendering the split
    const currentMonthVolume = parseFloat(monthlyData?.[0]?.total_monthly_volume) || 0;

    return (
        <div style={styles.sectionContainer}>
        
            {/* 1. Top Customer Performance */}
            <div style={styles.card}>
                <h2 style={{ color: DARK_TEXT, fontSize: '1.2em' }}>1. Top Bulk Customer Performance</h2>
                <p style={{ color: '#6b7280', fontSize: '0.8em', marginBottom: '8px' }}>Customers ranked by quantity for the selected month.</p>
                
                {(customerData.length === 0) ? (
                    <p style={{ textAlign: 'center', color: NO_DATA_TEXT_COLOR, fontSize: '0.8em', padding: '10px 0' }}>🚨 No bulk customer indent data found for this month.</p>
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
                            <td style={styles.td}>{row.company_name}</td>
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
                <h2 style={{ color: DARK_TEXT, fontSize: '1.2em', marginBottom: '10px' }}>2. Daily Indent Volume Trend (Liters)</h2>
                <DailyVolumeAreaChart dailyData={dailyData} />
              
            </div>
            
            {/* 3. Product Mix Report (Progress Bar) - CONDITIONAL RENDERING APPLIED HERE */}
            <div style={styles.card}>
                <h2 style={{ color: DARK_TEXT, fontSize: '1.2em' }}>3. Milk Type Volume Split</h2>
                <p style={{ color: '#6b7280', fontSize: '0.8em', marginBottom: '8px' }}>Estimated breakdown of total monthly volume.</p>
                
                {currentMonthVolume > 0 ? (
                    // Render split component only if volume is present
                    <MilkProductSplit monthlyData={monthlyData} />
                ) : (
                    // Render no data message if volume is zero or missing
                    <p style={{ textAlign: 'center', color: NO_DATA_TEXT_COLOR, fontSize: '0.8em', padding: '10px 0' }}>🚨 Estimated breakdown not available (No monthly volume data).</p>
                )}
            </div>
        </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Add spin animation style for loading indicator */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <h1 style={styles.header}>Milk Indent Reports Dashboard</h1>
      

      {/* === Month Selector === */}
      <select 
        style={styles.selector} 
        value={selectedMonth} 
        onChange={(e) => setSelectedMonth(e.target.value)}
        disabled={isLoading}
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