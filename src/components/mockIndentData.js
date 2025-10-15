// This file simulates a database of past indents.
// In a real application, this data would come from your API.
// I have added sample data for October and September 2025 to show how the month filter works.

export const mockIndentData = [
  // --- October 2025 Data ---
  {
    date: '2025-10-14',
    homeDeliveries: [
      { deliveryBoy: 'Mahendra', liters: 22 },
      { deliveryBoy: 'Aslam', liters: 122 },
      { deliveryBoy: 'Ramu', liters: 12 },
    ],
    bulkOrders: [
      { company_name: 'Daspalla Hotel', quantity: 1221 },
      { company_name: 'Pragathinagar Supermarket', quantity: 2121 },
      { company_name: 'Phoenix Software', quantity: 21 },
      { company_name: 'Dazn Company', quantity: 220 },
    ],
  },
  {
    date: '2025-10-13',
    homeDeliveries: [
      { deliveryBoy: 'Mahendra', liters: 25 },
      { deliveryBoy: 'Aslam', liters: 130 },
      { deliveryBoy: 'Shiva', liters: 50 },
      { deliveryBoy: 'Bittu', liters: 70 },
    ],
    bulkOrders: [
      { company_name: 'Daspalla Hotel', quantity: 1200 },
      { company_name: 'Pragathinagar Supermarket', quantity: 2100 },
    ],
  },
  // --- September 2025 Data ---
  {
    date: '2025-09-15',
    homeDeliveries: [
      { deliveryBoy: 'Mahendra', liters: 20 },
      { deliveryBoy: 'Aslam', liters: 110 },
      { deliveryBoy: 'Ramu', liters: 15 },
    ],
    bulkOrders: [
      { company_name: 'Daspalla Hotel', quantity: 1150 },
      { company_name: 'Phoenix Software', quantity: 50 },
    ],
  },
  {
    date: '2025-09-14',
    homeDeliveries: [
      { deliveryBoy: 'Mahendra', liters: 21 },
      { deliveryBoy: 'Aslam', liters: 115 },
      { deliveryBoy: 'Shiva', liters: 45 },
      { deliveryBoy: 'Bittu', liters: 65 },
    ],
    bulkOrders: [
      { company_name: 'Pragathinagar Supermarket', quantity: 2050 },
      { company_name: 'Dazn Company', quantity: 210 },
    ],
  },
];