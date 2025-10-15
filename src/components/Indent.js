// src/pages/indent.js
import React, { useState, useEffect } from "react";
import Head from "next/head";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useRouter } from "next/router";

/**
 * Mobile-first Indent Page
 * - Assumes global Header & Footer are fixed outside this component.
 * - Content area is padded so nothing collapses under header/footer.
 * - Back & Review buttons in Bulk Orders (Step 2) are on the same line.
 */

/* ---------- Config ---------- */
const deliveryBoyAreas = {
  Mahendra: "Gadipet",
  Aslam: "Chitrapuri Colony, Jubilee Hills",
  Shiva: "Financial District",
  Ramu: "Manikonda",
  Bittu: "Manikonda, Alkapur, Shaikpet",
};
const deliveryBoys = Object.keys(deliveryBoyAreas);

const areas = [
  "Jubilee Hills",
  "Kukatpally",
  "Raidurg",
  "Gachibowli",
  "Financial District",
  "Manikonda",
  "Alkapur",
  "Gadipet",
  "Chitrapuri Colony, Jubilee Hills",
  "Manikonda, Alkapur, Shaikpet",
];

/* ---------- Utilities: image helpers & PDF generation (unchanged) ---------- */
const getImageBase64 = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch logo");
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch (err) {
    console.error("getImageBase64:", err);
    return null;
  }
};

const getImageNaturalSize = (dataUrl) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });

const generatePdf = async (payload) => {
  const { targetDateISO, homeDeliveries, bulkOrders = [], oneTimeOrders = [], grandTotal } = payload;
  const activeBulk = [...bulkOrders, ...oneTimeOrders].filter((b) => Number(b.quantity) > 0);
  const activeHD = (homeDeliveries || []).filter((d) => Number(d.liters) > 0);

  const doc = new jsPDF({ unit: "pt" });
  const leftMargin = 28;
  const rightMargin = 28;
  const pageWidth = doc.internal.pageSize.getWidth();

  // logo
  const logoBase64 = await getImageBase64("/logo.png");
  let logoDrawW = 0;
  let logoDrawH = 0;
  if (logoBase64) {
    const size = await getImageNaturalSize(logoBase64);
    if (size) {
      const maxLogoW = 90;
      const maxLogoH = 40;
      const ratio = size.width / size.height || 1;
      logoDrawW = Math.min(maxLogoW, size.width);
      logoDrawH = logoDrawW / ratio;
      if (logoDrawH > maxLogoH) {
        logoDrawH = maxLogoH;
        logoDrawW = logoDrawH * ratio;
      }
    } else {
      logoDrawW = 70;
      logoDrawH = 30;
    }
  }

  const headerTop = 28;
  const headerHeight = Math.max(logoDrawH, 36);
  const headerBaseline = headerTop + headerHeight / 2 + 6;

  if (logoBase64 && logoDrawW > 0) {
    const logoY = headerTop + (headerHeight - logoDrawH) / 2;
    doc.addImage(logoBase64, "PNG", leftMargin, logoY, logoDrawW, logoDrawH);
  }

  // Title
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  const centerX = pageWidth / 2;
  doc.text("Daily Indent Report", centerX, headerBaseline, { align: "center" });

  // Date (right aligned)
  const dateText = targetDateISO ? new Date(targetDateISO).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(dateText, pageWidth - rightMargin, headerBaseline, { align: "right" });

  // separator
  const sepY = headerTop + headerHeight + 10;
  doc.setDrawColor(220);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, sepY, pageWidth - rightMargin, sepY);

  let cursorY = sepY + 16;

  // Home deliveries table
  autoTable(doc, {
    startY: cursorY,
    head: [["Delivery Boy", "Area", "Milk Carried (L)"]],
    body: activeHD.map((d) => [d.deliveryBoy, d.area || "-", d.liters || 0]),
    headStyles: { fillColor: "#374151", textColor: "#FFFFFF", fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: "auto" }, 2: { cellWidth: 70, halign: "right" } },
    foot: [["Total", "", `${activeHD.reduce((s, d) => s + (Number(d.liters) || 0), 0)}`]],
    footStyles: { fillColor: "#F3F4F6", textColor: "#111827", fontStyle: "bold" },
    showFoot: "last_page",
    margin: { left: leftMargin, right: rightMargin },
  });

  cursorY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 18 : cursorY + 120;

  // Bulk orders table
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("Bulk Orders", leftMargin, cursorY);
  autoTable(doc, {
    startY: cursorY + 8,
    head: [["Company Name", "Area", "Quantity (L)"]],
    body: activeBulk.map((o) => [o.company_name || "-", o.area || "-", o.quantity || 0]),
    headStyles: { fillColor: "#374151", textColor: "#FFFFFF", fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: { 0: { cellWidth: 180 }, 1: { cellWidth: "auto" }, 2: { cellWidth: 70, halign: "right" } },
    foot: [["Total", "", `${activeBulk.reduce((s, b) => s + (Number(b.quantity) || 0), 0)}`]],
    footStyles: { fillColor: "#F3F4F6", textColor: "#111827", fontStyle: "bold" },
    showFoot: "last_page",
    margin: { left: leftMargin, right: rightMargin },
  });

  const yGrand = doc.lastAutoTable ? doc.lastAutoTable.finalY + 18 : cursorY + 80;
  doc.setFontSize(12);
  doc.setTextColor("#F59E0B");
  doc.setFont(undefined, "bold");
  doc.text(`Grand Total Milk Dispatched: ${grandTotal} L`, leftMargin, yGrand);

  const filename = `Indent_Report_${dateText.replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
};

/* ---------- Styles (mobile-first) ---------- */
const styles = {
  // note: paddingTop/paddingBottom increased so global fixed header/footer won't overlap
  page: {
    padding: 16,
    paddingTop: 96, // leave space for global Header
    paddingBottom: 96, // leave space for global Footer
    maxWidth: 420,
    margin: "0 auto",
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial",
    background: "#FAFAFB",
    minHeight: "100vh",
    boxSizing: "border-box",
  },
  card: { background: "#FFFFFF", borderRadius: 12, padding: 14, marginBottom: 14, border: "1px solid #E5E7EB" },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 6 },
  smallText: { color: "#6B7280", fontSize: 13 },
  dateInput: { padding: "10px 12px", borderRadius: 10, border: "1px solid #D1D5DB", minWidth: 140 },
  row: { display: "flex", gap: 8, alignItems: "center" },
  deliveryBoyBox: { flex: 1, padding: 10, borderRadius: 10, background: "#F3F4F6", fontWeight: 600, color: "#111827" },
  select: { padding: "10px 12px", borderRadius: 10, border: "1px solid #D1D5DB", width: "100%" },
  inputNumber: { padding: "10px 12px", borderRadius: 10, border: "1px solid #D1D5DB", width: 100, textAlign: "center" },

  // Buttons
  buttonPrimary: { width: "100%", padding: 14, borderRadius: 12, background: "#F59E0B", color: "#fff", fontWeight: 700, border: "none", fontSize: 15 },
  buttonSecondary: { width: "100%", padding: 12, borderRadius: 12, background: "#fff", color: "#374151", border: "1px solid #D1D5DB", fontWeight: 700 },

  stepperContainer: { display: "flex", gap: 8, marginBottom: 12, alignItems: "center", justifyContent: "space-between" },
  stepItem: { flex: 1, textAlign: "center", padding: 8, borderRadius: 10, background: "#fff", border: "1px solid #E5E7EB" },
  stepActive: { background: "#F59E0B", color: "#fff", fontWeight: 700 },

  centered: { textAlign: "center", padding: 16, color: "#6B7280" },
  modalOverlay: { position: "fixed", left: 0, right: 0, bottom: 0, top: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", zIndex: 120 },
  modalSheet: { width: "100%", background: "#fff", borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 16, maxHeight: "86vh", overflow: "auto" },
  modalInput: { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #D1D5DB", marginBottom: 10 },

  listItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F3F4F6" },
  reviewRow: { display: "flex", justifyContent: "space-between", marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid #F3F4F6" },
  reviewTotal: { textAlign: "right", marginTop: 8, fontSize: 15, color: "#111827" },
};

/* ---------- Step 1: Home Deliveries (simpler footer—no position:fixed) ---------- */
const Step1 = ({ homeDeliveries, setHomeDeliveries, targetDateISO, setTargetDateISO, onNext }) => {
  const handleChange = (id, field, value) => {
    setHomeDeliveries(homeDeliveries.map((h) => (h.id === id ? { ...h, [field]: value } : h)));
  };
  const total = homeDeliveries.reduce((s, d) => s + (Number(d.liters) || 0), 0);
  const canProceed = homeDeliveries.some((d) => Number(d.liters) > 0);

  const formatted = targetDateISO ? new Date(targetDateISO).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "";

  return (
    <div style={styles.card}>
      <div style={{ marginBottom: 8 }}>
        <div style={styles.sectionTitle}>Delivery Boys</div>
        <div style={styles.smallText}>Next Indent Date • {formatted}</div>
      </div>

      <div style={{ marginTop: 10, marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 6, color: "#6B7280", fontSize: 13 }}>Change Date</label>
        <input type="date" value={targetDateISO || ""} onChange={(e) => setTargetDateISO(e.target.value)} style={styles.dateInput} />
      </div>

      <div>
        {homeDeliveries.map((d) => (
          <div key={d.id} style={{ marginBottom: 10 }}>
            <div style={styles.row}>
              <div style={styles.deliveryBoyBox}>{d.deliveryBoy}</div>
            </div>
            <div style={{ height: 8 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <select value={d.area} onChange={(e) => handleChange(d.id, "area", e.target.value)} style={styles.select}>
                <option value="">Select area</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <input type="number" placeholder="L" value={d.liters} onChange={(e) => handleChange(d.id, "liters", e.target.value)} style={styles.inputNumber} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ color: "#6B7280" }}>Total Milk</div>
          <div style={{ fontWeight: 700 }}>{total} L</div>
        </div>

        {/* Footer buttons inside the card so nothing is fixed/overlapping */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => window.history.back()} style={{ ...styles.buttonSecondary, flex: 1 }}>
            Cancel
          </button>
          <button onClick={onNext} disabled={!canProceed} style={canProceed ? { ...styles.buttonPrimary, flex: 1 } : { ...styles.buttonPrimary, opacity: 0.6, flex: 1 }}>
            Continue 
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- Step 2: Bulk Orders (Back + Review same line) ---------- */
const Step2 = ({ onBack, onNext, targetDateISO }) => {
  const [customers, setCustomers] = useState([]);
  const [oneTime, setOneTime] = useState([]);
  const [loading, setLoading] = useState(true);
  const [areaFilter, setAreaFilter] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const q = areaFilter ? `?area=${encodeURIComponent(areaFilter)}` : "";
        const res = await fetch(`/api/bulk-customers${q}`);

        if (res.ok) {
          const payload = await res.json();
          const rows = Array.isArray(payload) ? payload : payload?.rows ?? [];
          const mapped = (rows || []).map((r) => ({
            id: r.company_id,
            company_name: r.company_name,
            area: r.area,
            quantity: Number(r.default_quantity_weekdays || 0),
          }));
          if (mounted) setCustomers(mapped);
          setLoading(false);
          return;
        } else {
          // non-OK response: log and fall back
          console.warn(`[Step2] /api/bulk-customers returned status ${res.status}`);
        }
      } catch (err) {
        console.warn("[Step2] fetch /api/bulk-customers failed:", err);
      }

      // fallback: try localStorage
      try {
        const raw = localStorage.getItem("bulkCustomers");
        if (raw) {
          const local = JSON.parse(raw);
          const mappedLocal = (Array.isArray(local) ? local : []).map((r) => ({
            id: r.company_id ?? r.id,
            company_name: r.company_name ?? r.name ?? r.company_name ?? "Unnamed",
            area: r.area ?? "",
            quantity: Number(r.default_quantity_weekdays ?? r.quantity ?? 0),
          }));
          if (mounted) setCustomers(mappedLocal);
        } else {
          if (mounted) setCustomers([]);
        }
      } catch (err) {
        console.warn("[Step2] fallback localStorage parse failed:", err);
        if (mounted) setCustomers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [areaFilter]);

  const changeQty = (id, v) => setCustomers(customers.map((c) => (c.id === id ? { ...c, quantity: Number(v || 0) } : c)));
  const addOneTime = (item) => setOneTime([item, ...oneTime]);
  const delOneTime = (id) => setOneTime(oneTime.filter((o) => o.id !== id));
  const total = [...customers, ...oneTime].reduce((s, x) => s + (Number(x.quantity) || 0), 0);

  return (
    <div style={styles.card}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={styles.sectionTitle}>Bulk Orders</div>
          <div style={styles.smallText}>{targetDateISO ? new Date(targetDateISO).toLocaleDateString("en-IN") : ""}</div>
        </div>
        <div style={{ width: 110 }}>
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} style={styles.select}>
            <option value="">All areas</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={styles.centered}>Loading customers…</div>
      ) : (
        <>
          <div style={{ marginBottom: 10 }}>
            <button onClick={() => setShowModal(true)} style={{ ...styles.buttonSecondary, marginBottom: 12 }}>
              + Add One-time Order
            </button>

            {oneTime.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>One-time</div>
                {oneTime.map((o) => (
                  <div key={o.id} style={styles.listItem}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{o.company_name}</div>
                      <div style={{ color: "#6B7280", fontSize: 13 }}>{o.area}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontWeight: 700 }}>{o.quantity} L</div>
                      <button onClick={() => delOneTime(o.id)} style={{ padding: 8, borderRadius: 8, background: "#FEE2E2", border: "none" }}>
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Regular Customers</div>
              {customers.map((c) => (
                <div key={c.id} style={styles.listItem}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{c.company_name}</div>
                    <div style={{ color: "#6B7280", fontSize: 13 }}>{c.area}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="number" value={c.quantity} onChange={(e) => changeQty(c.id, e.target.value)} style={{ width: 90, padding: 8, borderRadius: 8, border: "1px solid #D1D5DB", textAlign: "center" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Back + Review on same row */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
            <button
              onClick={onBack}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 12,
                background: "#fff",
                color: "#374151",
                border: "1px solid #D1D5DB",
                fontWeight: 700,
              }}
            >
              Back
            </button>

            <button
              onClick={() => onNext({ bulkOrders: customers, oneTimeOrders: oneTime, totalBulkMilk: total })}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 12,
                background: "#F59E0B",
                color: "#fff",
                border: "none",
                fontWeight: 700,
              }}
            >
              Review
            </button>
          </div>
        </>
      )}

      {showModal && <AddOneTimeModal onClose={() => setShowModal(false)} onAdd={addOneTime} />}
    </div>
  );
};

/* ---------- Add One-time modal ---------- */
const AddOneTimeModal = ({ onClose, onAdd }) => {
  const [company, setCompany] = useState("");
  const [area, setAreaVal] = useState("");
  const [qty, setQty] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!company || !qty) return;
    onAdd({ id: `ot-${Date.now()}`, company_name: company, area: area || "-", quantity: Number(qty) });
    onClose();
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>Add One-time Order</div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 20 }}>
            ×
          </button>
        </div>

        <form onSubmit={submit}>
          <input placeholder="Company name" value={company} onChange={(e) => setCompany(e.target.value)} style={styles.modalInput} />
          <input placeholder="Area (optional)" value={area} onChange={(e) => setAreaVal(e.target.value)} style={styles.modalInput} />
          <input placeholder="Quantity (L)" value={qty} onChange={(e) => setQty(e.target.value)} style={styles.modalInput} type="number" />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onClose} style={{ ...styles.buttonSecondary, flex: 1 }}>
              Cancel
            </button>
            <button type="submit" style={{ ...styles.buttonPrimary, flex: 1 }}>
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ---------- Step 3: Review ---------- */
const Step3 = ({ homeDeliveries, bulkOrderData, targetDateISO, onBack, onFinalize }) => {
  const activeHD = homeDeliveries.filter((d) => Number(d.liters) > 0);
  const activeBulk = [...(bulkOrderData.bulkOrders || []), ...(bulkOrderData.oneTimeOrders || [])].filter((b) => Number(b.quantity) > 0);
  const sumHD = activeHD.reduce((s, d) => s + (Number(d.liters) || 0), 0);
  const sumBulk = bulkOrderData.totalBulkMilk || 0;
  const grand = sumHD + sumBulk;

  return (
    <div style={styles.card}>
      <div style={{ marginBottom: 12 }}>
        <div style={styles.sectionTitle}>Review</div>
        <div style={styles.smallText}>{targetDateISO ? new Date(targetDateISO).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : ""}</div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Delivery Boys</div>
        {activeHD.map((d) => (
          <div key={d.id} style={styles.reviewRow}>
            <div>{d.deliveryBoy} ({d.area || "—"})</div>
            <div style={{ fontWeight: 700 }}>{d.liters} L</div>
          </div>
        ))}
        <div style={styles.reviewTotal}>Total: <strong>{sumHD} L</strong></div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Bulk Orders</div>
        {activeBulk.map((d, i) => (
          <div key={d.id ?? `b-${i}`} style={styles.reviewRow}>
            <div>{d.company_name} ({d.area || "—"})</div>
            <div style={{ fontWeight: 700 }}>{d.quantity} L</div>
          </div>
        ))}
        <div style={styles.reviewTotal}>Total: <strong>{sumBulk} L</strong></div>
      </div>

      <div style={{ ...styles.row, justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>Grand Total</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{grand} L</div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        <button onClick={onBack} style={{ ...styles.buttonSecondary, flex: 1 }}>Back</button>
        <button onClick={() => onFinalize({ targetDateISO, homeDeliveries, bulkOrders: bulkOrderData.bulkOrders, oneTimeOrders: bulkOrderData.oneTimeOrders, grandTotal: grand })} style={{ ...styles.buttonPrimary, flex: 1 }}>Finalize Indent</button>
      </div>
    </div>
  );
};

/* ---------- Step 4: Submitted (readonly) ---------- */
const Step4_Submitted = ({ payload, onEdit, onDownload }) => {
  const { targetDateISO, homeDeliveries = [], bulkOrders = [], oneTimeOrders = [], grandTotal = 0 } = payload || {};
  const activeHD = (homeDeliveries || []).filter((d) => Number(d.liters) > 0);
  const activeBulk = [...(bulkOrders || []), ...(oneTimeOrders || [])].filter((b) => Number(b.quantity) > 0);

  return (
    <div style={styles.card}>
      <div style={{ marginBottom: 12 }}>
        <div style={styles.sectionTitle}>Submitted Indent</div>
        <div style={styles.smallText}>{targetDateISO ? new Date(targetDateISO).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : ""}</div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Delivery Boys</div>
        {activeHD.length ? activeHD.map((d) => (
          <div key={d.id} style={styles.reviewRow}>
            <div>{d.deliveryBoy} ({d.area || "—"})</div>
            <div style={{ fontWeight: 700 }}>{d.liters} L</div>
          </div>
        )) : <div style={styles.centered}>No home deliveries recorded.</div>}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Bulk Orders</div>
        {activeBulk.length ? activeBulk.map((b, i) => (
          <div key={b.id ?? `sb-${i}`} style={styles.reviewRow}>
            <div>{b.company_name} ({b.area || "—"})</div>
            <div style={{ fontWeight: 700 }}>{b.quantity} L</div>
          </div>
        )) : <div style={styles.centered}>No bulk orders recorded.</div>}
      </div>

      <div style={{ ...styles.row, justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontWeight: 700 }}>Grand Total</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{grandTotal} L</div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onEdit} style={{ ...styles.buttonSecondary, flex: 1 }}>Back to Edit</button>
        <button onClick={() => onDownload(payload)} style={{ ...styles.buttonPrimary, flex: 1 }}>Download PDF</button>
      </div>
    </div>
  );
};

/* ---------- Page wrapper ---------- */
export default function IndentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [targetDateISO, setTargetDateISO] = useState("");
  const [homeDeliveries, setHomeDeliveries] = useState(
    deliveryBoys.map((b, i) => ({ id: i + 1, deliveryBoy: b, area: deliveryBoyAreas[b] || "", liters: "" }))
  );
  const [bulkOrderData, setBulkOrderData] = useState({ bulkOrders: [], oneTimeOrders: [], totalBulkMilk: 0 });
  const [submittedPayload, setSubmittedPayload] = useState(null);

  useEffect(() => {
    const now = new Date();
    if (now.getHours() >= 20) now.setDate(now.getDate() + 1);
    setTargetDateISO(now.toISOString().split("T")[0]);
  }, []);

  const goNextFromHome = () => setStep(2);
  const goNextFromBulk = (data) => {
    setBulkOrderData(data);
    setStep(3);
  };

  const handleFinalize = (payload) => {
    setSubmittedPayload(payload);
    setStep(4);
  };

  const handleDownloadFromSubmitted = async (payload) => {
    try {
      await generatePdf(payload);
    } catch (err) {
      console.error("Download PDF failed", err);
      alert("Failed to generate PDF. See console for details.");
    }
  };

  const backToEdit = () => setStep(3);

  return (
    <>
      <Head>
        <title>Indent — Mobile</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>

      {/* No internal fixed header here — the app-level Header is expected to be outside */}
      <div style={styles.page}>
        <div style={styles.stepperContainer}>
          <div style={{ ...styles.stepItem, ...(step === 1 ? styles.stepActive : {}) }}>Boys</div>
          <div style={{ ...styles.stepItem, ...(step === 2 ? styles.stepActive : {}) }}>Bulk</div>
          <div style={{ ...styles.stepItem, ...(step === 3 ? styles.stepActive : {}) }}>Review</div>
          <div style={{ ...styles.stepItem, ...(step === 4 ? styles.stepActive : {}) }}>Submit</div>
        </div>

        {step === 1 && <Step1 homeDeliveries={homeDeliveries} setHomeDeliveries={setHomeDeliveries} targetDateISO={targetDateISO} setTargetDateISO={setTargetDateISO} onNext={goNextFromHome} />}
        {step === 2 && <Step2 onBack={() => setStep(1)} onNext={goNextFromBulk} targetDateISO={targetDateISO} />}
        {step === 3 && <Step3 homeDeliveries={homeDeliveries} bulkOrderData={bulkOrderData} targetDateISO={targetDateISO} onBack={() => setStep(2)} onFinalize={handleFinalize} />}
        {step === 4 && <Step4_Submitted payload={submittedPayload} onEdit={backToEdit} onDownload={handleDownloadFromSubmitted} />}

        <div style={{ height: 8 }} />
      </div>
    </>
  );
}
