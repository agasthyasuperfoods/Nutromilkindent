// src/pages/profile.js
import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

const styles = {
  page: {
    minHeight: "100vh",
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial",
    background: "#FAFAFB",
  },
  // fixed content area between app header & footer (adjust top/bottom if your header/footer heights differ)
  contentArea: {
    position: "fixed",
    top: 64, // adjust to your header height
    bottom: 64, // adjust to your footer height
    left: 0,
    right: 0,
    overflowY: "auto",
    padding: 16,
    boxSizing: "border-box",
    WebkitOverflowScrolling: "touch",
    display: "flex",
    justifyContent: "center",
  },
  container: {
    width: "100%",
    maxWidth: 720,
  },
  card: {
    background: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    border: "1px solid #E6E7EA",
    boxShadow: "0 4px 14px rgba(16,24,40,0.03)",
  },
  headerRow: { display: "flex", alignItems: "center", gap: 12 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 999,
    background: "#E6EEF8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    color: "#0F172A",
    fontSize: 20,
  },
  name: { fontSize: 18, fontWeight: 800, color: "#0F172A" },
  sub: { color: "#6B7280", fontSize: 13 },
  fieldRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid #F3F4F6",
  },
  fieldLabel: { color: "#6B7280", fontSize: 13 },
  fieldValue: { fontWeight: 700, color: "#111827" },
  actionsRow: { display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" },
  btnPrimary: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    background: "#F59E0B",
    color: "#fff",
    border: "none",
    fontWeight: 800,
    fontSize: 16,
  },
  btnSecondary: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    background: "#fff",
    color: "#374151",
    border: "1px solid #E6E7EA",
    fontWeight: 700,
  },
  smallNote: { fontSize: 12, color: "#9CA3AF", marginTop: 8 },
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("user");
        if (raw) setUser(JSON.parse(raw));
        else
          setUser({
            name: "John Doe",
            email: "john.doe@example.com",
            phone: "+91 90000 00000",
            role: "Sales Executive",
            company: "ACME Foods",
            avatarInitials: "JD",
          });
      }
    } catch (err) {
      console.error("Failed to read local user", err);
      setUser({
        name: "John Doe",
        email: "john.doe@example.com",
        phone: "+91 90000 00000",
        role: "Sales Executive",
        company: "ACME Foods",
        avatarInitials: "JD",
      });
    } finally {
      setLoadingUser(false);
    }
  }, []);

  const handleLogout = () => {
    const ok = typeof window !== "undefined" ? window.confirm("Log out? You will be redirected to the login screen.") : false;
    if (!ok) return;

    try {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
    } catch (err) {
      console.warn("Could not clear localStorage cleanly", err);
    }

    try {
      if (typeof window !== "undefined") window.alert("You have been logged out.");
    } catch (_) {}

    router.replace("/Alogin");
  };

  const handleEditProfile = () => router.push("/profile/edit");
  const handleChangePassword = () => router.push("/profile/change-password");
  const goToBulkCustomers = () => router.push("/bulk-customers");

  if (loadingUser) {
    return (
      <>
        <Head>
          <title>Profile — Sales App</title>
        </Head>
        <div style={styles.page}>
          <div style={{ padding: 16 }}>
            <div style={styles.card}>
              <div style={styles.smallNote}>Loading profile…</div>
            </div>
          </div>
        </div>
      </>
    );
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
            {/* Profile card */}
            <div style={styles.card}>
              <div style={styles.headerRow}>
                <div style={styles.avatar}>
                  {user?.avatarInitials ?? (user?.name ? user.name.split(" ").map((s) => s[0]).slice(0, 2).join("") : "U")}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={styles.name}>{user?.name ?? "Unknown User"}</div>
                  <div style={styles.sub}>{user?.role ?? "Sales"}</div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#6B7280" }}>{user?.company ?? ""}</div>
                </div>
              </div>

              <div style={{ height: 12 }} />

              <div style={styles.fieldRow}>
                <div>
                  <div style={styles.fieldLabel}>Email</div>
                  <div style={styles.fieldValue}>{user?.email ?? "—"}</div>
                </div>
              </div>

              <div style={styles.fieldRow}>
                <div>
                  <div style={styles.fieldLabel}>Phone</div>
                  <div style={styles.fieldValue}>{user?.phone ?? "—"}</div>
                </div>
              </div>

              <div style={styles.fieldRow}>
                <div>
                  <div style={styles.fieldLabel}>Role</div>
                  <div style={styles.fieldValue}>{user?.role ?? "—"}</div>
                </div>
              </div>

              <div style={styles.actionsRow}>
                <button style={styles.btnSecondary} onClick={handleEditProfile}>
                  Edit Profile
                </button>
                <button style={styles.btnSecondary} onClick={handleChangePassword}>
                  Change Password
                </button>
                <button style={styles.btnSecondary} onClick={goToBulkCustomers}>
                  Manage Bulk Customers
                </button>
              </div>

              <div style={styles.smallNote}>
                Signed in as <strong>{user?.email}</strong>
              </div>
            </div>

            {/* Security card: LOGOUT full-width */}
            <div style={styles.card}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Security</div>
              <div style={{ marginBottom: 12 }}>
                <div style={styles.fieldLabel}>Logout</div>
                <div style={{ color: "#6B7280", fontSize: 13 }}>Tap below to securely sign out from this device.</div>
              </div>

              <div>
                <button style={styles.btnPrimary} onClick={handleLogout}>
                  Log out
                </button>
              </div>

              <div style={styles.smallNote}>After logging out you will be redirected to the login screen.</div>
            </div>

            <div style={{ height: 24 }} />
          </div>
        </div>
      </div>
    </>
  );
}
