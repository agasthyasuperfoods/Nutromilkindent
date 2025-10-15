import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';

// A simple, self-contained SVG icon for the 'Logout' button.
function LogoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
  );
}

// We export the height so the parent page knows how much padding to add.
export const HEADER_HEIGHT = '75px'; 

export default function Header() {
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);
  const router = useRouter();

  const handleLogout = () => {
    // Clear any authentication tokens
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    
    // Redirect to login page
    router.push('/Alogin');
  };

  // Dynamically apply hover styles
  const logoutButtonStyle = { 
    ...styles.baseButton, 
    ...styles.logoutButton, 
    ...(isLogoutHovered ? styles.logoutButtonHover : {}) 
  };

  return (
    <header style={styles.header}>
      <div style={styles.branding}>
        <Image 
          src="/logo.png" 
          alt="Agasthya Logo" 
          width={60}
          height={50}
          style={styles.logo}
        />
      </div>
      
      <div style={styles.actionsContainer}>
        <button 
          style={logoutButtonStyle} 
          onClick={handleLogout}
          onMouseEnter={() => setIsLogoutHovered(true)}
          onMouseLeave={() => setIsLogoutHovered(false)}
        >
          <LogoutIcon />
          <span>Logout</span>
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
    width: 'auto',
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
  logoutButton: { 
    backgroundColor: '#EF4444', 
    color: '#FFFFFF', 
    borderColor: '#EF4444', 
  },
  logoutButtonHover: { 
    backgroundColor: '#DC2626', 
    borderColor: '#DC2626', 
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', 
    transform: 'translateY(-1px)', 
  },
};