import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
// The path must start with './' to look in the current folder
import { mockIndentData } from './mockIndentData'; 

// A simple chevron icon for the expand/collapse functionality
const ChevronDownIcon = ({ size = 24, color = "currentColor", style }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
);

export default function Dash() {
    const router = useRouter();
    const [selectedMonth, setSelectedMonth] = useState('');
    const [monthlyData, setMonthlyData] = useState({
        homeDeliveryTotal: 0,
        bulkOrderTotal: 0,
        grandTotal: 0,
        homeDeliveryBreakdown: {},
        bulkOrderBreakdown: {},
    });
    const [isHomeDeliveryExpanded, setIsHomeDeliveryExpanded] = useState(false);
    const [isBulkOrderExpanded, setIsBulkOrderExpanded] = useState(false);

    useEffect(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0'); 
        setSelectedMonth(`${year}-${month}`);
    }, []);

    useEffect(() => {
        if (!selectedMonth) return;

        const filteredData = mockIndentData.filter(indent => indent.date.startsWith(selectedMonth));

        const homeDeliveryBreakdown = {};
        const bulkOrderBreakdown = {};
        let homeDeliveryTotal = 0;
        let bulkOrderTotal = 0;

        filteredData.forEach(indent => {
            indent.homeDeliveries.forEach(delivery => {
                const boy = delivery.deliveryBoy;
                const liters = Number(delivery.liters) || 0;
                homeDeliveryBreakdown[boy] = (homeDeliveryBreakdown[boy] || 0) + liters;
                homeDeliveryTotal += liters;
            });

            indent.bulkOrders.forEach(order => {
                const company = order.company_name;
                const quantity = Number(order.quantity) || 0;
                bulkOrderBreakdown[company] = (bulkOrderBreakdown[company] || 0) + quantity;
                bulkOrderTotal += quantity;
            });
        });
        
        setMonthlyData({
            homeDeliveryTotal,
            bulkOrderTotal,
            grandTotal: homeDeliveryTotal + bulkOrderTotal,
            homeDeliveryBreakdown,
            bulkOrderBreakdown,
        });
        
        setIsHomeDeliveryExpanded(false);
        setIsBulkOrderExpanded(false);

    }, [selectedMonth]);


    return (
        <div style={styles.pageContainer}>
            <div style={styles.header}>
                <h1 style={styles.pageTitle}>Monthly Dashboard</h1>
                <button
                    onClick={() => router.push('/')} // Navigates to your IndentPage
                    style={{...styles.baseButton, ...styles.addButton}}
                >
                    + Add Indent
                </button>
            </div>
            
            <div style={styles.dateSelectorContainer}>
                <label htmlFor="month-picker" style={styles.label}>Select Month:</label>
                <input
                    type="month"
                    id="month-picker"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={styles.dateInput}
                />
            </div>
            
            {/* Home Deliveries Card */}
            <div style={styles.card}>
                <div style={styles.cardHeader} onClick={() => setIsHomeDeliveryExpanded(!isHomeDeliveryExpanded)}>
                    <div>
                        <h2 style={styles.cardTitle}>Home Deliveries</h2>
                        <p style={styles.cardTotal}>{monthlyData.homeDeliveryTotal.toLocaleString()} L</p>
                    </div>
                    <ChevronDownIcon style={{ ...styles.chevron, transform: isHomeDeliveryExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </div>
                {isHomeDeliveryExpanded && (
                    <div style={styles.breakdownContainer}>
                        {Object.keys(monthlyData.homeDeliveryBreakdown).length > 0 ? (
                            Object.entries(monthlyData.homeDeliveryBreakdown)
                                .sort(([, a], [, b]) => b - a)
                                .map(([boy, liters]) => (
                                    <div style={styles.breakdownItem} key={boy}>
                                        <span>{boy}</span>
                                        <span>{liters.toLocaleString()} L</span>
                                    </div>
                                ))
                        ) : (
                            <p style={styles.noDataText}>No home delivery data for this month.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Bulk Orders Card */}
            <div style={styles.card}>
                <div style={styles.cardHeader} onClick={() => setIsBulkOrderExpanded(!isBulkOrderExpanded)}>
                    <div>
                        <h2 style={styles.cardTitle}>Bulk Orders</h2>
                        <p style={styles.cardTotal}>{monthlyData.bulkOrderTotal.toLocaleString()} L</p>
                    </div>
                    <ChevronDownIcon style={{ ...styles.chevron, transform: isBulkOrderExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </div>
                {isBulkOrderExpanded && (
                    <div style={styles.breakdownContainer}>
                        {Object.keys(monthlyData.bulkOrderBreakdown).length > 0 ? (
                            Object.entries(monthlyData.bulkOrderBreakdown)
                                .sort(([, a], [, b]) => b - a)
                                .map(([company, quantity]) => (
                                    <div style={styles.breakdownItem} key={company}>
                                        <span>{company}</span>
                                        <span>{quantity.toLocaleString()} L</span>
                                    </div>
                                ))
                        ) : (
                             <p style={styles.noDataText}>No bulk order data for this month.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Grand Total Section */}
            <div style={styles.grandTotalSection}>
                <span>Grand Total for the Month</span>
                <strong>{monthlyData.grandTotal.toLocaleString()} L</strong>
            </div>
        </div>
    );
}

const styles = {
    pageContainer: { maxWidth: '768px', margin: '0 auto', padding: '1.5rem', fontFamily: "'Inter', sans-serif", backgroundColor: '#F9FAFB' },
    card: { backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '1.5rem', border: '1px solid #E5E7EB', marginBottom: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
    baseButton: { padding: '12px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    label: { display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' },
    grandTotalSection: { marginTop: '1rem', paddingTop: '1.5rem', borderTop: '2px solid #111827', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '1.25rem', fontWeight: '600', color: '#111827' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
    pageTitle: { margin: 0, fontSize: '2rem', color: '#111827', fontWeight: 700 },
    addButton: { backgroundColor: '#F59E0B', color: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    dateSelectorContainer: { marginBottom: '2rem', backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: '12px', border: '1px solid #E5E7EB' },
    dateInput: { width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '1rem', backgroundColor: '#F9FAFB', boxSizing: 'border-box' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' },
    cardTitle: { margin: 0, fontSize: '1.125rem', color: '#374151', fontWeight: 500 },
    cardTotal: { margin: '0.25rem 0 0 0', fontSize: '1.75rem', color: '#111827', fontWeight: 700 },
    chevron: { transition: 'transform 0.3s ease-in-out', color: '#9CA3AF' },
    breakdownContainer: { marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #E5E7EB' },
    breakdownItem: { display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #F3F4F6', fontSize: '1rem', color: '#374151' },
    noDataText: { color: '#6B7280', textAlign: 'center', padding: '1rem 0' }
};