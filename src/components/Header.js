import React, { useState } from 'react';

// A simple, self-contained SVG icon for the 'Add Customer' button.
const AddCustomerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="8.5" cy="7" r="4"></circle>
    <line x1="20" y1="8" x2="20" y2="14"></line>
    <line x1="17" y1="11" x2="23" y2="11"></line>
  </svg>
);

// We export the height so the parent page knows how much padding to add.
export const HEADER_HEIGHT = '75px'; 

export default function Header({ onAddCustomerClick }) {
  const [isAddHovered, setIsAddHovered] = useState(false);

  // Dynamically apply hover styles
  const addButtonStyle = { 
    ...styles.baseButton, 
    ...styles.addCustomerButton, 
    ...(isAddHovered ? styles.addCustomerButtonHover : {}) 
  };

  return (
    <header style={styles.header}>
      <div style={styles.branding}>
        <img src="/Logo.png" alt="Agasthya Logo" style={styles.logo} onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/120x50/FFFFFF/000000?text=Logo'; }} />
      </div>
      
      <div style={styles.actionsContainer}>
        <button 
          style={addButtonStyle} 
          onClick={onAddCustomerClick} // This prop will trigger the action in the parent page
          onMouseEnter={() => setIsAddHovered(true)}
          onMouseLeave={() => setIsAddHovered(false)}
        >
          <AddCustomerIcon />
          <span>Add customer</span>
        </button>
      </div>
    </header>
  );
}

const styles = {
  header: { 
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: HEADER_HEIGHT,
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '0 24px',
    backgroundColor: '#FFFFFF', 
    borderBottom: '1px solid #E5E7EB', 
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    zIndex: 1000,
  },
  branding: { 
    display: 'flex', 
    alignItems: 'center' 
  },
  logo: { 
    height: '50px', 
    width: 'auto' 
  },
  actionsContainer: { 
    display: 'flex', 
    alignItems: 'center' 
  },
  baseButton: { 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: '10px 20px', 
    border: '1px solid', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    fontWeight: '600', 
    fontSize: '1rem', 
    lineHeight: '1.2', 
    transition: 'all 0.2s ease-in-out',
  },
  addCustomerButton: { 
    backgroundColor: '#FBBF24', 
    color: '#1F2937', 
    borderColor: '#FBBF24', 
  },
  addCustomerButtonHover: { 
    backgroundColor: '#F59E0B', 
    borderColor: '#F59E0B', 
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', 
    transform: 'translateY(-1px)', 
  },
};


