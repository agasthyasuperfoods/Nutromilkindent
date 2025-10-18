// src/components/RoutesBody.js
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { PlusSquare, Trash2, Edit3 } from "lucide-react";

/**
 * RoutesBody
 * - Uses /api/routes for GET/POST/PUT/DELETE
 * - SweetAlert2 used for confirm and success/error notifications
 * - Clicking a route row opens the Edit modal (same as Edit button)
 * - route_id is used internally only
 * - Removed "assigned delivery partner" UI and assignment fields
 */

const MySwal = withReactContent(Swal);

// Brand color tokens
const SUCCESS_YELLOW = "#F59E0B";
const FAILURE_LIGHT_RED = "#F87171";

const styles = {
  pageWrap: { width: "100%" },
  contentArea: { position: "relative", padding: "80px 0 96px", boxSizing: "border-box", display: "flex", justifyContent: "center" },
  container: { width: "100%", maxWidth: 920 },
  card: { background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, border: "1px solid #E6E7EA", boxShadow: "0 4px 14px rgba(16,24,40,0.03)" },
  topRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  muted: { color: "#6B7280", fontSize: 13 },
  list: { marginTop: 12, display: "grid", gap: 8 },
  item: { padding: 12, borderRadius: 10, background: "#F8FAFC", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" },
  left: { minWidth: 0 },
  title: { fontWeight: 700 },
  meta: { color: "#6B7280", marginTop: 6 },
  actions: { display: "flex", gap: 8, alignItems: "center" },
  addButton: { display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: SUCCESS_YELLOW, color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" },
  input: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #E6E7EA", marginBottom: 10, boxSizing: "border-box" },
  label: { fontSize: 13, color: "#374151", marginBottom: 6, fontWeight: 700 },
  modalOverlay: { position: "fixed", left: 0, right: 0, bottom: 0, top: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 3000 },
  modalSheet: { width: "100%", maxWidth: 720, borderTopLeftRadius: 12, borderTopRightRadius: 12, background: "#fff", padding: 16, boxSizing: "border-box", boxShadow: "0 -8px 30px rgba(2,6,23,0.15)", maxHeight: "80vh", overflowY: "auto" },
};

const STORAGE_KEY = "routes_local_v1";

// Inject global SweetAlert2 color overrides to align with brand tokens
if (typeof window !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    .swal2-container { z-index: 99999 !important; }
    .swal2-icon.swal2-success { border-color: ${SUCCESS_YELLOW} !important; color: ${SUCCESS_YELLOW} !important; }
    .swal2-icon.swal2-error { border-color: ${FAILURE_LIGHT_RED} !important; color: ${FAILURE_LIGHT_RED} !important; }
    .swal2-confirm { background-color: ${SUCCESS_YELLOW} !important; border-radius: 8px !important; }
    .swal2-confirm.swal2-styled:focus { box-shadow: 0 0 0 3px rgba(245,158,11,0.28) !important; }
    .swal2-popup { border-radius: 12px !important; }
  `;
  document.head.appendChild(style);
}

export default function RoutesBody() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    route_id: null,
    route_area: "",
    customer_count: "",
    total_quantity: "",
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const rRes = await fetch("/api/routes").catch(() => null);

        if (rRes && rRes.ok && mounted) {
          const json = await rRes.json();
          const rows = json?.rows ?? [];
          setRoutes(rows);
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); } catch (_) {}
        } else {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw && mounted) setRoutes(JSON.parse(raw));
        }
      } catch (err) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw && mounted) setRoutes(JSON.parse(raw));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => (mounted = false);
  }, []);

  const persist = (next) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (_) {}
  };

  const openAdd = () => {
    setForm({
      route_id: null,
      route_area: "",
      customer_count: "",
      total_quantity: "",
    });
    setShowAdd(true);
  };

  const submitAdd = async (e) => {
    e?.preventDefault?.();
    if (!form.route_area?.trim()) {
      MySwal.fire({ icon: "warning", title: "Missing", text: "Please enter route area", confirmButtonColor: SUCCESS_YELLOW });
      return;
    }
    setAdding(true);

    const payload = {
      // we intentionally omit employee_id and delivery_boy_name here
      route_area: form.route_area.trim(),
      customer_count: form.customer_count === "" ? null : Number(form.customer_count),
      total_quantity: form.total_quantity === "" ? null : Number(form.total_quantity),
    };

    const optimistic = { route_id: `local-${Date.now()}`, ...payload };

    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res && res.ok) {
        const json = await res.json();
        const row = json?.row ?? json ?? optimistic;
        const next = [row, ...routes];
        setRoutes(next);
        persist(next);
        setShowAdd(false);
        MySwal.fire({ icon: "success", title: "Route added", confirmButtonColor: SUCCESS_YELLOW });
        return;
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Add failed");
      }
    } catch (err) {
      // fallback optimistic
      const next = [optimistic, ...routes];
      setRoutes(next);
      persist(next);
      MySwal.fire({ icon: "warning", title: "Saved locally", text: "Could not reach server — saved locally.", confirmButtonColor: SUCCESS_YELLOW });
    } finally {
      setAdding(false);
      setShowAdd(false);
    }
  };

  const openEdit = (r) => {
    setForm({
      route_id: r.route_id,
      route_area: r.route_area ?? "",
      customer_count: r.customer_count ?? "",
      total_quantity: r.total_quantity ?? "",
    });
    setShowEdit(true);
  };

  const submitEdit = async (e) => {
    e?.preventDefault?.();
    if (!form.route_area?.trim()) {
      MySwal.fire({ icon: "warning", title: "Missing", text: "Please enter route area", confirmButtonColor: SUCCESS_YELLOW });
      return;
    }
    setEditing(true);

    const payload = {
      route_area: form.route_area.trim(),
      customer_count: form.customer_count === "" ? null : Number(form.customer_count),
      total_quantity: form.total_quantity === "" ? null : Number(form.total_quantity),
    };

    let updated = { route_id: form.route_id, ...payload };

    try {
      const res = await fetch(`/api/routes?id=${encodeURIComponent(form.route_id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res && res.ok) {
        const json = await res.json();
        updated = json?.row ?? json ?? updated;
        const next = routes.map((rr) => (String(rr.route_id) === String(updated.route_id) ? updated : rr));
        setRoutes(next);
        persist(next);
        MySwal.fire({ icon: "success", title: "Saved", confirmButtonColor: SUCCESS_YELLOW });
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Save failed");
      }
    } catch (err) {
      // fallback optimistic update
      const next = routes.map((rr) => (String(rr.route_id) === String(updated.route_id) ? updated : rr));
      setRoutes(next);
      persist(next);
      MySwal.fire({ icon: "warning", title: "Saved locally", text: "Could not reach server — changes saved locally.", confirmButtonColor: SUCCESS_YELLOW });
    } finally {
      setEditing(false);
      setShowEdit(false);
    }
  };

  const deleteRoute = async (id) => {
    const ok = await MySwal.fire({
      title: "Delete route?",
      text: "This will permanently remove the route from database.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: FAILURE_LIGHT_RED,
    });
    if (!ok.isConfirmed) return;

    try {
      const res = await fetch(`/api/routes?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res && res.ok) {
        const next = routes.filter((r) => String(r.route_id) !== String(id));
        setRoutes(next);
        persist(next);
        MySwal.fire({ icon: "success", title: "Deleted", confirmButtonColor: SUCCESS_YELLOW });
        return;
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Delete failed");
      }
    } catch (err) {
      // fallback: remove locally
      const next = routes.filter((r) => String(r.route_id) !== String(id));
      setRoutes(next);
      persist(next);
      MySwal.fire({ icon: "warning", title: "Deleted locally", text: "Could not delete on server; removed locally.", confirmButtonColor: SUCCESS_YELLOW });
    }
  };

  return (
    <div style={styles.pageWrap}>
      <div style={styles.contentArea}>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.topRow}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Routes</div>
                <div style={styles.muted}>{loading ? "Loading…" : `${routes.length} routes`}</div>
              </div>

              <div>
                <button onClick={openAdd} style={styles.addButton}>
                  <PlusSquare size={16} /> <span style={{ marginLeft: 6 }}>Add route</span>
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              {routes.length === 0 ? (
                <div style={styles.muted}>No routes yet.</div>
              ) : (
                <div style={styles.list}>
                  {routes.map((r) => (
                    <div
                      key={r.route_id}
                      style={styles.item}
                      role="button"
                      tabIndex={0}
                      onClick={() => openEdit(r)}
                      onKeyDown={(e) => { if (e.key === "Enter") openEdit(r); }}
                    >
                      <div style={styles.left}>
                        <div style={styles.title}>{r.route_area}</div>
                        <div style={styles.meta}>
                          <span>Customers: {r.customer_count ?? "—"}</span>
                          <span style={{ marginLeft: 12 }}>Qty: {r.total_quantity ?? "—"}</span>
                        </div>
                      </div>
                      <div style={styles.actions}>
                        <button
                          title="Edit"
                          aria-label={`Edit route ${r.route_id}`}
                          style={{ border: "none", background: "transparent", cursor: "pointer", padding: 6 }}
                          onClick={(ev) => { ev.stopPropagation(); openEdit(r); }}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          title="Delete"
                          aria-label={`Delete route ${r.route_id}`}
                          style={{ border: "none", background: "transparent", cursor: "pointer", padding: 6 }}
                          onClick={(ev) => { ev.stopPropagation(); deleteRoute(r.route_id); }}
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

      {/* Add modal */}
      {showAdd && (
        <div style={styles.modalOverlay} onClick={() => setShowAdd(false)}>
          <div style={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <strong style={{ fontSize: 16 }}>Add Route</strong>
              <button onClick={() => setShowAdd(false)} style={{ border: "none", background: "transparent", fontSize: 20 }}>×</button>
            </div>

            <form onSubmit={submitAdd}>
              <div>
                <div style={styles.label}>Route area</div>
                <input style={styles.input} value={form.route_area} onChange={(e) => setForm((s) => ({ ...s, route_area: e.target.value }))} required />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <div style={styles.label}>Customer count</div>
                  <input style={styles.input} value={form.customer_count} onChange={(e) => setForm((s) => ({ ...s, customer_count: e.target.value }))} type="number" />
                </div>
                <div>
                  <div style={styles.label}>Total quantity</div>
                  <input style={styles.input} value={form.total_quantity} onChange={(e) => setForm((s) => ({ ...s, total_quantity: e.target.value }))} type="number" step="0.01" />
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button type="button" style={{ ...styles.addButton, background: "#fff", color: "#374151", border: "1px solid #E6E7EA" }} onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" style={{ ...styles.addButton, justifyContent: "center", flex: 1 }} disabled={adding}>
                  {adding ? "Adding…" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEdit && (
        <div style={styles.modalOverlay} onClick={() => setShowEdit(false)}>
          <div style={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <strong style={{ fontSize: 16 }}>Edit Route</strong>
              <button onClick={() => setShowEdit(false)} style={{ border: "none", background: "transparent", fontSize: 20 }}>×</button>
            </div>

            <form onSubmit={submitEdit}>
              <div>
                <div style={styles.label}>Route area</div>
                <input style={styles.input} value={form.route_area} onChange={(e) => setForm((s) => ({ ...s, route_area: e.target.value }))} required />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <div style={styles.label}>Customer count</div>
                  <input style={styles.input} value={form.customer_count} onChange={(e) => setForm((s) => ({ ...s, customer_count: e.target.value }))} type="number" />
                </div>
                <div>
                  <div style={styles.label}>Total quantity</div>
                  <input style={styles.input} value={form.total_quantity} onChange={(e) => setForm((s) => ({ ...s, total_quantity: e.target.value }))} type="number" step="0.01" />
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button type="button" style={{ ...styles.addButton, background: "#fff", color: "#374151", border: "1px solid #E6E7EA" }} onClick={() => setShowEdit(false)}>Cancel</button>
                <button type="submit" style={{ ...styles.addButton, justifyContent: "center", flex: 1 }} disabled={editing}>
                  {editing ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
