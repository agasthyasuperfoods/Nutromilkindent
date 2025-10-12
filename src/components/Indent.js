import React, { useState, useEffect } from 'react';


// --- Static Data ---
const deliveryBoys = ['Mahendra', 'Aslam', 'Shiva', 'Ramu', 'Bittu'];
const areas = ['Jubilee Hills', 'Kukatpally', 'Raidurg', 'Gachibowli', 'Financial District', 'Manikonda', 'Alkapur'];
const sampleBulkCustomers = [
  { id: 1, company_name: 'Daspalla Hotel', area: 'Jubilee Hills', quantity: 0 },
  { id: 2, company_name: 'Pragathinagar Supermarket', area: 'Kukatpally', quantity: 0 },
  { id: 3, company_name: 'Phoenix Software', area: 'Wipro circle', quantity: 0 },
  { id: 4, company_name: 'Dazn Company', area: 'Raidurg', quantity: 0 },
];

// --- SVG Icon for Completed Steps ---
const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);


// --- Helper Components for each Step ---

// STEP 1: Component for Home Deliveries
const Step1_HomeDeliveries = ({ onNext, homeDeliveries, setHomeDeliveries }) => {
  
  const handleDispatchChange = (id, field, value) => {
    setHomeDeliveries(homeDeliveries.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const canProceed = homeDeliveries.every(d => (Number(d.liters) > 0 ? d.area !== '' : true)) && homeDeliveries.some(d => Number(d.liters) > 0);
  const totalHomeDeliveryMilk = homeDeliveries.reduce((sum, d) => sum + (Number(d.liters) || 0), 0);

  return (
    <div style={styles.card}>
      <div style={styles.toolbar}>
        <div>
            <h2 style={styles.cardTitle}>Home Deliveries</h2>
            <p style={styles.cardSubtitle}>Assign milk to the pre-filled list of delivery boys.</p>
        </div>
      </div>

      <div style={styles.dispatchListContainer}>
        <div style={styles.dispatchRowHeader}>
            <div style={{...styles.dispatchHeaderCell, flex: 2}}>DELIVERY BOY</div>
            <div style={{...styles.dispatchHeaderCell, flex: 2}}>AREA</div>
            <div style={{...styles.dispatchHeaderCell, flex: 1}}>LITERS</div>
        </div>
        {homeDeliveries.map((dispatch) => (
          <div key={dispatch.id} style={styles.dispatchRow}>
            <div style={{...styles.input, flex: 2, display: 'flex', alignItems: 'center', backgroundColor: '#F9FAFB', fontWeight: '500' }}>
                {dispatch.deliveryBoy}
            </div>
            <select value={dispatch.area} onChange={(e) => handleDispatchChange(dispatch.id, 'area', e.target.value)} style={{...styles.input, flex: 2}}>
              <option value="">Select Area</option>
              {areas.map(area => <option key={area} value={area}>{area}</option>)}
            </select>
            <input type="number" placeholder="0" value={dispatch.liters} onChange={(e) => handleDispatchChange(dispatch.id, 'liters', e.target.value)} style={{...styles.input, flex: 1}} />
          </div>
        ))}
      </div>

      <div style={styles.stepActions}>
        <div style={styles.totalSummary}>
            Total Home Delivery Milk: <strong>{totalHomeDeliveryMilk} L</strong>
        </div>
        <button onClick={onNext} style={{...styles.baseButton, ...styles.nextButton}} disabled={!canProceed}>Next: Bulk Orders</button>
      </div>
    </div>
  );
};


// STEP 2: Component for Bulk Orders
const Step2_BulkOrders = ({ onNext, onBack }) => {
  const [bulkOrders, setBulkOrders] = useState(sampleBulkCustomers);
  const [oneTimeOrders, setOneTimeOrders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const handleQuantityChange = (id, value) => {
      setBulkOrders(bulkOrders.map(order => order.id === id ? {...order, quantity: parseInt(value) || 0} : order));
  };
  
  const handleAddOneTimeOrder = (newOrder) => setOneTimeOrders([...oneTimeOrders, newOrder]);
  const handleDeleteOneTimeOrder = (id) => setOneTimeOrders(oneTimeOrders.filter(o => o.id !== id));
  const totalBulkMilk = [...bulkOrders, ...oneTimeOrders].reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const handleFinalize = () => {
    onNext({ bulkOrders, oneTimeOrders, totalBulkMilk });
  };
  return (
    <div>
       <AddOrderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onAddOrder={handleAddOneTimeOrder} />
      <div style={styles.toolbar}>
          <h2 style={styles.cardTitle}>Bulk Orders</h2>
          <button onClick={() => setIsModalOpen(true)} style={{...styles.baseButton, ...styles.addButtonSmall}}>+ Add One-Time Order</button>
      </div>
      {oneTimeOrders.length > 0 && (
        <div style={styles.card}>
            <h3 style={styles.listHeader}>One-Time Orders</h3>
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
          <h3 style={styles.listHeader}>Regular Bulk Customers</h3>
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
      <div style={styles.stepActions}>
        <div style={styles.totalSummary}>
            Total Bulk Order Milk: <strong>{totalBulkMilk} L</strong>
        </div>
        <div>
            <button onClick={onBack} style={{...styles.baseButton, ...styles.backButton, marginRight: '1rem'}}>Back</button>
            <button onClick={handleFinalize} style={{...styles.baseButton, ...styles.nextButton}}>Next: Review Indent</button>
        </div>
      </div>
    </div>
  );
};


// STEP 3: Component for Review and PDF Export
const Step3_Review = ({ onBack, homeDeliveries, bulkOrderData }) => {
    const activeHomeDeliveries = homeDeliveries.filter(d => d.liters > 0);
    const totalHomeDeliveryMilk = activeHomeDeliveries.reduce((sum, d) => sum + (Number(d.liters) || 0), 0);
    const grandTotal = totalHomeDeliveryMilk + bulkOrderData.totalBulkMilk;

    const handleDownloadPdf = () => {
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text('Daily Indent Report', 14, 22);
        doc.setFontSize(12);
        doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, 14, 30);
        
        doc.setFontSize(14);
        doc.text('Home Deliveries', 14, 45);
        const homeDeliveryData = activeHomeDeliveries.map(d => [d.deliveryBoy, d.area, `${d.liters} L`]);
        
        autoTable(doc, {
            startY: 50,
            head: [['Delivery Boy', 'Area', 'Milk Carried']],
            body: homeDeliveryData,
            theme: 'striped',
            foot: [['Total', '', `${totalHomeDeliveryMilk} L`]],
            showFoot: 'last_page',
        });

        const bulkOrders = [...bulkOrderData.bulkOrders, ...bulkOrderData.oneTimeOrders].filter(o => o.quantity > 0);
        const bulkOrderTableData = bulkOrders.map(item => [item.company_name, item.area, item.quantity]);
        
        // FIXED: Use doc.lastAutoTable.finalY instead of doc.autoTable.previous.finalY
        const bulkOrdersStartY = doc.lastAutoTable.finalY + 15;
        doc.text('Bulk Orders', 14, bulkOrdersStartY);
        
        autoTable(doc, {
            startY: bulkOrdersStartY + 5,
            head: [['Company Name', 'Area', 'Quantity (L)']],
            body: bulkOrderTableData,
            theme: 'grid',
            foot: [['Total', '', `${bulkOrderData.totalBulkMilk} L`]],
            showFoot: 'last_page',
        });

        doc.setFontSize(14);
        // FIXED: Use doc.lastAutoTable.finalY instead of doc.autoTable.previous.finalY
        doc.text(`Grand Total Milk Dispatched: ${grandTotal} L`, 14, doc.lastAutoTable.finalY + 15);
        
        doc.save(`Indent_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div style={styles.card}>
            <h2 style={styles.cardTitle}>Final Indent Review</h2>
            <p style={styles.cardSubtitle}>Review all totals before generating the final report.</p>
            
            <div style={styles.reviewSection}>
                <h3 style={styles.listHeader}>Home Deliveries Summary</h3>
                {activeHomeDeliveries.map(d => <p style={styles.reviewItem} key={d.id}><span>{d.deliveryBoy} ({d.area}):</span> <span>{d.liters} L</span></p>)}
                <p style={styles.reviewTotal}>Total Home Delivery Milk: <strong>{totalHomeDeliveryMilk} L</strong></p>
            </div>

            <div style={styles.reviewSection}>
                <h3 style={styles.listHeader}>Bulk Orders Summary</h3>
                 {[...bulkOrderData.bulkOrders, ...bulkOrderData.oneTimeOrders].filter(o => o.quantity > 0).map(d => <p style={styles.reviewItem} key={d.id}><span>{d.company_name} ({d.area}):</span> <span>{d.quantity} L</span></p>)}
                <p style={styles.reviewTotal}>Total Bulk Order Milk: <strong>{bulkOrderData.totalBulkMilk} L</strong></p>
            </div>

             <div style={styles.grandTotalSection}>
                Grand Total: <strong>{grandTotal} L</strong>
            </div>

            <div style={styles.stepActions}>
                <button onClick={onBack} style={{...styles.baseButton, ...styles.backButton}}>Back</button>
                <button onClick={handleDownloadPdf} style={{...styles.baseButton, ...styles.downloadButton}}>Download as PDF</button>
            </div>
        </div>
    );
};


// --- The Main Stepper Component ---
export default function IndentPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [homeDeliveries, setHomeDeliveries] = useState(
    deliveryBoys.map((boy, index) => ({ id: index, deliveryBoy: boy, area: '', liters: '' }))
  );
  const [bulkOrderData, setBulkOrderData] = useState(null);
  
  const handleNextStep1 = () => setCurrentStep(2);
  const handleNextStep2 = (data) => {
    setBulkOrderData(data);
    setCurrentStep(3);
  };
  const handleBack = () => setCurrentStep(prev => prev - 1);

  const steps = ['Home Deliveries', 'Bulk Orders', 'Review'];
  
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1_HomeDeliveries onNext={handleNextStep1} homeDeliveries={homeDeliveries} setHomeDeliveries={setHomeDeliveries} />;
      case 2:
        return <Step2_BulkOrders onNext={handleNextStep2} onBack={handleBack} />;
      case 3:
        return <Step3_Review onBack={handleBack} homeDeliveries={homeDeliveries} bulkOrderData={bulkOrderData} />;
      default:
        return <Step1_HomeDeliveries onNext={handleNextStep1} homeDeliveries={homeDeliveries} setHomeDeliveries={setHomeDeliveries} />;
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
                      <div style={{
                        ...styles.stepCircle,
                        ...(isActive ? styles.activeStepCircle : {}),
                        ...(isCompleted ? styles.completedStepCircle : {})
                      }}>
                        {isCompleted ? <CheckIcon /> : stepNumber}
                      </div>
                      <div style={{
                        ...styles.stepLabel,
                        ...(isActive ? styles.activeStepLabel : {}),
                        ...(isCompleted ? styles.completedStepLabel : {})
                      }}>
                        {step}
                      </div>
                    </div>
                    {stepNumber < steps.length && (
                      <div style={{
                        ...styles.stepConnector,
                        ...(isCompleted ? styles.completedStepConnector : {})
                      }}></div>
                    )}
                  </React.Fragment>
                );
            })}
        </div>
        {renderStep()}
    </div>
  );
}

// --- AddOrderModal defined here to be self-contained ---
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
                    <label style={styles.label}>Area</label>
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

// --- REDESIGNED STYLES ---
const styles = {
    pageContainer: { maxWidth: '800px', margin: '40px auto', padding: '1.5rem', fontFamily: "'Inter', sans-serif", backgroundColor: '#F9FAFB' },
    // REDESIGNED STEPPER STYLES
    stepperContainer: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2.5rem', padding: '0 1rem' },
    stepItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '120px' },
    stepCircle: { width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', border: '2px solid #D1D5DB', color: '#6B7280', fontWeight: '700', transition: 'all 0.3s ease-in-out', fontSize: '0.9rem' },
    activeStepCircle: { borderColor: '#FBBF24', color: '#FBBF24' },
    completedStepCircle: { backgroundColor: '#FBBF24', borderColor: '#FBBF24', color: '#FFFFFF' },
    stepLabel: { marginTop: '12px', color: '#6B7280', fontWeight: '500', fontSize: '0.9rem' },
    activeStepLabel: { color: '#111827', fontWeight: '700' },
    completedStepLabel: { color: '#374151' },
    stepConnector: { flex: 1, height: '2px', backgroundColor: '#E5E7EB', transform: 'translateY(17px)', zIndex: -1, transition: 'background-color 0.3s ease-in-out' },
    completedStepConnector: { backgroundColor: '#FBBF24' },
    
    // OTHER STYLES (tweaked for consistency)
    card: { backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '2rem', border: '1px solid #E5E7EB', marginBottom: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)' },
    cardTitle: { marginTop: 0, fontSize: '1.5rem', color: '#111827', fontWeight: 600 },
    cardSubtitle: { marginTop: '4px', fontSize: '1rem', color: '#6B7280' },
    formGroup: { marginBottom: '1.5rem' },
    label: { display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' },
    input: { width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '1rem', transition: 'border-color 0.2s, box-shadow 0.2s' },
    stepActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginTop: '2rem', borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem' },
    baseButton: { padding: '12px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', transition: 'all 0.2s ease' },
    nextButton: { backgroundColor: '#FBBF24', color: '#1F2937', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
    backButton: { backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' },
    downloadButton: { backgroundColor: '#10B981', color: 'white' },
    toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
    addButtonSmall: { padding: '10px 16px', backgroundColor: '#FBBF24', color: '#1F2937' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    modalContent: { backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' },
    modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' },
    dispatchListContainer: { borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem' },
    dispatchRowHeader: { display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem', padding: '0 0.5rem' },
    dispatchHeaderCell: { color: '#6B7280', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' },
    dispatchRow: { display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem'},
    deleteButton: { backgroundColor: '#FEE2E2', color: '#EF4444', border: 'none', borderRadius: '8px', width: '44px', height: '44px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', minWidth: '44px' },
    totalSummary: { fontSize: '1.1rem', color: '#111827', fontWeight: '600' },
    listHeader: { marginTop: 0, marginBottom: '1rem', color: '#111827', fontWeight: '600', fontSize: '1.25rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '0.75rem' },
    orderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid #F3F4F6' },
    companyName: { fontSize: '1rem', fontWeight: '500', margin: 0, color: '#1F2937' },
    areaName: { fontSize: '0.875rem', color: '#6B7280', margin: '2px 0 0 0' },
    orderActions: { display: 'flex', alignItems: 'center', gap: '1rem' },
    quantityText: { fontWeight: '500', fontSize: '1rem', minWidth: '80px', textAlign: 'center' },
    reviewSection: { marginBottom: '2rem' },
    reviewItem: { display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #F3F4F6', fontSize: '1rem' },
    reviewTotal: { textAlign: 'right', marginTop: '1rem', fontSize: '1.1rem', fontWeight: '600' },
    grandTotalSection: { marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '2px solid #111827', textAlign: 'right', fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' },
};

