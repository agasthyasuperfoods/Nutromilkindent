import Link from 'next/link';
import { useRouter } from 'next/router';

// SVG icons for the footer
const IndentIcon = ({ color }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const ReportsIcon = ({ color }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20V14"></path></svg>;
const CustomersIcon = ({ color }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
// <<< NEW: Added Profile Icon
const ProfileIcon = ({ color }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;


export default function Footer() {
  const router = useRouter();
  const activeColor = '#FBBF24'; // Golden Yellow for the active tab
  const inactiveColor = '#6B7280'; // A soft gray for inactive tabs

  const navItems = [
    { href: '/', icon: IndentIcon, label: 'Indent' },
    { href: '/reports', icon: ReportsIcon, label: 'Reports' },
    { href: '/customers', icon: CustomersIcon, label: 'Customers' },
    { href: '/profile', icon: ProfileIcon, label: 'Profile' }, // <<< NEW: Added Profile to nav items
  ];

  return (
    <footer style={styles.footer}>
      {navItems.map(({ href, icon: Icon, label }) => {
        const isActive = router.pathname === href;
        const color = isActive ? activeColor : inactiveColor;
        return (
          <Link href={href} key={label} style={styles.navItem}>
              <Icon color={color} />
              <span style={{ ...styles.navLabel, color }}>
                {label}
              </span>
          </Link>
        );
      })}
    </footer>
  );
}

const styles = {
  footer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65px',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTop: '1px solid #E5E7EB',
    boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    textDecoration: 'none',
  },
  navLabel: {
    fontSize: '12px',
    fontWeight: '500',
  },
};