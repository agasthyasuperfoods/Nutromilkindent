// src/components/ProfilePage.js
import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

// Professional icons from react-icons (Heroicons-style set)
import {
  HiOutlineUser,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineCog,
  HiOutlineLockClosed,
  HiOutlineOfficeBuilding,
  HiOutlineTruck,
  HiOutlineMap,
  HiOutlineCalendar,
} from "react-icons/hi";

const ICON_COLOR = "#6B7280";
const ICON_SIZE = 20;

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
    background: "#ffb900ad",
    borderRadius: 20,
    padding: "24px",
    display: "flex",
    alignItems: "center",
    gap: 16,
    color: "#FFFFFF",
    marginBottom: "24px",
    marginTop: "24px",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 999,
    background: "#475569",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontSize: 22,
    flexShrink: 0,
    border: "2px solid #64748B",
  },
  name: {
    fontSize: 20,
    fontWeight: 700,
  },
  subText: {
    fontSize: 14,
    color: "#ffffff",
    opacity: 0.9,
  },

  // --- SECTIONS & LISTS ---
  sectionTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "0 8px 8px",
  },
  sectionTitle: {
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
    boxShadow: "0 1px 2px rgba(16,24,40,0.03)",
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    padding: "14px 16px",
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
    color: "#EF4444",
    fontWeight: 600,
  },
  smallIconWrapper: {
    width: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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

  // Navigation handlers
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      localStorage.clear();
      router.replace("/Alogin");
    }
  };
  const handleChangePassword = () => router.push("/profile/");
  const goToBulkCustomers = () => router.push("/Bulkindent");
  const goToDeliveryPartners = () => router.push("/Deliverypartners");
  const goToRoutes = () => router.push("/Routes");

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

            {/* --- Account Information Section (with account icon) --- */}
         

            <div style={styles.listCard}>
              <div style={{ ...styles.listItem, borderTop: "none" }}>
                <div style={styles.smallIconWrapper}>
                  <HiOutlineMail size={ICON_SIZE} color={ICON_COLOR} />
                </div>
                <div style={styles.listItemContent}>{user.email}</div>
              </div>
              <div style={styles.listItem}>
                <div style={styles.smallIconWrapper}>
                  <HiOutlinePhone size={ICON_SIZE} color={ICON_COLOR} />
                </div>
                <div style={styles.listItemContent}>{user.phone}</div>
              </div>
            </div>

            {/* --- Settings Section --- */}
            <div style={styles.sectionTitleRow}>
              <div style={styles.smallIconWrapper}>
                <HiOutlineCog size={ICON_SIZE} color={ICON_COLOR} />
              </div>
              <div style={styles.sectionTitle}>Settings</div>
            </div>

            <div style={styles.listCard}>
              <div
                style={{ ...styles.listItem, ...styles.listItemClickable, borderTop: "none" }}
                onClick={handleChangePassword}
              >
                <div style={styles.smallIconWrapper}>
                  <HiOutlineLockClosed size={ICON_SIZE} color={ICON_COLOR} />
                </div>
                <div style={styles.listItemContent}>Change Password</div>
                <div style={styles.itemChevron}>›</div>
              </div>

        

              <div style={{ ...styles.listItem, ...styles.listItemClickable }} onClick={goToDeliveryPartners}>
                <div style={styles.smallIconWrapper}>
                  <HiOutlineTruck size={ICON_SIZE} color={ICON_COLOR} />
                </div>
                <div style={styles.listItemContent}>Manage Delivery Partners</div>
                <div style={styles.itemChevron}>›</div>
              </div>

              <div style={{ ...styles.listItem, ...styles.listItemClickable }} onClick={goToRoutes}>
                <div style={styles.smallIconWrapper}>
                  <HiOutlineMap size={ICON_SIZE} color={ICON_COLOR} />
                </div>
                <div style={styles.listItemContent}>Routes</div>
                <div style={styles.itemChevron}>›</div>
              </div>

              <div style={{ ...styles.listItem, ...styles.listItemClickable }} onClick={goToBulkCustomers}>
                <div style={styles.smallIconWrapper}>
                  <HiOutlineCalendar size={ICON_SIZE} color={ICON_COLOR} />
                </div>
                <div style={styles.listItemContent}>Monthly Bulk Indents</div>
                <div style={styles.itemChevron}>›</div>
              </div>
            </div>

            {/* Spacer to keep content above footer */}
            <div style={{ height: 48 }} />
          </div>
        </div>
      </div>
    </>
  );
}
