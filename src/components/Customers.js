import React, { useState, useMemo } from 'react';
import { mockCustomers } from './mockCustomers'; // Your customer list
import { mockIndentData } from './mockIndentData'; // Your sales data

// Reusable Modal Component for adding a new customer
const AddCustomerModal = ({ isOpen, onClose, onAddCustomer }) => {
    const [name, setName] = useState('');
    const [area, setArea] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            alert('Please enter a company name.');
            return;
        }
        onAddCustomer({ name, area });
        // Reset form and close modal
        setName('');
        setArea('');
        onClose();
    };

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                <h2 style={styles.cardTitle}>Add New Bulk Customer</h2>
                <form onSubmit={handleSubmit}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Company / Organization Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} style={styles.input} required />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Address / Area</label>
                        <input type="text" value={area} onChange={e => setArea(e.target.value)} style={styles.input} />
                    </div>
                    <div style={styles.modalFooter}>
                        <button type="button" onClick={onClose} style={{...styles.baseButton, ...styles.backButton}}>Cancel</button>
                        <button type="submit" style={{...styles.baseButton, ...styles.addButton}}>Add Customer</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


export default function Customers() {
    // State to manage the list of customers
    const [customers, setCustomers] = useState(mockCustomers);
    // State for the month filter
    const [selectedMonth, setSelectedMonth] = useState('');
    // State for the modal
    const [isModalOpen, setIsModalOpen] = useState(false);

    // This function calculates sales data for all customers.
    // `useMemo` prevents recalculating on every render, improving performance.
    const customerSalesData = useMemo(() => {
        const sales = {};
        // Initialize sales data for each customer
        customers.forEach(c => {
            sales[c.name] = { total: 0, monthly: {} };
        });

        // Aggregate sales from indent data
        mockIndentData.forEach(indent => {
            const month = indent.date.substring(0, 7); // "YYYY-MM"
            indent.bulkOrders.forEach(order => {
                if (sales[order.company_name]) {
                    const quantity = Number(order.quantity) || 0;
                    sales[order.company_name].total += quantity;
                    sales[order.company_name].monthly[month] = (sales[order.company_name].monthly[month] || 0) + quantity;
                }
            });
        });
        return sales;
    }, [customers]);

    const handleAddCustomer = (newCustomer) => {
        // Add the new customer to the state.
        // NOTE: This will not permanently save the customer. 
        // A database is needed for that.
        const customerWithId = { ...newCustomer, id: Date.now() };
        setCustomers(prev => [...prev, customerWithId]);
        alert(`${newCustomer.name} has been added for this session.`);
    };

    return (
        <>
            <AddCustomerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAddCustomer={handleAddCustomer} />
            <div style={styles.pageContainer}>
                <div style={styles.header}>
                    <h1 style={styles.pageTitle}>Bulk Customers</h1>
                    <button onClick={() => setIsModalOpen(true)} style={{...styles.baseButton, ...styles.addButton}}>
                        + Add Customer
                    </button>
                </div>

                <div style={styles.filters}>
                    <div style={{ flex: 1 }}>
                        <label htmlFor="month-picker" style={styles.label}>Filter by Month</label>
                        <input
                            type="month"
                            id="month-picker"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            style={styles.input}
                        />
                    </div>
                </div>
                
                <div style={styles.customerList}>
                    {customers.map(customer => {
                        const sales = customerSalesData[customer.name] || { total: 0, monthly: {} };
                        const displayAmount = selectedMonth ? (sales.monthly[selectedMonth] || 0) : sales.total;
                        
                        return (
                            <div key={customer.id} style={styles.card}>
                                <div>
                                    <h3 style={styles.customerName}>{customer.name}</h3>
                                    <p style={styles.customerArea}>{customer.area}</p>
                                </div>
                                <div style={styles.salesInfo}>
                                    <span style={styles.salesAmount}>{displayAmount.toLocaleString()} L</span>
                                    <span style={styles.salesLabel}>{selectedMonth ? 'in selected month' : 'total intake'}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

// Adapted and new styles for this component
const styles = {
    pageContainer: { maxWidth: '768px', margin: '0 auto', padding: '1.5rem', fontFamily: "'Inter', sans-serif", backgroundColor: '#F9FAFB' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
    pageTitle: { margin: 0, fontSize: '2rem', color: '#111827', fontWeight: 700 },
    baseButton: { padding: '12px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', transition: 'all 0.2s ease' },
    addButton: { backgroundColor: '#F59E0B', color: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    filters: { display: 'flex', gap: '1rem', marginBottom: '2rem' },
    label: { display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151', fontSize: '0.875rem' },
    input: { width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '1rem', backgroundColor: '#FFFFFF', boxSizing: 'border-box' },
    customerList: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    card: { backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '1.5rem', border: '1px solid #E5E7EB', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    customerName: { margin: 0, fontSize: '1.25rem', color: '#111827', fontWeight: 600 },
    customerArea: { margin: '0.25rem 0 0 0', color: '#6B7280', fontSize: '0.875rem' },
    salesInfo: { textAlign: 'right' },
    salesAmount: { fontSize: '1.5rem', fontWeight: '700', color: '#10B981' },
    salesLabel: { fontSize: '0.875rem', color: '#6B7280', display: 'block' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
    modalContent: { backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
    cardTitle: { marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem', color: '#111827', fontWeight: 600 },
    formGroup: { marginBottom: '1.25rem' },
    modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' },
    backButton: { backgroundColor: '#FFFFFF', color: '#374151', border: '1px solid #D1D5DB' },
};