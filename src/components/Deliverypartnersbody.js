// src/components/DeliveryPartner.js
import React, { useEffect, useMemo, useState } from "react";
import { PlusSquare, Trash2, Edit3 } from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import "sweetalert2/dist/sweetalert2.min.css";

const MySwal = withReactContent(Swal);
MySwal.mixin({
  customClass: { popup: "swal-top-most" },
});

// Color tokens
const SUCCESS_YELLOW = "#F59E0B";
const FAILURE_LIGHT_RED = "#F87171";

const styles = {
  pageWrap: { width: "100%" },
  contentArea: {
    position: "relative",
    padding: "80px 0 96px",
    boxSizing: "border-box",
    WebkitOverflowScrolling: "touch",
    display: "flex",
    justifyContent: "center",
  },
  container: { width: "100%", maxWidth: 720 },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    border: "1px solid #E6E7EA",
    boxShadow: "0 4px 14px rgba(16,24,40,0.03)",
  },
  topRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  muted: { color: "#6B7280", fontSize: 13 },
  list: { marginTop: 12, display: "grid", gap: 8 },
  item: {
    padding: 12,
    borderRadius: 10,
    background: "#F8FAFC",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
  },
  left: { minWidth: 0 },
  title: { fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  metaRow: { color: "#6B7280", fontSize: 13, marginTop: 6, display: "flex", gap: 8, alignItems: "center" },
  actions: { display: "flex", gap: 8, alignItems: "center" },
  addButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 10,
    background: SUCCESS_YELLOW,
    color: "#fff",
    border: "none",
    fontWeight: 700,
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
};

// Force SweetAlert popup on top
if (typeof window !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    .swal2-container { z-index: 99999 !important; }
    .swal2-icon.swal2-success { border-color: ${SUCCESS_YELLOW} !important; color: ${SUCCESS_YELLOW} !important; }
    .swal2-icon.swal2-error { border-color: ${FAILURE_LIGHT_RED} !important; color: ${FAILURE_LIGHT_RED} !important; }
    .swal2-confirm { background-color: ${SUCCESS_YELLOW} !important; border-radius: 8px !important; }
    .swal2-confirm.swal2-styled:focus { box-shadow: 0 0 0 3px rgba(245,158,11,0.4) !important; }
  `;
  document.head.appendChild(style);
}

export default function DeliveryPartner() {
  const [partners, setPartners] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    employee_id: "",
    delivery_boy_name: "",
    mobile_number: "",
    delivery_area: "",
  });

  const routeAreas = useMemo(() => {
    const map = new Map();
    routes.forEach((r) => {
      const area = String(r.route_area || "").trim();
      if (area && !map.has(area.toLowerCase())) map.set(area.toLowerCase(), area);
    });
    return Array.from(map.values()).sort();
  }, [routes]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [db, rt] = await Promise.all([
          fetch("/api/delivery-boys"),
          fetch("/api/routes"),
        ]);
        if (db.ok) setPartners((await db.json()).rows ?? []);
        if (rt.ok) setRoutes((await rt.json()).rows ?? []);
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  const validateForm = () => {
    if (!form.delivery_boy_name.trim()) {
      MySwal.fire({
        icon: "warning",
        title: "Missing Name",
        text: "Please enter delivery partner name.",
        confirmButtonColor: SUCCESS_YELLOW,
      });
      return false;
    }
    if (!/^[0-9]{10}$/.test(form.mobile_number.trim())) {
      MySwal.fire({
        icon: "warning",
        title: "Invalid Mobile",
        text: "Please enter a valid 10-digit mobile number.",
        confirmButtonColor: SUCCESS_YELLOW,
      });
      return false;
    }
    return true;
  };

  const openAdd = async () => {
    let nextId = "";
    try {
      const res = await fetch("/api/delivery-boys?next=1");
      if (res.ok) nextId = (await res.json())?.next_id ?? "";
    } catch (_) {}
    setForm({
      employee_id: nextId,
      delivery_boy_name: "",
      mobile_number: "",
      delivery_area: routeAreas[0] ?? "",
    });
    setShowAdd(true);
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/delivery-boys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        MySwal.fire({
          icon: "success",
          title: "Added Successfully",
          text: "Delivery partner has been added.",
          confirmButtonColor: SUCCESS_YELLOW,
        });
        const refresh = await fetch("/api/delivery-boys");
        setPartners((await refresh.json()).rows ?? []);
      } else {
        MySwal.fire({
          icon: "error",
          title: "Add Failed",
          text: "Server returned an error.",
          confirmButtonColor: FAILURE_LIGHT_RED,
        });
      }
    } catch {
      MySwal.fire({
        icon: "error",
        title: "Network Error",
        text: "Could not connect to server.",
        confirmButtonColor: FAILURE_LIGHT_RED,
      });
    }
    setAdding(false);
    setShowAdd(false);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setEditing(true);
    try {
      const res = await fetch(`/api/delivery-boys?id=${form.employee_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        MySwal.fire({
          icon: "success",
          title: "Updated Successfully",
          text: "Partner details have been updated.",
          confirmButtonColor: SUCCESS_YELLOW,
        });
        const refresh = await fetch("/api/delivery-boys");
        setPartners((await refresh.json()).rows ?? []);
      } else {
        MySwal.fire({
          icon: "error",
          title: "Update Failed",
          text: "Server returned an error.",
          confirmButtonColor: FAILURE_LIGHT_RED,
        });
      }
    } catch {
      MySwal.fire({
        icon: "error",
        title: "Network Error",
        text: "Could not connect to server.",
        confirmButtonColor: FAILURE_LIGHT_RED,
      });
    }
    setEditing(false);
    setShowEdit(false);
  };

  const deletePartner = async (employee_id) => {
    const ok = await MySwal.fire({
      title: "Delete delivery partner?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: FAILURE_LIGHT_RED,
    });
    if (!ok.isConfirmed) return;

    try {
      const res = await fetch(`/api/delivery-boys?id=${employee_id}`, { method: "DELETE" });
      if (res.ok) {
        MySwal.fire({
          icon: "success",
          title: "Deleted",
          text: "Delivery partner removed.",
          confirmButtonColor: SUCCESS_YELLOW,
        });
        const refresh = await fetch("/api/delivery-boys");
        setPartners((await refresh.json()).rows ?? []);
      } else {
        MySwal.fire({
          icon: "error",
          title: "Delete Failed",
          text: "Server returned an error.",
          confirmButtonColor: FAILURE_LIGHT_RED,
        });
      }
    } catch {
      MySwal.fire({
        icon: "error",
        title: "Network Error",
        text: "Could not connect to server.",
        confirmButtonColor: FAILURE_LIGHT_RED,
      });
    }
  };

  return (
    <div style={styles.pageWrap}>
      <div style={styles.contentArea}>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.topRow}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Delivery Partners</div>
                <div style={styles.muted}>{loading ? "Loading…" : `${partners.length} saved`}</div>
              </div>
              <button onClick={openAdd} style={styles.addButton}><PlusSquare size={18} /> Add</button>
            </div>

            <div style={{ marginTop: 12 }}>
              {partners.length === 0 ? (
                <div style={{ color: "#6B7280" }}>No delivery partners yet. Tap + to add one.</div>
              ) : (
                <div style={styles.list}>
                  {partners.map((p) => (
                    <div key={p.employee_id} style={styles.item}>
                      <div style={styles.left}>
                        <div style={styles.title}>
                          {p.delivery_boy_name} <span style={{ color: "#94A3B8" }}>#{p.employee_id}</span>
                        </div>
                        <div style={styles.metaRow}>{p.mobile_number} • {p.delivery_area}</div>
                      </div>
                      <div style={styles.actions}>
                        <button
                          onClick={() => {
                            setForm(p);
                            setShowEdit(true);
                          }}
                          style={{ background: "none", border: "none" }}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => deletePartner(p.employee_id)}
                          style={{ background: "none", border: "none" }}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div style={styles.modalOverlay} onClick={() => setShowAdd(false)}>
          <div style={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
            <h3>Add Delivery Partner</h3>
            <form onSubmit={submitAdd}>
              <input
                style={styles.input}
                placeholder="Name"
                value={form.delivery_boy_name}
                onChange={(e) => setForm({ ...form, delivery_boy_name: e.target.value })}
                required
              />
              <input
                style={styles.input}
                placeholder="Mobile number (10 digits)"
                value={form.mobile_number.replace(/\D/g, "").slice(0, 10)}
                onChange={(e) => setForm({ ...form, mobile_number: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                required
              />
              <select
                style={styles.input}
                value={form.delivery_area}
                onChange={(e) => setForm({ ...form, delivery_area: e.target.value })}
              >
                <option value="">Select Area</option>
                {routeAreas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  style={{ ...styles.addButton, background: "#fff", color: "#000", border: "1px solid #E6E7EA" }}
                >
                  Cancel
                </button>
                <button type="submit" style={{ ...styles.addButton, flex: 1 }}>
                  {adding ? "Adding…" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div style={styles.modalOverlay} onClick={() => setShowEdit(false)}>
          <div style={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
            <h3>Edit Delivery Partner</h3>
            <form onSubmit={submitEdit}>
              <input
                style={styles.input}
                placeholder="Name"
                value={form.delivery_boy_name}
                onChange={(e) => setForm({ ...form, delivery_boy_name: e.target.value })}
                required
              />
              <input
                style={styles.input}
                placeholder="Mobile number (10 digits)"
                value={form.mobile_number.replace(/\D/g, "").slice(0, 10)}
                onChange={(e) => setForm({ ...form, mobile_number: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                required
              />
              <select
                style={styles.input}
                value={form.delivery_area}
                onChange={(e) => setForm({ ...form, delivery_area: e.target.value })}
              >
                <option value="">Select Area</option>
                {routeAreas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  style={{ ...styles.addButton, background: "#fff", color: "#000", border: "1px solid #E6E7EA" }}
                >
                  Cancel
                </button>
                <button type="submit" style={{ ...styles.addButton, flex: 1 }}>
                  {editing ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
