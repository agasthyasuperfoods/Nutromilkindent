import React, { useState } from 'react';
import Indent from './Indent';

function Maindash() {
  // State for collapsible sections
  const [deliveryBoysExpanded, setDeliveryBoysExpanded] = useState(false);
  const [bulkCustomersExpanded, setBulkCustomersExpanded] = useState(false);
  const [showIndentModal, setShowIndentModal] = useState(false);
  
  // Set default date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [selectedDate, setSelectedDate] = useState(tomorrow);

  // Mock data - replace with actual API data later
  const deliveryBoysData = [
    { id: 1, name: 'Raj Kumar', area: 'Area A', milkQuantity: '50L' },
    { id: 2, name: 'Suresh Patel', area: 'Area B', milkQuantity: '35L' },
    { id: 3, name: 'Amit Sharma', area: 'Area C', milkQuantity: '42L' },
    { id: 4, name: 'Vikram Singh', area: 'Area A', milkQuantity: '28L' },
  ];

  const bulkCustomersData = [
    { id: 1, name: 'Hotel Grand', area: 'Commercial', totalMilk: '120L' },
    { id: 2, name: 'Restaurant Spice', area: 'Commercial', totalMilk: '85L' },
    { id: 3, name: 'Cafe Coffee', area: 'Commercial', totalMilk: '65L' },
    { id: 4, name: 'School Canteen', area: 'Institutional', totalMilk: '95L' },
  ];

  // Format date for display
  const formatDisplayDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCreateIndent = () => {
    setShowIndentModal(true);
  };

  const handleCloseModal = () => {
    setShowIndentModal(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto font-sans w-full">
      {/* First Row - Date Picker and Action Buttons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 pt-16 md:pt-19 mb-6 md:mb-8">
        
        {/* Date Picker Section */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm ">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Select Date for Indent</h3>
            <button 
              onClick={() => setSelectedDate(tomorrow)}
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
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
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
              className="bg-amber-500 hover:bg-amber-600 text-white py-3 px-6 rounded-lg font-medium transition-all duration-200 hover:shadow-md"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Indent
              </span>
            </button>
            <button className="bg-amber-50 hover:bg-amber-100 text-amber-700 py-3 px-6 rounded-lg font-medium transition-all duration-200 hover:shadow-md border border-amber-200">
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Indent
              </span>
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
              {/* Header Row */}
              <div className="grid grid-cols-3 gap-2 md:gap-4 p-3 md:p-4 bg-gray-50 font-semibold text-gray-700 border-b border-gray-200 text-xs md:text-sm">
                <span className="text-gray-600">Name</span>
                <span className="text-gray-600">Area</span>
                <span className="text-gray-600">Milk Quantity</span>
              </div>
              
              {/* Data Rows */}
              {deliveryBoysData.map((boy) => (
                <div 
                  key={boy.id} 
                  className="grid grid-cols-3 gap-2 md:gap-4 p-3 md:p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 last:border-b-0 text-sm md:text-base"
                >
                  <span className="font-medium text-gray-900 truncate">{boy.name}</span>
                  <span className="text-gray-700 truncate">{boy.area}</span>
                  <span className="text-green-700 font-semibold">{boy.milkQuantity}</span>
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
                {bulkCustomersData.reduce((total, customer) => 
                  total + parseInt(customer.totalMilk), 0
                )}L Total
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
              {/* Header Row */}
              <div className="grid grid-cols-3 gap-2 md:gap-4 p-3 md:p-4 bg-gray-50 font-semibold text-gray-700 border-b border-gray-200 text-xs md:text-sm">
                <span className="text-gray-600">Customer Name</span>
                <span className="text-gray-600">Type</span>
                <span className="text-gray-600">Total Milk</span>
              </div>
              
              {/* Data Rows */}
              {bulkCustomersData.map((customer) => (
                <div 
                  key={customer.id} 
                  className="grid grid-cols-3 gap-2 md:gap-4 p-3 md:p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 last:border-b-0 text-sm md:text-base"
                >
                  <span className="font-medium text-gray-900 truncate">{customer.name}</span>
                  <span className="text-gray-700 truncate">{customer.area}</span>
                  <span className="text-green-700 font-semibold">{customer.totalMilk}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Modal for Mobile */}
      {showIndentModal && (
        <div className="fixed inset-0 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-lg w-full md:max-w-4xl h-[90vh] md:max-h-[90vh] overflow-hidden flex flex-col md:shadow-lg">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 md:p-6  bg-white">
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
            
            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto">
              <Indent 
                selectedDate={selectedDate}
                onClose={handleCloseModal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Maindash;