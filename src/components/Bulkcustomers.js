// src/components/Bulkcustomers.js
import React, { useEffect, useMemo, useState } from "react";
import { PlusSquare, Trash2 } from "lucide-react";

/**
 * Bulkcustomers component
 * - indent_type & payment_term are available only in Add/Edit modals (not shown in main list)
 * - Main list shows name / phone / area only
 * - Add/Edit modals contain: indent_type, payment_term, default_quantity_weekdays, Saturday, Sunday, Holidays
 * - Padding added to content area so fixed Header/Footer do not overlap list rows
 * - Modals constrained with maxHeight + internal scrolling
 */

const styles = {
  pageWrap: { width: "100%" },

  contentArea: {
    position: "relative",
    padding: 16,
    paddingTop: 80, // space for fixed header
    paddingBottom: 96, // space for fixed footer / allow bottom-sheet comfortable space
    boxSizing: "border-box",
    WebkitOverflowScrolling: "touch",
    display: "flex",
    justifyContent: "center",
  },

  container: { width: "100%", maxWidth: 720 },
  card: {
    background: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    border: "1px solid #E6E7EA",
    boxShadow: "0 4px 14px rgba(16,24,40,0.03)",
  },
  muted: { color: "#6B7280", fontSize: 13 },
  customersList: { marginTop: 8, display: "grid", gap: 8 },
  customerItem: {
    padding: 12,
    borderRadius: 10,
    background: "#F8FAFC",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
  },
  topRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  addButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 10,
    background: "#F59E0B",
    color: "#fff",
    border: "none",
    fontWeight: 700,
    cursor: "pointer",
  },
  btnSecondary: {
    padding: 10,
    borderRadius: 10,
    background: "#fff",
    color: "#374151",
    border: "1px solid #E6E7EA",
    fontWeight: 700,
    cursor: "pointer",
  },
  trashBtn: {
    border: "none",
    background: "transparent",
    padding: 6,
    borderRadius: 8,
    cursor: "pointer",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #E6E7EA",
    marginBottom: 10,
    boxSizing: "border-box",
  },

  // bottom-sheet modal overlay (align bottom)
  modalOverlay: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 3000,
  },
  // Constrain modal height and allow internal scroll so it never pushes content under footer.
  modalSheet: {
    width: "100%",
    maxWidth: 720,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    background: "#fff",
    padding: 16,
    boxSizing: "border-box",
    boxShadow: "0 -8px 30px rgba(2,6,23,0.15)",
    transformOrigin: "bottom center",
    maxHeight: "80vh",
    overflowY: "auto",
  },

  emptyNote: { color: "#6B7280", fontSize: 15 },
  fieldGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  label: { fontSize: 13, color: "#374151", marginBottom: 6, fontWeight: 700 },
  smallMuted: { fontSize: 13, color: "#6B7280" },
  badge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background: "#F1F5F9",
    color: "#334155",
    marginLeft: 8,
  },
};

// fallback defaults if DB has no values yet
const FALLBACK_INDENT_TYPES = ["Regular", "One-time", "Trial"];
const FALLBACK_PAYMENT_TERMS = ["Prepaid", "COD", "Net 7", "Net 15"];

export default function Bulkcustomers() {
  const [bulkCustomers, setBulkCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    area: "",
    indent_type: "",
    payment_term: "",
    default_quantity_weekdays: "",
    Saturday: "",
    Sunday: "",
    Holidays: "",
  });
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  // derive option lists from fetched customers (unique + sorted)
  const indentTypes = useMemo(() => {
    const set = new Set();
    bulkCustomers.forEach((c) => {
      if (c.indent_type && String(c.indent_type).trim()) set.add(String(c.indent_type).trim());
    });
    const arr = Array.from(set);
    if (arr.length === 0) return FALLBACK_INDENT_TYPES;
    return arr.sort((a, b) => a.localeCompare(b));
  }, [bulkCustomers]);

  const paymentTerms = useMemo(() => {
    const set = new Set();
    bulkCustomers.forEach((c) => {
      if (c.payment_term && String(c.payment_term).trim()) set.add(String(c.payment_term).trim());
    });
    const arr = Array.from(set);
    if (arr.length === 0) return FALLBACK_PAYMENT_TERMS;
    return arr.sort((a, b) => a.localeCompare(b));
  }, [bulkCustomers]);

  useEffect(() => {
    let mounted = true;

    (async function loadCustomers() {
      setLoading(true);
      try {
        const res = await fetch("/api/bulk-customers");
        if (res.ok) {
          const payload = await res.json();
          const rows = payload?.rows ?? payload;
          if (Array.isArray(rows) && mounted) {
            const mapped = rows.map((r) => ({
              id: r.company_id ?? r.id ?? `c-${Date.now()}-${Math.random()}`,
              company_name: r.company_name ?? r.name ?? "Unnamed",
              mobile_number: r.mobile_number ?? r.phone ?? "",
              area: r.area ?? "",
              indent_type: r.indent_type ?? "",
              payment_term: r.payment_term ?? "",
              default_quantity_weekdays: r.default_quantity_weekdays ?? "",
              Saturday: r.Saturday ?? "",
              Sunday: r.Sunday ?? "",
              Holidays: r.Holidays ?? "",
              raw: r,
            }));
            setBulkCustomers(mapped);
            try { localStorage.setItem("bulkCustomers", JSON.stringify(mapped)); } catch (_) {}
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        // fallback
      }
      try {
        const raw = localStorage.getItem("bulkCustomers");
        if (raw && mounted) setBulkCustomers(JSON.parse(raw));
        else if (mounted) setBulkCustomers([]);
      } catch (err) {
        if (mounted) setBulkCustomers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const persist = (next) => {
    try { localStorage.setItem("bulkCustomers", JSON.stringify(next)); } catch (_) {}
  };

  const openAdd = () => {
    setNewCustomer({
      name: "",
      phone: "",
      area: "",
      indent_type: indentTypes[0] || FALLBACK_INDENT_TYPES[0],
      payment_term: paymentTerms[0] || FALLBACK_PAYMENT_TERMS[0],
      default_quantity_weekdays: "",
      Saturday: "",
      Sunday: "",
      Holidays: "",
    });
    setShowAddModal(true);
  };

  const submitAdd = async (e) => {
    e?.preventDefault();
    if (!newCustomer.name?.trim()) {
      alert("Please enter company name.");
      return;
    }
    setAdding(true);

    const optimistic = {
      id: `local-${Date.now()}`,
      company_name: newCustomer.name.trim(),
      mobile_number: newCustomer.phone?.trim() || "",
      area: newCustomer.area?.trim() || "",
      indent_type: newCustomer.indent_type || "",
      payment_term: newCustomer.payment_term || "",
      default_quantity_weekdays:
        newCustomer.default_quantity_weekdays === "" ? null : Number(newCustomer.default_quantity_weekdays),
      Saturday: newCustomer.Saturday === "" ? null : Number(newCustomer.Saturday),
      Sunday: newCustomer.Sunday === "" ? null : Number(newCustomer.Sunday),
      Holidays: newCustomer.Holidays === "" ? null : Number(newCustomer.Holidays),
    };

    try {
      const res = await fetch("/api/bulk-customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: optimistic.company_name,
          mobile_number: optimistic.mobile_number,
          area: optimistic.area,
          indent_type: optimistic.indent_type,
          payment_term: optimistic.payment_term,
          default_quantity_weekdays: optimistic.default_quantity_weekdays,
          Saturday: optimistic.Saturday,
          Sunday: optimistic.Sunday,
          Holidays: optimistic.Holidays,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        const createdRow = created?.row ?? created ?? {};
        const mapped = {
          id: createdRow.company_id ?? createdRow.id ?? optimistic.id,
          company_name: createdRow.company_name ?? optimistic.company_name,
          mobile_number: createdRow.mobile_number ?? optimistic.mobile_number,
          area: createdRow.area ?? optimistic.area,
          indent_type: createdRow.indent_type ?? optimistic.indent_type,
          payment_term: createdRow.payment_term ?? optimistic.payment_term,
          default_quantity_weekdays: createdRow.default_quantity_weekdays ?? optimistic.default_quantity_weekdays,
          Saturday: createdRow.Saturday ?? optimistic.Saturday,
          Sunday: createdRow.Sunday ?? optimistic.Sunday,
          Holidays: createdRow.Holidays ?? optimistic.Holidays,
        };
        const next = [mapped, ...bulkCustomers];
        setBulkCustomers(next);
        persist(next);
        setShowAddModal(false);
        setAdding(false);
        return;
      }
    } catch (err) {
      // fallback to local add
    }

    const next = [
      {
        id: optimistic.id,
        company_name: optimistic.company_name,
        mobile_number: optimistic.mobile_number,
        area: optimistic.area,
        indent_type: optimistic.indent_type,
        payment_term: optimistic.payment_term,
        default_quantity_weekdays: optimistic.default_quantity_weekdays,
        Saturday: optimistic.Saturday,
        Sunday: optimistic.Sunday,
        Holidays: optimistic.Holidays,
      },
      ...bulkCustomers,
    ];
    setBulkCustomers(next);
    persist(next);
    setShowAddModal(false);
    setAdding(false);
  };

  const deleteCustomer = async (id) => {
    if (!confirm("Delete this bulk customer?")) return;
    try { await fetch(`/api/bulk-customers/${id}`, { method: "DELETE" }); } catch (_) {}
    const next = bulkCustomers.filter((c) => String(c.id) !== String(id));
    setBulkCustomers(next);
    persist(next);
  };

  const openEdit = (c) => {
    const base = {
      id: c.id,
      company_name: c.company_name ?? c.name ?? "",
      mobile_number: c.mobile_number ?? c.phone ?? "",
      area: c.area ?? "",
      indent_type: c.indent_type ?? indentTypes[0] ?? FALLBACK_INDENT_TYPES[0],
      payment_term: c.payment_term ?? paymentTerms[0] ?? FALLBACK_PAYMENT_TERMS[0],
      default_quantity_weekdays: c.default_quantity_weekdays ?? "",
      Saturday: c.Saturday ?? "",
      Sunday: c.Sunday ?? "",
      Holidays: c.Holidays ?? "",
    };

    setSelectedCustomer(base);
    setShowEditModal(true);
  };

  const saveEdits = async (e) => {
    e?.preventDefault();
    if (!selectedCustomer) return;
    setSaving(true);

    const custPayload = {
      company_name: selectedCustomer.company_name,
      mobile_number: selectedCustomer.mobile_number,
      area: selectedCustomer.area,
      indent_type: selectedCustomer.indent_type,
      payment_term: selectedCustomer.payment_term,
      default_quantity_weekdays:
        selectedCustomer.default_quantity_weekdays === "" ? null : Number(selectedCustomer.default_quantity_weekdays),
      Saturday: selectedCustomer.Saturday === "" ? null : Number(selectedCustomer.Saturday),
      Sunday: selectedCustomer.Sunday === "" ? null : Number(selectedCustomer.Sunday),
      Holidays: selectedCustomer.Holidays === "" ? null : Number(selectedCustomer.Holidays),
    };

    let updatedCustomer = { id: selectedCustomer.id, ...custPayload };
    try {
      const res = await fetch(`/api/bulk-customers/${selectedCustomer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(custPayload),
      });
      if (res.ok) {
        const result = await res.json();
        const row = result?.row ?? result ?? {};
        updatedCustomer = {
          id: row.company_id ?? row.id ?? selectedCustomer.id,
          company_name: row.company_name ?? custPayload.company_name,
          mobile_number: row.mobile_number ?? custPayload.mobile_number,
          area: row.area ?? custPayload.area,
          indent_type: row.indent_type ?? custPayload.indent_type,
          payment_term: row.payment_term ?? custPayload.payment_term,
          default_quantity_weekdays: row.default_quantity_weekdays ?? custPayload.default_quantity_weekdays,
          Saturday: row.Saturday ?? custPayload.Saturday,
          Sunday: row.Sunday ?? custPayload.Sunday,
          Holidays: row.Holidays ?? custPayload.Holidays,
        };
      }
    } catch (err) {
      // fallback to local update
    }

    const next = bulkCustomers.map((c) =>
      String(c.id) === String(selectedCustomer.id)
        ? {
            id: updatedCustomer.id,
            company_name: updatedCustomer.company_name,
            mobile_number: updatedCustomer.mobile_number,
            area: updatedCustomer.area,
            indent_type: updatedCustomer.indent_type,
            payment_term: updatedCustomer.payment_term,
            default_quantity_weekdays: updatedCustomer.default_quantity_weekdays,
            Saturday: updatedCustomer.Saturday,
            Sunday: updatedCustomer.Sunday,
            Holidays: updatedCustomer.Holidays,
          }
        : c
    );
    setBulkCustomers(next);
    persist(next);

    setSaving(false);
    setShowEditModal(false);
    setSelectedCustomer(null);
  };

  const handleEditField = (field, value) => {
    setSelectedCustomer((s) => ({ ...s, [field]: value }));
  };

  return (
    <div style={styles.pageWrap}>
      <div style={styles.contentArea}>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.topRow}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Bulk Customers</div>
                <div style={styles.muted}>{loading ? "Loading…" : `${bulkCustomers.length} saved`}</div>
              </div>

              <div>
                <button onClick={openAdd} style={styles.addButton} aria-label="Add Bulk Customer" title="Add Bulk Customer">
                  <PlusSquare size={18} />
                  <span style={{ fontSize: 14 }}>Bulk Customer</span>
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              {bulkCustomers.length === 0 ? (
                <div style={styles.emptyNote}>No bulk customers yet. Tap + to add one.</div>
              ) : (
                <div style={styles.customersList}>
                  {bulkCustomers.map((c) => (
                    <div
                      key={c.id}
                      style={styles.customerItem}
                      onClick={() => openEdit(c)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && openEdit(c)}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.company_name}
                        </div>

                        <div style={{ color: "#6B7280", fontSize: 13, marginTop: 6 }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.mobile_number || "—"}
                          </span>
                          {c.area ? <span style={{ color: "#94A3B8", marginLeft: 8 }}>• {c.area}</span> : null}
                        </div>
                      </div>

                      <div>
                        <button
                          title="Delete"
                          aria-label={`Delete ${c.company_name}`}
                          style={styles.trashBtn}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            deleteCustomer(c.id);
                          }}
                        >
                          <Trash2 size={18} color="#ef4444" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ height: 24 }} />
        </div>
      </div>

      {/* Bottom-sheet Add Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <strong style={{ fontSize: 16 }}>Add Bulk Customer</strong>
              <button onClick={() => setShowAddModal(false)} style={{ border: "none", background: "transparent", fontSize: 20 }} aria-label="Close">
                ×
              </button>
            </div>

            <form onSubmit={submitAdd}>
              <input
                style={styles.input}
                placeholder="Company name"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer((s) => ({ ...s, name: e.target.value }))}
                required
                autoFocus
              />
              <input
                style={styles.input}
                placeholder="Phone (optional)"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer((s) => ({ ...s, phone: e.target.value }))}
                type="tel"
              />
              <input
                style={styles.input}
                placeholder="Area (optional)"
                value={newCustomer.area}
                onChange={(e) => setNewCustomer((s) => ({ ...s, area: e.target.value }))}
              />

              {/* Default Quantity block */}
              <div style={{ marginTop: 8 }}>
                <div style={styles.label}>Default Quantity (weekdays)</div>
                <input
                  style={styles.input}
                  value={newCustomer.default_quantity_weekdays}
                  onChange={(e) => setNewCustomer((s) => ({ ...s, default_quantity_weekdays: e.target.value }))}
                  type="number"
                  step="0.01"
                />

                {/* indent_type + payment_term grouped here */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                  <div>
                    <div style={styles.label}>Indent type</div>
                    <select
                      style={styles.input}
                      value={newCustomer.indent_type}
                      onChange={(e) => setNewCustomer((s) => ({ ...s, indent_type: e.target.value }))}
                    >
                      <option value="">Select indent type</option>
                      {(indentTypes || FALLBACK_INDENT_TYPES).map((it) => (
                        <option key={it} value={it}>
                          {it}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div style={styles.label}>Payment term</div>
                    <select
                      style={styles.input}
                      value={newCustomer.payment_term}
                      onChange={(e) => setNewCustomer((s) => ({ ...s, payment_term: e.target.value }))}
                    >
                      <option value="">Select payment term</option>
                      {(paymentTerms || FALLBACK_PAYMENT_TERMS).map((pt) => (
                        <option key={pt} value={pt}>
                          {pt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Saturday / Sunday / Holidays */}
              <div style={styles.fieldGrid}>
                <div>
                  <div style={styles.label}>Saturday</div>
                  <input
                    style={styles.input}
                    value={newCustomer.Saturday}
                    onChange={(e) => setNewCustomer((s) => ({ ...s, Saturday: e.target.value }))}
                    type="number"
                    step="0.01"
                  />
                </div>
                <div>
                  <div style={styles.label}>Sunday</div>
                  <input
                    style={styles.input}
                    value={newCustomer.Sunday}
                    onChange={(e) => setNewCustomer((s) => ({ ...s, Sunday: e.target.value }))}
                    type="number"
                    step="0.01"
                  />
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={styles.label}>Holidays</div>
                <input
                  style={styles.input}
                  value={newCustomer.Holidays}
                  onChange={(e) => setNewCustomer((s) => ({ ...s, Holidays: e.target.value }))}
                  type="number"
                  step="0.01"
                />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={styles.btnSecondary} onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" style={{ ...styles.addButton, justifyContent: "center", flex: 1 }} disabled={adding}>
                  <PlusSquare size={16} style={{ marginRight: 8 }} /> {adding ? "Adding…" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom-sheet Edit Modal (customer fields only) */}
      {showEditModal && selectedCustomer && (
        <div
          style={styles.modalOverlay}
          onClick={() => {
            setShowEditModal(false);
            setSelectedCustomer(null);
          }}
        >
          <div style={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <strong style={{ fontSize: 16 }}>Customer Details</strong>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedCustomer(null);
                }}
                style={{ border: "none", background: "transparent", fontSize: 20 }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveEdits}>
              <div style={{ marginBottom: 8 }}>
                <div style={styles.label}>Customer name</div>
                <input
                  style={styles.input}
                  value={selectedCustomer.company_name}
                  onChange={(e) => handleEditField("company_name", e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={styles.label}>Mobile number</div>
                <input style={styles.input} value={selectedCustomer.mobile_number} onChange={(e) => handleEditField("mobile_number", e.target.value)} />
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={styles.label}>Area</div>
                <input style={styles.input} value={selectedCustomer.area} onChange={(e) => handleEditField("area", e.target.value)} />
              </div>

              {/* Default Quantity block with indent_type & payment_term grouped under it */}
              <div style={{ marginTop: 8 }}>
                <div style={styles.label}>Default Quantity (weekdays)</div>
                <input
                  style={styles.input}
                  value={selectedCustomer.default_quantity_weekdays ?? ""}
                  onChange={(e) => handleEditField("default_quantity_weekdays", e.target.value)}
                  type="number"
                  step="0.01"
                />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                  <div>
                    <div style={styles.label}>Indent type</div>
                    <select
                      style={styles.input}
                      value={selectedCustomer.indent_type ?? ""}
                      onChange={(e) => handleEditField("indent_type", e.target.value)}
                    >
                      <option value="">Select indent type</option>
                      {(indentTypes || FALLBACK_INDENT_TYPES).map((it) => (
                        <option key={it} value={it}>
                          {it}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div style={styles.label}>Payment term</div>
                    <select
                      style={styles.input}
                      value={selectedCustomer.payment_term ?? ""}
                      onChange={(e) => handleEditField("payment_term", e.target.value)}
                    >
                      <option value="">Select payment term</option>
                      {(paymentTerms || FALLBACK_PAYMENT_TERMS).map((pt) => (
                        <option key={pt} value={pt}>
                          {pt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div style={styles.fieldGrid}>
                <div>
                  <div style={styles.label}>Saturday</div>
                  <input style={styles.input} value={selectedCustomer.Saturday ?? ""} onChange={(e) => handleEditField("Saturday", e.target.value)} type="number" step="0.01" />
                </div>
                <div>
                  <div style={styles.label}>Sunday</div>
                  <input style={styles.input} value={selectedCustomer.Sunday ?? ""} onChange={(e) => handleEditField("Sunday", e.target.value)} type="number" step="0.01" />
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={styles.label}>Holidays</div>
                <input style={styles.input} value={selectedCustomer.Holidays ?? ""} onChange={(e) => handleEditField("Holidays", e.target.value)} type="number" step="0.01" />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  style={styles.btnSecondary}
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedCustomer(null);
                  }}
                >
                  Cancel
                </button>

                <button type="submit" style={{ ...styles.addButton, justifyContent: "center", flex: 1 }} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
