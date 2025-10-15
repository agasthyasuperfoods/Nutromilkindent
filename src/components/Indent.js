import React, { useState } from 'react';

function Indent({ selectedDate, onClose }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [deliveryBoys, setDeliveryBoys] = useState([
    { id: 1, name: 'Raj Kumar', area: 'Area A', milkQuantity: '50', image: null },
    { id: 2, name: 'Suresh Patel', area: 'Area B', milkQuantity: '35', image: null },
    { id: 3, name: 'Amit Sharma', area: 'Area C', milkQuantity: '42', image: null },
    { id: 4, name: 'Vikram Singh', area: 'Area A', milkQuantity: '28', image: null },
    { id: 5, name: 'Rahul Verma', area: 'Area D', milkQuantity: '45', image: null },
  ]);

  const [bulkCustomers, setBulkCustomers] = useState([
    { id: 1, name: 'Hotel Grand', type: 'Commercial', totalMilk: '120', containerType: 'cans', image: null },
    { id: 2, name: 'Restaurant Spice', type: 'Commercial', totalMilk: '85', containerType: 'cans', image: null },
    { id: 3, name: 'Cafe Coffee', type: 'Commercial', totalMilk: '65', containerType: 'pouches', image: null },
    { id: 4, name: 'School Canteen', type: 'Institutional', totalMilk: '95', containerType: 'cans', image: null },
  ]);

  // Format date for display
  const formatDisplayDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle milk quantity change for delivery boys
  const handleDeliveryBoyQuantityChange = (id, quantity) => {
    setDeliveryBoys(prev => prev.map(boy => 
      boy.id === id ? { ...boy, milkQuantity: quantity } : boy
    ));
  };

  // Handle milk quantity change for bulk customers
  const handleBulkCustomerQuantityChange = (id, quantity) => {
    setBulkCustomers(prev => prev.map(customer => 
      customer.id === id ? { ...customer, totalMilk: quantity } : customer
    ));
  };

  // Handle container type change for bulk customers
  const handleContainerTypeChange = (id, containerType) => {
    setBulkCustomers(prev => prev.map(customer => 
      customer.id === id ? { ...customer, containerType } : customer
    ));
  };

  // Handle image upload
  const handleImageUpload = (id, type, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (type === 'delivery') {
          setDeliveryBoys(prev => prev.map(boy => 
            boy.id === id ? { ...boy, image: e.target.result } : boy
          ));
        } else {
          setBulkCustomers(prev => prev.map(customer => 
            customer.id === id ? { ...customer, image: e.target.result } : customer
          ));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Calculate totals
  const totalDeliveryMilk = deliveryBoys.reduce((sum, boy) => sum + parseInt(boy.milkQuantity || 0), 0);
  const totalBulkMilk = bulkCustomers.reduce((sum, customer) => sum + parseInt(customer.totalMilk || 0), 0);

  // Stepper navigation
  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // Submit handler
  const handleSubmit = () => {
    const indentData = {
      date: selectedDate,
      deliveryBoys,
      bulkCustomers,
      totalDeliveryMilk,
      totalBulkMilk,
      grandTotal: totalDeliveryMilk + totalBulkMilk
    };
    
    console.log('Indent submitted:', indentData);
    alert(`Indent created successfully!\nTotal Milk: ${totalDeliveryMilk + totalBulkMilk}L`);
    onClose();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Stepper Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 md:gap-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep >= 1 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            1
          </div>
          <span className={`text-sm md:text-base font-medium ${currentStep >= 1 ? 'text-amber-600' : 'text-gray-500'}`}>
            Delivery Boys
          </span>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep >= 2 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            2
          </div>
          <span className={`text-sm md:text-base font-medium ${currentStep >= 2 ? 'text-amber-600' : 'text-gray-500'}`}>
            Bulk Customers
          </span>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep >= 3 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            3
          </div>
          <span className={`text-sm md:text-base font-medium ${currentStep >= 3 ? 'text-amber-600' : 'text-gray-500'}`}>
            Review
          </span>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Delivery Boys Milk Allocation</h3>
            
            {deliveryBoys.map((boy) => (
              <div key={boy.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-4 mb-3">
                  {/* Image Upload */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-amber-200">
                      {boy.image ? (
                        <img src={boy.image} alt={boy.name} className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(boy.id, 'delivery', e)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="absolute bottom-0 right-0 bg-amber-500 rounded-full p-1">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </div>

                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{boy.name}</h4>
                    <p className="text-sm text-gray-600">{boy.area}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    Milk Quantity (L):
                  </label>
                  <input
                    type="number"
                    value={boy.milkQuantity}
                    onChange={(e) => handleDeliveryBoyQuantityChange(boy.id, e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    min="0"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Bulk Customers Milk Allocation</h3>
            
            {bulkCustomers.map((customer) => (
              <div key={customer.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-4 mb-3">
                  {/* Image Upload */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-amber-200">
                      {customer.image ? (
                        <img src={customer.image} alt={customer.name} className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(customer.id, 'bulk', e)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="absolute bottom-0 right-0 bg-amber-500 rounded-full p-1">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                  </div>

                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{customer.name}</h4>
                    <p className="text-sm text-gray-600">{customer.type}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                      Total Milk (L):
                    </label>
                    <input
                      type="number"
                      value={customer.totalMilk}
                      onChange={(e) => handleBulkCustomerQuantityChange(customer.id, e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      min="0"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                      Container Type:
                    </label>
                    <select
                      value={customer.containerType}
                      onChange={(e) => handleContainerTypeChange(customer.id, e.target.value)}
                      className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="cans">Cans</option>
                      <option value="pouches">Milk Pouches</option>
                      <option value="bottles">Bottles</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Review Indent</h3>
            
            {/* Delivery Boys Summary */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Delivery Boys</h4>
              <div className="space-y-2">
                {deliveryBoys.map((boy) => (
                  <div key={boy.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {boy.image && (
                        <img src={boy.image} alt={boy.name} className="w-10 h-10 rounded-full object-cover" />
                      )}
                      <div>
                        <p className="font-medium text-gray-800">{boy.name}</p>
                        <p className="text-sm text-gray-600">{boy.area}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-amber-600">{boy.milkQuantity}L</span>
                  </div>
                ))}
                <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="font-semibold text-gray-800">Total Delivery Milk</span>
                  <span className="font-bold text-amber-700">{totalDeliveryMilk}L</span>
                </div>
              </div>
            </div>

            {/* Bulk Customers Summary */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Bulk Customers</h4>
              <div className="space-y-2">
                {bulkCustomers.map((customer) => (
                  <div key={customer.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {customer.image && (
                        <img src={customer.image} alt={customer.name} className="w-10 h-10 rounded-lg object-cover" />
                      )}
                      <div>
                        <p className="font-medium text-gray-800">{customer.name}</p>
                        <p className="text-sm text-gray-600">{customer.type} • {customer.containerType}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-amber-600">{customer.totalMilk}L</span>
                  </div>
                ))}
                <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="font-semibold text-gray-800">Total Bulk Milk</span>
                  <span className="font-bold text-amber-700">{totalBulkMilk}L</span>
                </div>
              </div>
            </div>

            {/* Grand Total */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-800 text-lg">Grand Total</span>
                <span className="font-bold text-green-700 text-lg">
                  {totalDeliveryMilk + totalBulkMilk}L
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                For delivery on {formatDisplayDate(selectedDate)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex justify-between">
          {currentStep > 1 ? (
            <button
              onClick={prevStep}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Previous
            </button>
          ) : (
            <div></div>
          )}

          {currentStep < 3 ? (
            <button
              onClick={nextStep}
              className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Submit Indent
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Indent;