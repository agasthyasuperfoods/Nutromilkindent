// src/components/ProfilePage.js
import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

// Helper for inline SVG icons
const Icon = ({ path, color = "#6B7280" }) => (
  <svg width={22} height={22} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d={path} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const styles = {
  // --- LAYOUT ---
  page: {
    minHeight: "100vh",
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial",
    background: "#F3F4F6",
  },
  contentArea: {
    position: "fixed",
    top: 64, // Header height
    bottom: 64, // Footer height
    left: 0,
    right: 0,
    overflowY: "auto",
    padding: "16px",
    boxSizing: "border-box",
  },
  container: {
    width: "100%",
    maxWidth: 720,
  },

  // --- PROFILE HEADER (Updated Colors) ---
  profileHeader: {
    background: "#ffb900", // Changed: Softer, dark slate blue
    borderRadius: 20, // Slightly more rounded
    padding: "24px",
    display: "flex",
    alignItems: "center",
    gap: 16,
    color: "#FFFFFF",
    marginBottom: "24px",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 999,
    background: "#475569", // Changed: Coordinated darker grey
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontSize: 22,
    flexShrink: 0,
    border: "2px solid #64748B", // Changed: Subtle lighter border
  },
  name: {
    fontSize: 20,
    fontWeight: 700,
  },
  subText: {
    fontSize: 14,
    color: "#ffffff", // Changed: Softer light grey for subtext
    opacity: 0.9,
  },

  // --- SECTIONS & LISTS ---
  sectionTitle: {
    padding: "0 8px 8px",
    fontSize: 13,
    fontWeight: 600,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  listCard: {
    background: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 24,
    overflow: "hidden",
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    padding: "16px",
    gap: 16,
    borderTop: "1px solid #F3F4F6",
  },
  listItemClickable: {
    cursor: "pointer",
  },
  listItemContent: {
    flexGrow: 1,
    fontSize: 16,
    fontWeight: 500,
    color: "#111827",
  },
  itemChevron: {
    color: "#9CA3AF",
    fontSize: 20,
  },
  logoutText: {
    color: "#EF4444", // Red for logout
    fontWeight: 600,
  },
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // This logic to fetch user data remains the same
    const defaultUser = {
      name: "Bittu",
      email: "bittu@nutromilk.com",
      phone: "+91 90000 00000",
      role: "Sales Executive",
      avatarInitials: "JD",
    };
    try {
      const raw = localStorage.getItem("user");
      setUser(raw ? JSON.parse(raw) : defaultUser);
    } catch (err) {
      console.error(err);
      setUser(defaultUser);
    }
  }, []);

  // Handlers
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      localStorage.clear();
      router.replace("/Alogin");
    }
  };
  const handleChangePassword = () => router.push("/profile/change-password");
  const goToBulkCustomers = () => router.push("/bulk-customers");

  if (!user) {
    return <div style={styles.page}></div>; // Render empty page or a loader
  }

  return (
    <>
      <Head>
        <title>Profile — Sales App</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>

      <div style={styles.page}>
        <div style={styles.contentArea}>
          <div style={styles.container}>
            {/* --- Profile Header --- */}
            <div style={styles.profileHeader}>
              <div style={styles.avatar}>{user.avatarInitials}</div>
              <div>
                <div style={styles.name}>{user.name}</div>
                <div style={styles.subText}>{user.role}</div>
              </div>
            </div>

            {/* --- Account Information Section --- */}
            <div style={styles.sectionTitle}>Account Information</div>
            <div style={styles.listCard}>
              <div style={{ ...styles.listItem, borderTop: "none" }}>
                <Icon path="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6" />
                <div style={styles.listItemContent}>{user.email}</div>
              </div>
              <div style={styles.listItem}>
                <Icon path="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                <div style={styles.listItemContent}>{user.phone}</div>
              </div>
            </div>

            {/* --- Settings Section --- */}
            <div style={styles.sectionTitle}>Settings</div>
            <div style={styles.listCard}>
              <div
                style={{ ...styles.listItem, ...styles.listItemClickable, borderTop: "none" }}
                onClick={handleChangePassword}
              >
                <Icon path="M21 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
                <div style={styles.listItemContent}>Change Password</div>
                <div style={styles.itemChevron}>›</div>
              </div>
              <div style={{ ...styles.listItem, ...styles.listItemClickable }} onClick={goToBulkCustomers}>
                <Icon path="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                <div style={styles.listItemContent}>Manage Bulk Customers</div>
                <div style={styles.itemChevron}>›</div>
              </div>          <div style={{ ...styles.listItem, ...styles.listItemClickable }} onClick={goToBulkCustomers}>
                <Icon path="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                <div style={styles.listItemContent}>Monthly Bulk Indents</div>
                <div style={styles.itemChevron}>›</div>
              </div>
         
            </div>

            <div style={{ height: 48 }} />
          </div>
        </div>
      </div>
    </>
  );
}