import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useRouter } from 'next/router';

// Helper function to fetch the logo from the public folder and convert it to Base64
const getImageBase64 = async (url) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error fetching image for PDF:", error);
        return null; // Return null if the image can't be loaded
    }
};

const deliveryBoyAreas = {
    'Mahendra': 'Gadipet',
    'Aslam': 'Chitrapuri Colony, Jubilee Hills',
    'Shiva': 'Financial District',
    'Ramu': 'Manikonda',
    'Bittu': 'Manikonda, Alkapur, Shaikpet'
};
const deliveryBoys = Object.keys(deliveryBoyAreas);
const areas = ['Jubilee Hills', 'Kukatpally', 'Raidurg', 'Gachibowli', 'Financial District', 'Manikonda', 'Alkapur', 'Gadipet', 'Chitrapuri Colony, Jubilee Hills', 'Manikonda, Alkapur, Shaikpet'];

const mockDatabase = [
  { id: 1, company_name: 'Daspalla Hotel', area: 'Jubilee Hills', quantity: 0 },
  { id: 2, company_name: 'Pragathinagar Supermarket', area: 'Kukatpally', quantity: 0 },
  { id: 3, company_name: 'Phoenix Software', area: 'Wipro circle', quantity: 0 },
  { id: 4, company_name: 'Dazn Company', area: 'Raidurg', quantity: 0 },
];

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);

const Step1_HomeDeliveries = ({ onNext, homeDeliveries, setHomeDeliveries, targetDate }) => {
  const handleDispatchChange = (id, field, value) => {
    setHomeDeliveries(homeDeliveries.map(d => d.id === id ? { ...d, [field]: value } : d));
  };
  const totalHomeDeliveryMilk = homeDeliveries.reduce((sum, d) => sum + (Number(d.liters) || 0), 0);
  const canProceed = homeDeliveries.some(d => Number(d.liters) > 0); 
  return (
    <div style={styles.card}>
        <h2 style={styles.cardTitle}>Home Deliveries</h2>
        <p style={styles.dateDisplay}>{targetDate}</p>
        <div style={styles.listContainer}>
            <div style={styles.listHeaderRow}>
                <div style={{...styles.listHeaderCell, flex: 2.5}}>DELIVERY BOY</div>
                <div style={{...styles.listHeaderCell, flex: 3}}>AREA</div>
                <div style={{...styles.listHeaderCell, flex: 1.5, textAlign: 'center'}}>LITERS</div>
            </div>
            {homeDeliveries.map((dispatch) => (
              <div key={dispatch.id} style={styles.dispatchRow}>
                <div style={styles.deliveryBoyCell}>{dispatch.deliveryBoy}</div>
                <select value={dispatch.area} onChange={(e) => handleDispatchChange(dispatch.id, 'area', e.target.value)} style={{...styles.input, flex: 3}}>
                  <option value="">Select Area</option>
                  {areas.map(area => <option key={area} value={area}>{area}</option>)}
                </select>
                <input type="number" placeholder="0" value={dispatch.liters} onChange={(e) => handleDispatchChange(dispatch.id, 'liters', e.target.value)} style={{...styles.input, flex: 1.5, textAlign: 'center'}} />
              </div>
            ))}
        </div>
        <div style={styles.stepActions}>
            <div style={styles.totalSummary}>
                <span>Total Milk</span>
                <strong>{totalHomeDeliveryMilk} L</strong>
            </div>
            <button onClick={onNext} style={canProceed ? {...styles.baseButton, ...styles.nextButton} : {...styles.baseButton, ...styles.disabledButton}} disabled={!canProceed}>
              Next: Bulk Orders
            </button>
        </div>
    </div>
  );
};

const Step2_BulkOrders = ({ onNext, onBack, targetDate }) => {
  const [bulkOrders, setBulkOrders] = useState([]);
  const [oneTimeOrders, setOneTimeOrders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    const fetchBulkOrders = () => {
        setIsLoading(true);
        setError(null);
        setTimeout(() => {
            try {
                setBulkOrders(mockDatabase);
                setIsLoading(false);
            } catch (err) {
                setError('Failed to fetch bulk customers.');
                setIsLoading(false);
            }
        }, 1500);
    };
    fetchBulkOrders();
  }, []);
  const handleQuantityChange = (id, value) => {
      setBulkOrders(bulkOrders.map(order => order.id === id ? {...order, quantity: parseInt(value) || 0} : order));
  };
  const handleAddOneTimeOrder = (newOrder) => setOneTimeOrders([...oneTimeOrders, newOrder]);
  const handleDeleteOneTimeOrder = (id) => setOneTimeOrders(oneTimeOrders.filter(o => o.id !== id));
  const totalBulkMilk = [...bulkOrders, ...oneTimeOrders].reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const handleFinalize = () => {
    onNext({ bulkOrders, oneTimeOrders, totalBulkMilk });
  };
  const renderContent = () => {
    if (isLoading) { return <div style={styles.centeredMessage}>Loading customers...</div>; }
    if (error) { return <div style={styles.centeredMessage}>{error}</div>; }
    return (
      <>
        {oneTimeOrders.length > 0 && (
          <div style={styles.card}>
              <h3 style={styles.listSubHeader}>One-Time Orders</h3>
              {oneTimeOrders.map(order => (
                  <div key={order.id} style={styles.orderRow}>
                      <div>
                          <p style={styles.companyName}>{order.company_name}</p>
                          <p style={styles.areaName}>{order.area}</p>
                      </div>
                      <div style={styles.orderActions}>
                          <span style={styles.quantityText}>{order.quantity} L</span>
                          <button onClick={() => handleDeleteOneTimeOrder(order.id)} style={styles.deleteButton}>&times;</button>
                      </div>
                  </div>
              ))}
          </div>
        )}
        <div style={styles.card}>
            <h3 style={styles.listSubHeader}>Regular Bulk Customers</h3>
            {bulkOrders.map(order => (
                <div key={order.id} style={styles.orderRow}>
                    <div>
                        <p style={styles.companyName}>{order.company_name}</p>
                        <p style={styles.areaName}>{order.area}</p>
                    </div>
                    <div style={styles.orderActions}>
                        <input type="number" placeholder="0" value={order.quantity} onChange={(e) => handleQuantityChange(order.id, e.target.value)} style={{...styles.input, width: '100px', textAlign: 'center'}}/>
                    </div>
                </div>
            ))}
        </div>
      </>
    );
  };
  return (
    <>
      <AddOrderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAddOrder={handleAddOneTimeOrder} />
      <div style={styles.toolbar}>
        <div>
          <h2 style={styles.cardTitle}>Bulk Orders</h2>
          <p style={styles.dateDisplay}>{targetDate}</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} style={{...styles.baseButton, ...styles.addButtonSmall}}>+ Add Order</button>
      </div>
      {renderContent()}
      <div style={styles.stepActions}>
        <div style={styles.totalSummary}>
            <span>Total Bulk Milk</span>
            <strong>{totalBulkMilk} L</strong>
        </div>
        <div>
            <button onClick={onBack} style={{...styles.baseButton, ...styles.backButton, marginRight: '1rem'}}>Back</button>
            <button onClick={handleFinalize} style={{...styles.baseButton, ...styles.nextButton}}>Next: Review</button>
        </div>
      </div>
    </>
  );
};

const Step3_Review = ({ onBack, homeDeliveries, bulkOrderData, targetDate }) => {
    const router = useRouter(); 

    const activeHomeDeliveries = homeDeliveries.filter(d => d.liters > 0);
    const activeBulkOrders = [...bulkOrderData.bulkOrders, ...bulkOrderData.oneTimeOrders].filter(o => o.quantity > 0);
    
    const totalHomeDeliveryMilk = activeHomeDeliveries.reduce((sum, d) => sum + (Number(d.liters) || 0), 0);
    const totalBulkOrderMilk = bulkOrderData.totalBulkMilk;
    const grandTotal = totalHomeDeliveryMilk + totalBulkOrderMilk;

    const handleSubmitAndDownload = async () => {
        const doc = new jsPDF();

        // 1. Fetch the logo from the public folder
        const logoUrl = '/logo.png';
        const logoData = await getImageBase64(logoUrl);

        // 2. Define color palette
        const primaryColor = '#F59E0B';
        const headerBgColor = '#374151';
        const headerTextColor = '#FFFFFF';
        const footerBgColor = '#F3F4F6';
        const footerTextColor = '#111827';

        // 3. Add the logo to the PDF (if it was loaded successfully)
        if (logoData) {
            doc.addImage(logoData, 'PNG', 14, 12, 35, 12);
        }

        // 4. Add text and tables (adjusting for logo space)
        doc.setFontSize(20);
        doc.text('Daily Indent Report', 14, 35);
        doc.setFontSize(12);
        doc.text(`Date: ${targetDate}`, 14, 42);

        autoTable(doc, {
            startY: 50,
            head: [['Delivery Boy', 'Area', 'Milk Carried (L)']],
            body: activeHomeDeliveries.map(d => [d.deliveryBoy, d.area, d.liters]),
            headStyles: {
                fillColor: headerBgColor,
                textColor: headerTextColor,
                fontStyle: 'bold',
            },
            foot: [['Total', '', `${totalHomeDeliveryMilk}`]],
            footStyles: {
                fillColor: footerBgColor,
                textColor: footerTextColor,
                fontStyle: 'bold',
            },
            showFoot: 'last_page',
        });

        const bulkOrdersStartY = doc.lastAutoTable.finalY + 15;
        doc.text('Bulk Orders', 14, bulkOrdersStartY);

        autoTable(doc, {
            startY: bulkOrdersStartY + 8,
            head: [['Company Name', 'Area', 'Quantity (L)']],
            body: activeBulkOrders.map(item => [item.company_name, item.area, item.quantity]),
            headStyles: {
                fillColor: headerBgColor,
                textColor: headerTextColor,
                fontStyle: 'bold',
            },
            foot: [['Total', '', `${totalBulkOrderMilk}`]],
            footStyles: {
                fillColor: footerBgColor,
                textColor: footerTextColor,
                fontStyle: 'bold',
            },
            showFoot: 'last_page',
        });
        
        doc.setFontSize(14);
        doc.setTextColor(primaryColor);
        doc.setFont(undefined, 'bold');
        doc.text(`Grand Total Milk Dispatched: ${grandTotal} L`, 14, doc.lastAutoTable.finalY + 15);
        
        doc.save(`Indent_Report_${new Date().toISOString().split('T')[0]}.pdf`);

        alert('Indent submitted successfully!');
        router.push('/dashboard');
    };

    return (
        <div style={styles.card}>
            <h2 style={styles.cardTitle}>Final Indent Review</h2>
            <p style={styles.dateDisplay}>{targetDate}</p>
            
            <div style={styles.reviewSection}>
                <h3 style={styles.listSubHeader}>Home Deliveries Summary</h3>
                {activeHomeDeliveries.map(d => <div style={styles.reviewItem} key={d.id}><span>{d.deliveryBoy} ({d.area})</span> <span>{d.liters} L</span></div>)}
                <div style={styles.reviewTotal}>Total: <strong>{totalHomeDeliveryMilk} L</strong></div>
            </div>

            <div style={styles.reviewSection}>
                <h3 style={styles.listSubHeader}>Bulk Orders Summary</h3>
                {activeBulkOrders.map(d => <div style={styles.reviewItem} key={d.id}><span>{d.company_name} ({d.area})</span> <span>{d.quantity} L</span></div>)}
                <div style={styles.reviewTotal}>Total: <strong>{totalBulkOrderMilk} L</strong></div>
            </div>

             <div style={styles.grandTotalSection}>
                <span>Grand Total</span>
                <strong>{grandTotal} L</strong>
            </div>

            <div style={styles.stepActions}>
                <button onClick={onBack} style={{...styles.baseButton, ...styles.backButton}}>Back</button>
                <button onClick={handleSubmitAndDownload} style={{...styles.baseButton, ...styles.downloadButton}}>
                    Submit & Download PDF
                </button>
            </div>
        </div>
    );
};

export default function IndentPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [targetDate, setTargetDate] = useState('');
  const [homeDeliveries, setHomeDeliveries] = useState(
    deliveryBoys.map((boy, index) => ({ id: index, deliveryBoy: boy, area: deliveryBoyAreas[boy] || '', liters: '' }))
  );
  const [bulkOrderData, setBulkOrderData] = useState({ bulkOrders: [], oneTimeOrders: [], totalBulkMilk: 0 });
  useEffect(() => {
    const today = new Date();
    const isAfter8PM = today.getHours() >= 20;
    const dateToUse = new Date();
    if (isAfter8PM) { dateToUse.setDate(dateToUse.getDate() + 1); }
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setTargetDate(dateToUse.toLocaleDateString('en-IN', options));
  }, []);
  const handleNextStep1 = () => setCurrentStep(2);
  const handleNextStep2 = (data) => {
    setBulkOrderData(data);
    setCurrentStep(3);
  };
  const handleBack = () => setCurrentStep(prev => prev - 1);
  const steps = ['Home Deliveries', 'Bulk Orders', 'Review'];
  const renderStep = () => {
    switch (currentStep) {
      case 1: return <Step1_HomeDeliveries onNext={handleNextStep1} homeDeliveries={homeDeliveries} setHomeDeliveries={setHomeDeliveries} targetDate={targetDate} />;
      case 2: return <Step2_BulkOrders onNext={handleNextStep2} onBack={handleBack} targetDate={targetDate} />;
      case 3: return <Step3_Review onBack={handleBack} homeDeliveries={homeDeliveries} bulkOrderData={bulkOrderData} targetDate={targetDate} />;
      default: return null;
    }
  };
  return (
    <div style={styles.pageContainer}>
        <div style={styles.stepperContainer}>
            {steps.map((step, index) => {
                const stepNumber = index + 1;
                const isActive = currentStep === stepNumber;
                const isCompleted = currentStep > stepNumber;
                return (
                  <React.Fragment key={step}>
                    <div style={styles.stepItem}>
                      <div style={{ ...styles.stepCircle, ...(isActive && styles.activeStepCircle), ...(isCompleted && styles.completedStepCircle) }}>
                        {isCompleted ? <CheckIcon /> : stepNumber}
                      </div>
                      <div style={{ ...styles.stepLabel, ...(isActive && styles.activeStepLabel) }}>{step}</div>
                    </div>
                    {stepNumber < steps.length && (<div style={{ ...styles.stepConnector, ...(isCompleted && styles.completedStepConnector) }}></div>)}
                  </React.Fragment>
                );
            })}
        </div>
        <main>{renderStep()}</main>
    </div>
  );
}

const AddOrderModal = ({ isOpen, onClose, onAddOrder }) => {
    const [companyName, setCompanyName] = useState('');
    const [area, setArea] = useState('');
    const [quantity, setQuantity] = useState('');
    if (!isOpen) return null;
    const handleSubmit = (e) => {
        e.preventDefault();
        if(!companyName || !quantity) return;
        onAddOrder({ id: `custom-${Date.now()}`, company_name: companyName, area, quantity: Number(quantity) });
        setCompanyName(''); setArea(''); setQuantity('');
        onClose();
    };
    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                <h2 style={styles.cardTitle}>Add One-Time Bulk Order</h2>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Company Name</label>
                    <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} style={styles.input} required />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Area (Optional)</label>
                    <input type="text" value={area} onChange={e => setArea(e.target.value)} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Quantity (L)</label>
                    <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} style={styles.input} required />
                </div>
                <div style={styles.modalFooter}>
                    <button onClick={onClose} style={{...styles.baseButton, ...styles.backButton}}>Cancel</button>
                    <button onClick={handleSubmit} style={{...styles.baseButton, ...styles.nextButton}}>Add Order</button>
                </div>
            </div>
        </div>
    );
};

const styles = {
    pageContainer: { maxWidth: '640px', margin: '0 auto', padding: '1rem', paddingTop: '80px', fontFamily: "'Inter', sans-serif", backgroundColor: '#F9FAFB' },
    card: { backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '1.5rem', border: '1px solid #E5E7EB', marginBottom: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
    toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' },
    cardTitle: { marginTop: 0, marginBottom: '0.25rem', fontSize: '1.5rem', color: '#111827', fontWeight: 600 },
    dateDisplay: { marginTop: 0, marginBottom: '1.5rem', fontSize: '1rem', color: '#4B5563', fontWeight: '600' },
    stepperContainer: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2.5rem', padding: '0 0.5rem' },
    stepItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100px', flexShrink: 0 },
    stepCircle: { width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', border: '2px solid #D1D5DB', color: '#6B7280', fontWeight: '600', transition: 'all 0.3s ease-in-out', fontSize: '0.9rem' },
    activeStepCircle: { borderColor: '#F59E0B', color: '#F59E0B' },
    completedStepCircle: { backgroundColor: '#F59E0B', borderColor: '#F59E0B', color: '#FFFFFF' },
    stepLabel: { marginTop: '10px', color: '#6B7280', fontWeight: '500', fontSize: '0.875rem' },
    activeStepLabel: { color: '#111827', fontWeight: '600' },
    stepConnector: { flex: 1, height: '2px', backgroundColor: '#E5E7EB', margin: '0 -1rem', transform: 'translateY(17px)', transition: 'background-color 0.3s ease-in-out' },
    completedStepConnector: { backgroundColor: '#F59E0B' },
    formGroup: { marginBottom: '1.25rem' },
    label: { display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' },
    input: { boxSizing: 'border-box', width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '1rem', backgroundColor: '#F9FAFB' },
    listContainer: { borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem' },
    listHeaderRow: { display: 'flex', gap: '1rem', marginBottom: '0.5rem', padding: '0 0.5rem' },
    listHeaderCell: { color: '#6B7280', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' },
    dispatchRow: { display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' },
    deliveryBoyCell: { flex: 2.5, padding: '10px 14px', fontWeight: '500', color: '#111827', backgroundColor: '#F3F4F6', borderRadius: '8px'},
    centeredMessage: { padding: '3rem 1rem', textAlign: 'center', color: '#6B7280', fontSize: '1.1rem', fontWeight: '500' },
    stepActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem' },
    baseButton: { padding: '12px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    nextButton: { backgroundColor: '#F59E0B', color: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    disabledButton: { backgroundColor: '#E5E7EB', color: '#9CA3AF', cursor: 'not-allowed' },
    backButton: { backgroundColor: '#FFFFFF', color: '#374151', border: '1px solid #D1D5DB' },
    downloadButton: { backgroundColor: '#10B981', color: 'white' },
    addButtonSmall: { backgroundColor: '#F59E0B', color: '#FFFFFF', padding: '10px 16px', fontSize: '0.9rem', flexShrink: 0 },
    deleteButton: { backgroundColor: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem' },
    totalSummary: { fontSize: '1rem', color: '#374151', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' },
    modalContent: { backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
    modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' },
    listSubHeader: { marginTop: 0, marginBottom: '1rem', color: '#111827', fontWeight: '600', fontSize: '1.25rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.75rem' },
    orderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid #F3F4F6' },
    orderActions: { display: 'flex', alignItems: 'center', gap: '1rem' },
    companyName: { fontSize: '1rem', fontWeight: '500', margin: 0, color: '#1F2937' },
    areaName: { fontSize: '0.875rem', color: '#6B7280', margin: '2px 0 0 0' },
    quantityText: { fontWeight: '500', fontSize: '1rem', minWidth: '80px', textAlign: 'center' },
    reviewSection: { marginBottom: '1.5rem' },
    reviewItem: { display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #F3F4F6', fontSize: '1rem', color: '#374151' },
    reviewTotal: { textAlign: 'right', marginTop: '0.75rem', fontSize: '1.1rem', color: '#111827' },
    grandTotalSection: { marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px solid #111827', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '1.1rem', fontWeight: '600', color: '#111827' },
};