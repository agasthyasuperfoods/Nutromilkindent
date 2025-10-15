// src/components/Maindash.js
import React, { useEffect, useState } from "react";
import Indent from "../components/Indent"; // adjust path if needed

const styles = {
  page: {
    padding: 16,
    paddingTop: 96,
    paddingBottom: 96,
    maxWidth: 720,
    margin: "0 auto",
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial",
    background: "#FAFAFB",
    minHeight: "100vh",
    boxSizing: "border-box",
  },
  headerRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    marginBottom: 18,
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  leftHeader: { display: "flex", gap: 12, alignItems: "center" },
  dateInput: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #E5E7EB",
    minWidth: 160,
    background: "#fff",
  },
  createButton: {
    padding: "10px 16px",
    borderRadius: 10,
    backgroundColor: "#FBBF24",
    color: "#1F2937",
    border: "none",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 6px 18px rgba(15,111,255,0.12)",
  },
  cardRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    background: "#ffffff",
    borderRadius: 12,
    padding: 14,
    boxShadow: "0 6px 18px rgba(16,24,40,0.04)",
    border: "1px solid #E6E7EA",
    minHeight: 84,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  kpiTitle: { fontSize: 13, color: "#6B7280", marginBottom: 8 },
  kpiValue: { fontSize: 24, fontWeight: 800, color: "#0F172A" },
  recentCard: {
    background: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    border: "1px solid #E6E7EA",
    boxShadow: "0 4px 14px rgba(16,24,40,0.03)",
  },
  recentItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F3F4F6" },
  muted: { color: "#6B7280", fontSize: 13 },
  smallNote: { color: "#9CA3AF", fontSize: 12, marginTop: 8 },
  indentWrap: { marginTop: 12 },
  emptyBox: { padding: 16, borderRadius: 12, background: "#fff", border: "1px solid #E6E7EA" },

  // Full-screen indent wrapper (used when showIndent === true)
  indentFullScreen: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "#FFFFFF",
    zIndex: 9999,
    overflow: "auto",
    WebkitOverflowScrolling: "touch",
    paddingTop: 64, // keep app header height if exists (adjust if your header is different)
    boxSizing: "border-box",
  },
  indentTopBar: {
    position: "sticky",
    top: 0,
    left: 0,
    right: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: "1px solid #EEF2FF",
    background: "#fff",
    zIndex: 10000,
  },
  backButton: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #E6E7EA",
    background: "#fff",
    color: "#374151",
    fontWeight: 700,
    cursor: "pointer",
  },
  indentTitle: { fontWeight: 800, fontSize: 16, color: "#0F172A" },
};

/**
 * Maindash
 * - Select indent date
 * - "Create Indent" — when clicked, dashboard hides and full-screen Indent loads
 * - Back button in full-screen Indent returns to dashboard
 */
export default function Maindash() {
  const [date, setDate] = useState(() => {
    const d = new Date();
    if (d.getHours() >= 20) d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });

  const [showIndent, setShowIndent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({ submitted: 0, rejected: 0, loadedFrom: "none" });
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const d = new Date(date);
        d.setDate(d.getDate() - 6);
        const since = d.toISOString().slice(0, 10);

        const res = await fetch(`/api/indents/summary?since=${encodeURIComponent(since)}`);
        if (res.ok) {
          const payload = await res.json();
          if (!mounted) return;
          setKpi({
            submitted: Number(payload.submitted ?? payload.submittedCount ?? 0),
            rejected: Number(payload.rejected ?? payload.rejectedCount ?? 0),
            loadedFrom: "api",
          });
        } else {
          throw new Error("summary api not ok");
        }
      } catch (err) {
        try {
          const raw = localStorage.getItem("indents");
          if (raw) {
            const arr = JSON.parse(raw);
            const sinceDate = new Date();
            sinceDate.setDate(new Date(date).getDate() - 6);
            const fromTs = sinceDate.getTime();
            let submitted = 0,
              rejected = 0;
            (Array.isArray(arr) ? arr : []).forEach((it) => {
              const created = it.created_at ? new Date(it.created_at).getTime() : null;
              if (created && created >= fromTs) {
                const st = (it.status || "").toLowerCase();
                if (st === "submitted") submitted++;
                else if (st === "rejected") rejected++;
              }
            });
            if (mounted) setKpi({ submitted, rejected, loadedFrom: "localStorage" });
          } else {
            if (mounted) setKpi((s) => ({ ...s, loadedFrom: "none" }));
          }
        } catch (e2) {
          if (mounted) setKpi((s) => ({ ...s, loadedFrom: "none" }));
        }
      }

      // recent submissions
      try {
        const r = await fetch("/api/indents?limit=3");
        if (r.ok) {
          const payload = await r.json();
          const rows = payload?.rows ?? payload;
          if (Array.isArray(rows) && mounted) {
            setRecent(
              rows.slice(0, 3).map((row) => ({
                id: row.id ?? row.indent_id ?? null,
                company_name: row.company_name ?? row.company ?? "—",
                status: row.status ?? "submitted",
                created_at: row.created_at ?? null,
              }))
            );
          }
        } else {
          throw new Error("recent api not ok");
        }
      } catch (err) {
        try {
          const raw = localStorage.getItem("indents");
          if (raw) {
            const arr = JSON.parse(raw);
            const top = (Array.isArray(arr) ? arr : []).slice(0, 3);
            setRecent(
              top.map((it) => ({
                id: it.id ?? null,
                company_name: it.company_name ?? it.company ?? "—",
                status: it.status ?? "submitted",
                created_at: it.created_at ?? null,
              }))
            );
          } else {
            setRecent([]);
          }
        } catch (_) {
          setRecent([]);
        }
      }

      if (mounted) setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [date]);

  const handleCreate = () => {
    // Hide dashboard and show full-screen indent
    setShowIndent(true);
    // optional: lock body scroll when showing indent full-screen on mobile
    try {
      document.body.style.overflow = "hidden";
    } catch (_) {}
  };

  const handleCloseIndent = () => {
    setShowIndent(false);
    try {
      document.body.style.overflow = "";
    } catch (_) {}
  };

  // If showIndent is true render the full-screen Indent view only
  if (showIndent) {
    return (
      <div style={styles.indentFullScreen} role="dialog" aria-modal="true">
        <div style={styles.indentTopBar}>
          <button onClick={handleCloseIndent} style={styles.backButton} aria-label="Back to dashboard">
            ← Back
          </button>
          <div style={styles.indentTitle}>Create Indent — {date}</div>
          <div style={{ width: 72 }} /> {/* spacer to balance layout */}
        </div>

        <div style={{ padding: 16 }}>
          {/* Pass defaultDate and an optional onClose prop to Indent if it supports it */}
          <Indent defaultDate={date} onClose={handleCloseIndent} />
        </div>
      </div>
    );
  }

  // Otherwise render the dashboard UI
  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div style={styles.leftHeader}>
          <div>
            <label htmlFor="indent-date" style={{ display: "block", marginBottom: 6, color: "#6B7280", fontSize: 13 }}>
              Indent date
            </label>
            <input id="indent-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={styles.dateInput} />
          </div>
        </div>

        <div>
          <button onClick={handleCreate} style={styles.createButton} aria-label="Create Indent">
            Create Indent
          </button>
        </div>
      </div>

      <div style={styles.cardRow} aria-live="polite">
        <div style={styles.kpiCard}>
          <div style={styles.kpiTitle}>Submitted Indents (Last 7 days)</div>
          <div style={styles.kpiValue}>{loading ? "—" : kpi.submitted}</div>
          <div style={styles.smallNote}>Number of indents processed for fulfillment in the last 7 days.</div>
        </div>

        <div style={styles.kpiCard}>
          <div style={styles.kpiTitle}>Rejected Indents (Last 7 days)</div>
          <div style={styles.kpiValue}>{loading ? "—" : kpi.rejected}</div>
          <div style={styles.smallNote}>Indents rejected during validation or review in the last 7 days.</div>
        </div>
      </div>

      <div style={styles.recentCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontWeight: 700 }}>Recent submissions</div>
          <div style={styles.muted}>{loading ? "…" : recent.length + " shown"}</div>
        </div>

        {recent.length === 0 ? (
          <div style={styles.emptyBox}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>No recent indents</div>
            <div style={styles.muted}>Create an indent to see it listed here.</div>
          </div>
        ) : (
          recent.map((r) => (
            <div key={r.id ?? Math.random()} style={styles.recentItem}>
              <div>
                <div style={{ fontWeight: 700 }}>{r.company_name}</div>
                <div style={styles.muted}>{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700, color: r.status === "rejected" ? "#ef4444" : "#059669" }}>
                  {r.status?.toString().toUpperCase() ?? ""}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 8, color: "#6B7280", fontSize: 13 }}>
        Data source: {kpi.loadedFrom === "api" ? "Server summary" : kpi.loadedFrom === "localStorage" ? "Local cache" : "Not available"}
      </div>
    </div>
  );
}
