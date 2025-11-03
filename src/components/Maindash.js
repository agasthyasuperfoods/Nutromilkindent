// src/components/Maindash.js

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import Indent from './Indent';
import Swal from 'sweetalert2';

function Maindash() {
  const [deliveryBoysExpanded, setDeliveryBoysExpanded] = useState(false);
  const [bulkCustomersExpanded, setBulkCustomersExpanded] = useState(false);
  const [showIndentModal, setShowIndentModal] = useState(false); 
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [isIndentAlreadySubmitted, setIsIndentAlreadySubmitted] = useState(false);
  
  // Helper: Get tomorrow's date as YYYY-MM-DD string in local timezone
  const getTomorrowLocalDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // State: Store date as YYYY-MM-DD string
  const [selectedDate, setSelectedDate] = useState(getTomorrowLocalDate());

  // Delivery & bulk state
  const [deliveryBoysData, setDeliveryBoysData] = useState([]);
  const [bulkCustomersData, setBulkCustomersData] = useState([]);

  // Helper: Convert YYYY-MM-DD string to Date object in local timezone
  const getDateFromString = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Helper: Format date for display
  const formatDisplayDate = (dateStr) => {
    return getDateFromString(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Check if indent already exists for selected date
  useEffect(() => {
    let mounted = true;

    async function checkIndentStatus() {
      try {
        const res = await fetch(`/api/indent-exists?date=${encodeURIComponent(selectedDate)}`);
        if (!res.ok) throw new Error('Indent status check failed');
        
        const { exists } = await res.json();
        
        if (mounted) {
          setIsIndentAlreadySubmitted(!!exists);
        }
      } catch (err) {
        console.error('checkIndentStatus error:', err);
        if (mounted) {
          setIsIndentAlreadySubmitted(false);
        }
      }
    }
    
    // Check if the current date is in the future
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    if (selectedDate && selectedDate >= todayStr) {
      checkIndentStatus();
    } else {
      setIsIndentAlreadySubmitted(true); 
    }

    return () => { mounted = false; };
  }, [selectedDate]);

  // Load delivery boys from API
  useEffect(() => {
    let mounted = true;
    (async function loadDeliveryBoys() {
      try {
        const res = await fetch('/api/delivery-boys');
        if (!res.ok) throw new Error('delivery-boys fetch failed');
        const json = await res.json();
        const rows = json?.rows ?? [];
        if (Array.isArray(rows) && mounted) {
          const mapped = rows.map((r) => ({
            id: r.employee_id ?? r.id ?? `d-${Math.random()}`,
            name: r.delivery_boy_name ?? r.name ?? 'Unnamed',
            area: r.delivery_area ?? r.area ?? '',
            milkQuantity: (r.default_quantity ? String(r.default_quantity) : '33') + 'L',
            mobile: r.mobile_number ?? r.mobile ?? '',
            customArea: '',
          }));
          setDeliveryBoysData(mapped);
          return;
        }
      } catch (err) {
        console.error('loadDeliveryBoys error:', err);
      }
      if (mounted && deliveryBoysData.length === 0) {
        setDeliveryBoysData([
          { id: 1, name: 'Raj Kumar', area: 'Area A', milkQuantity: '50L', customArea: '' },
          { id: 2, name: 'Suresh Patel', area: 'Area B', milkQuantity: '35L', customArea: '' },
          { id: 3, name: 'Amit Sharma', area: 'Area C', milkQuantity: '42L', customArea: '' },
        ]);
      }
    })();
    return () => (mounted = false);
  }, []);

  // Load bulk customers for selected date
  useEffect(() => {
    let mounted = true;
    (async function loadBulkCustomers() {
      try {
        const res = await fetch(`/api/bulk-customers?date=${encodeURIComponent(selectedDate)}`);
        if (!res.ok) throw new Error('bulk-customers fetch failed');
        const json = await res.json();
        const rows = json?.rows ?? [];
        if (Array.isArray(rows) && mounted) {
          const mapped = rows.map((r) => ({
            id: r.company_id ?? r.id ?? `b-${Math.random()}`,
            name: r.company_name ?? r.name ?? 'Unnamed',
            area: r.area ?? '',
            totalMilk: (typeof r.quantity === 'number' ? r.quantity : Number(r.quantity || 0)) + 'L',
            mobile: r.mobile_number ?? r.mobile ?? '',
          }));
          setBulkCustomersData(mapped);
          return;
        }
      } catch (err) {
        console.error('loadBulkCustomers error:', err);
      }
      if (mounted && bulkCustomersData.length === 0) {
        setBulkCustomersData([
          { id: 1, name: 'Hotel Grand', area: 'Commercial', totalMilk: '120L' },
          { id: 2, name: 'Restaurant Spice', area: 'Commercial', totalMilk: '85L' },
        ]);
      }
    })();
    return () => (mounted = false);
  }, [selectedDate]);

  // Compute bulk customers count for header badge
  const bulkCustomersCount = useMemo(() => bulkCustomersData.length, [bulkCustomersData]);

  // Callback to be triggered by the Indent modal upon successful submission
 // ✅ AFTER - No duplicate popup
const handleIndentSubmissionSuccess = useCallback(() => {
  setShowIndentModal(false);
  setIsIndentAlreadySubmitted(true);
  // Removed Swal popup - Indent.js already shows it
}, [selectedDate]);

  // Function to directly download the latest indent
  const handleDownloadLatestIndent = async () => {
    setLoadingDownload(true);
    try {
      const downloadUrl = `/api/generate-and-download-indent?date=${selectedDate}`;
      
      Swal.fire({
        title: 'Preparing Indent...',
        text: 'Fetching data from database and generating PDF.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      window.location.href = downloadUrl;
      
      await new Promise(resolve => setTimeout(resolve, 500)); 
      
      Swal.close();
      await Swal.fire({ 
        icon: 'success', 
        title: 'Generation Complete', 
        text: `Indent for ${formatDisplayDate(selectedDate)} is downloading.`,
        timer: 3000,
        showConfirmButton: false
      });
      
    } catch (error) {
      console.error('Download error:', error);
      Swal.close();
      await Swal.fire({ 
        icon: 'error', 
        title: 'Download Failed', 
        text: error.message || 'PDF generation failed. Check the server logs.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setLoadingDownload(false);
    }
  };

  const handleCreateIndent = () => {
    setShowIndentModal(true);
  };

  const handleCloseModal = () => {
    setShowIndentModal(false);
  };
  
  // Determine if the Create button should be disabled
  const isCreateButtonDisabled = isIndentAlreadySubmitted;
  
  // Tooltip message for the disabled button
  const disabledMessage = isIndentAlreadySubmitted 
    ? `An indent for ${formatDisplayDate(selectedDate)} has already been submitted.`
    : 'Create Indent';

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 max-w-6xl mx-auto font-sans w-full pb-24">
      {/* First Row - Date Picker and Action Buttons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mt-16 mb-6 md:mb-8">
        
        {/* Date Picker Section */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm ">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Select Date for Indent</h3>
            <button 
              onClick={() => setSelectedDate(getTomorrowLocalDate())}
              className="text-sm text-amber-600 hover:text-amber-800 font-medium"
            >
              Reset to Tomorrow
            </button>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-700"
              />
            </div>
            <div className="flex flex-col justify-center text-center md:text-left">
              <span className="text-sm text-gray-600 font-medium">
                Selected Date:
              </span>
              <span className="text-lg font-semibold text-amber-700">
                {formatDisplayDate(selectedDate)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleCreateIndent}
              disabled={isCreateButtonDisabled}
              className={`group relative text-white py-3 px-6 rounded-lg font-medium transition-all duration-200 hover:shadow-md ${
                isCreateButtonDisabled 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-amber-500 hover:bg-amber-600'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {isIndentAlreadySubmitted ? 'Indent Submitted' : 'Create Indent'}
              </span>
              {isIndentAlreadySubmitted && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max p-2 text-xs text-white bg-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  {disabledMessage}
                </span>
              )}
            </button>
            
            <button 
              onClick={handleDownloadLatestIndent}
              disabled={loadingDownload}
              className={`bg-amber-300 hover:bg-amber-400 text-white py-3 px-6 rounded-lg font-medium transition-all duration-200 hover:shadow-md flex items-center justify-center gap-2 ${
                loadingDownload ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loadingDownload ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Downloading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Latest Indent
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Sections */}
      <div className="space-y-4 md:space-y-6">
        
        {/* Delivery Boys Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div 
            className="flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors duration-200 border-b border-gray-200"
            onClick={() => setDeliveryBoysExpanded(!deliveryBoysExpanded)}
          >
            <div className="flex items-center gap-4">
              <span className="text-lg font-semibold text-gray-800">Delivery Boys</span>
              <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium border border-amber-200">
                {deliveryBoysData.length} Active
              </span>
            </div>
            <span className={`transform transition-transform duration-200 text-gray-600 ${deliveryBoysExpanded ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>

          {deliveryBoysExpanded && (
            <div>
              <div className="grid grid-cols-2 gap-2 md:gap-4 p-3 md:p-4 bg-gray-50 font-semibold text-gray-700 border-b border-gray-200 text-xs md:text-sm">
                <span className="text-gray-600">Name</span>
                <span className="text-gray-600 text-right">Area</span>
              </div>
              
              {deliveryBoysData.map((boy) => (
                <div 
                  key={boy.id} 
                  className="grid grid-cols-2 gap-2 md:gap-4 p-3 md:p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 last:border-b-0 text-sm md:text-base items-center"
                >
                  <span className="font-medium text-gray-900 truncate">{boy.name}</span>
                  <div className="text-right text-gray-700 truncate">
                    {boy.customArea ? boy.customArea : boy.area || '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bulk Customers Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div 
            className="flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors duration-200 border-b border-gray-200"
            onClick={() => setBulkCustomersExpanded(!bulkCustomersExpanded)}
          >
            <div className="flex items-center gap-4">
              <span className="text-lg font-semibold text-gray-800">Bulk Customers</span>
              <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium border border-amber-200">
                {bulkCustomersCount} Customers
              </span>
            </div>
            <span className={`transform transition-transform duration-200 text-gray-600 ${bulkCustomersExpanded ? 'rotate-180' : ''}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </div>

          {bulkCustomersExpanded && (
            <div>
              <div className="grid grid-cols-2 gap-2 md:gap-4 p-3 md:p-4 bg-gray-50 font-semibold text-gray-700 border-b border-gray-200 text-xs md:text-sm">
                <span className="text-gray-600">Customer Name</span>
                <span className="text-gray-600 text-right">Area</span>
              </div>
              
              {bulkCustomersData.map((customer) => (
                <div 
                  key={customer.id} 
                  className="grid grid-cols-2 gap-2 md:gap-4 p-3 md:p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 last:border-b-0 text-sm md:text-base"
                >
                  <span className="font-medium text-gray-900 truncate">{customer.name}</span>
                  <span className="text-gray-700 truncate text-right">{customer.area || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Indent Modal */}
      {showIndentModal && (
        <div className="fixed inset-0 flex items-end md:items-center justify-center z-50 bg-black/40">
          <div className="bg-white rounded-t-none md:rounded-lg w-full md:max-w-4xl h-[90vh] md:max-h-[90vh] flex flex-col md:shadow-lg border-none outline-none">
            <div className="flex justify-between items-center p-4 md:p-6 bg-white">
              <h2 className="text-xl font-semibold text-gray-800">
                Create Indent - {formatDisplayDate(selectedDate)}
              </h2>
              <button 
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
          <Indent 
  selectedDate={selectedDate}  // ✅ Pass string directly
  onClose={handleCloseModal}
  onSubmissionSuccess={handleIndentSubmissionSuccess}
/>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Maindash;
