// src/components/Indent.js
import React, { useEffect, useState } from "react";
import Image from "next/image";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

/**
 * Indent component (4-step workflow)
 * Step 1: Delivery Boys
 * Step 2: Bulk Customers
 * Step 3: Junnu Milk Assignment (assign to delivery boy OR bulk customer)
 * Step 4: Review + Submit
 */

function PlaceholderLogo({ className = "w-6 h-6 text-gray-400" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M8 7V4h8v3" />
    </svg>
  );
}
export default function Indent({ selectedDate = new Date(), onClose = () => {} }) {
  const [step, setStep] = useState(1);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [bulkCustomers, setBulkCustomers] = useState([]);
  // Junnu list entries: each row: { id, assignedType: 'delivery'|'bulk'|'', assignedId: '', assignedName:'', qty: '0' }
  const [junnuList, setJunnuList] = useState([{ id: Date.now(), assignedType: "", assignedId: "", assignedName: "", qty: "0" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingDelivery, setLoadingDelivery] = useState(true);
  const [loadingBulk, setLoadingBulk] = useState(true);
  /* ---------------- fallback data ---------------- */
  const fallbackDelivery = [
    { id: 1, name: "Raj Kumar", area: "Area A", mobile: "9000000001", milkQuantity: "33", image: null },
    { id: 2, name: "Suresh Patel", area: "Area B", mobile: "9000000002", milkQuantity: "33", image: null },
    { id: 3, name: "Amit Sharma", area: "Area C", mobile: "9000000003", milkQuantity: "33", image: null },
  ];
  const fallbackBulk = [
    { id: 101, name: "Hotel Grand", area: "Market Road", totalMilk: "120", month_year: null, image: null },
    { id: 102, name: "Restaurant Spice", area: "Station St", totalMilk: "85", month_year: null, image: null },
  ];
  /* ---------------- fetch delivery boys ---------------- */
  useEffect(() => {
    let mounted = true;
    (async function loadDelivery() {
      setLoadingDelivery(true);
      try {
        const res = await fetch("/api/delivery-boys");
        if (!res.ok) throw new Error(`delivery fetch failed: ${res.status}`);
        const data = await res.json();
        const rows = data?.rows ?? data ?? [];
        if (Array.isArray(rows) && mounted) {
          const mapped = rows.map((r) => ({
            id: r.employee_id ?? r.id ?? `d-${Date.now()}-${Math.random()}`,
            name: r.delivery_boy_name ?? r.name ?? "Unnamed",
            area: r.delivery_area ?? r.area ?? "",
            mobile: r.mobile_number ?? r.mobile ?? "",
            milkQuantity: String(r.milk_quantity ?? r.default_quantity ?? 33),
            image: r.avatar_url ?? r.image ?? null,
          }));
          setDeliveryBoys(mapped);
          setLoadingDelivery(false);
          return;
        }
      } catch (err) {
        console.warn("loadDelivery() error:", err);
      }
      if (mounted) {
        setDeliveryBoys(fallbackDelivery);
        setLoadingDelivery(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  /* ---------------- fetch bulk customers (joined with monthly indents via your API) ---------------- */
  useEffect(() => {
    let mounted = true;
    (async function loadBulk() {
      setLoadingBulk(true);
      try {
        // safe date -> YYYY-MM-DD
        const d = new Date(selectedDate);
        const dateParam = d.toISOString().slice(0, 10);
        const res = await fetch(`/api/bulk-customers?date=${encodeURIComponent(dateParam)}`);
        if (!res.ok) throw new Error(`bulk fetch failed: ${res.status}`);
        const data = await res.json();
        const rows = Array.isArray(data) ? data : data?.rows ?? data?.data ?? [];
        if (!Array.isArray(rows) || rows.length === 0) throw new Error("no rows");

        // pick weekday / weekend quantities if your API returned monthly values
        const dayIndex = new Date(selectedDate).getDay();
        const mapped = rows.map((r) => {
          const qWeek = r.quantity_weekdays ?? r.default_quantity_weekdays ?? r.quantity ?? 0;
          const qSat = r.quantity_saturday ?? r.saturday ?? null;
          const qSun = r.quantity_sunday ?? r.sunday ?? null;
          let chosen = qWeek;
          if (dayIndex === 6 && qSat != null) chosen = qSat;
          if (dayIndex === 0 && qSun != null) chosen = qSun;
          return {
            id: r.company_id ?? r.id ?? `b-${Date.now()}-${Math.random()}`,
            name: r.company_name ?? r.name ?? "Unnamed",
            area: r.area ?? r.location ?? "",
            totalMilk: String(chosen ?? 0),
            month_year: r.month_year ?? null,
            image: r.logo_url ?? r.image ?? null,
            raw: r,
          };
        });
        if (mounted) {
          setBulkCustomers(mapped);
          setLoadingBulk(false);
        }
      } catch (err) {
        console.warn("loadBulk() error:", err);
        if (mounted) {
          setBulkCustomers(fallbackBulk);
          setLoadingBulk(false);
        }
      }
    })();
    return () => (mounted = false);
  }, [selectedDate]);

  /* ---------------- update handlers ---------------- */
  const setDeliveryQty = (id, qty) =>
    setDeliveryBoys((prev) => prev.map((p) => (String(p.id) === String(id) ? { ...p, milkQuantity: qty } : p)));

  const setBulkQty = (id, qty) =>
    setBulkCustomers((prev) => prev.map((p) => (String(p.id) === String(id) ? { ...p, totalMilk: qty } : p)));

  /* ---------------- Junnu CRUD operations ---------------- */
  const addJunnuRow = () =>
    setJunnuList((p) => [...p, { id: Date.now() + Math.floor(Math.random() * 999), assignedType: "", assignedId: "", assignedName: "", qty: "0" }]);

  const removeJunnuRow = (id) => setJunnuList((p) => p.filter((r) => r.id !== id));

  // when user selects an assignee, we store assignedType ('delivery'|'bulk'), assignedId and assignedName
  const updateJunnuAssignee = (rowId, assignedType, assignedId) => {
    if (!assignedType) {
      setJunnuList((p) => p.map((r) => (r.id === rowId ? { ...r, assignedType: "", assignedId: "", assignedName: "" } : r)));
      return;
    }
    let assignedName = "";
    if (assignedType === "delivery") {
      const found = deliveryBoys.find((b) => String(b.id) === String(assignedId));
      assignedName = found ? found.name : "";
    } else if (assignedType === "bulk") {
      const found = bulkCustomers.find((c) => String(c.id) === String(assignedId));
      assignedName = found ? found.name : "";
    }
    setJunnuList((p) => p.map((r) => (r.id === rowId ? { ...r, assignedType, assignedId, assignedName } : r)));
  };

  const updateJunnuQty = (rowId, qty) => {
    // sanitize to numeric-string
    const sanitized = qty === "" ? "" : String(qty);
    setJunnuList((p) => p.map((r) => (r.id === rowId ? { ...r, qty: sanitized } : r)));
  };

  /* ---------------- totals ---------------- */
  const totalDelivery = deliveryBoys.reduce((s, b) => s + Number(b.milkQuantity || 0), 0);
  const totalBulk = bulkCustomers.reduce((s, c) => s + Number(c.totalMilk || 0), 0);
  const totalJunnu = junnuList.reduce((s, j) => s + Number(j.qty || 0), 0);
  const grandTotal = totalDelivery + totalBulk + totalJunnu;

  /* ---------------- navigation & submit ---------------- */
  const next = () => setStep((s) => Math.min(4, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));
  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  // 🔴 FINAL SUBMIT FUNCTION TO SEND DATA TO THE NEW API
const submit = async () => {
  setIsSubmitting(true); // show loader
  const deliveryEntries = deliveryBoys
    .filter(d => Number(d.milkQuantity) > 0)
    .map(d => ({
      date: selectedDate.toISOString().slice(0, 10),
      delivery_boy_id: String(d.id),
      company_id: null,
      company_name: d.name,
      quantity: Number(d.milkQuantity),
      item_type: "REGULAR_MILK",
    }));

  const bulkEntries = bulkCustomers
    .filter(c => Number(c.totalMilk) > 0)
    .map(c => ({
      date: selectedDate.toISOString().slice(0, 10),
      delivery_boy_id: null,
      company_id: String(c.id),
      company_name: c.name,
      quantity: Number(c.totalMilk),
      item_type: "REGULAR_MILK",
    }));

  const junnuEntries = junnuList
    .filter(j => Number(j.qty) > 0 && j.assignedType)
    .map(j => {
      const isDelivery = j.assignedType === "delivery";
      return {
        date: selectedDate.toISOString().slice(0, 10),
        delivery_boy_id: isDelivery ? String(j.assignedId) : null,
        company_id: isDelivery ? null : String(j.assignedId),
        company_name: j.assignedName,
        quantity: Number(j.qty),
        item_type: "JUNNU_MILK",
      };
    });

  const payload = [...deliveryEntries, ...bulkEntries, ...junnuEntries];

  try {
    const res = await fetch("/api/indents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Submission failed");

    await Swal.fire({
      icon: "success",
      title: "Indent Submitted!",
      html: `<strong>Grand Total:</strong> ${data.grandTotal || 0} L`,
      confirmButtonColor: "#f59e0b",
    });

    onClose();
  } catch (err) {
    console.error("Submit failed:", err);
    Swal.fire({
      icon: "error",
      title: "Submission Failed",
      text: err.message || "Check console for details",
      confirmButtonColor: "#f43f5e",
    });
  } finally {
    setIsSubmitting(false); // hide loader
  }
};




  /* ---------------- render ---------------- */
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* header / stepper */}
      <header className="flex items-center justify-between gap-4 p-4 bg-white">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-600"}`}>1</div>
          <div className={`text-sm font-medium ${step >= 1 ? "text-amber-600" : "text-gray-500"}`}>Delivery</div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-600"}`}>2</div>
          <div className={`text-sm font-medium ${step >= 2 ? "text-amber-600" : "text-gray-500"}`}>Bulk</div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-600"}`}>3</div>
          <div className={`text-sm font-medium ${step >= 3 ? "text-amber-600" : "text-gray-500"}`}>Junnu</div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 4 ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-600"}`}>4</div>
          <div className={`text-sm font-medium ${step >= 4 ? "text-amber-600" : "text-gray-500"}`}>Review</div>
        </div>
      </header>

      {/* body */}
      <main className="flex-1 overflow-auto p-4 space-y-4">
        {/* Step 1: Delivery */}
        {step === 1 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Delivery Boys • {formatDate(selectedDate)}</h2>
            {loadingDelivery ? (
              <div className="text-sm text-gray-500">Loading delivery boys…</div>
            ) : (
              <div className="space-y-3">
                {deliveryBoys.map((b) => (
                  <div key={b.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="text-sm font-semibold text-gray-800 truncate">{b.name}</div>
                      <div className="mt-1 text-xs text-gray-500">{b.area || "—"}</div>
                      <div className="mt-1 text-xs text-gray-400">Mobile: {b.mobile || "—"}</div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-28">
                        <div className="flex justify-end">
                          <label htmlFor={`del-qty-${b.id}`} className="text-xs text-gray-600 text-right">
                            Qty (L)
                          </label>
                        </div>
                        <input
                          id={`del-qty-${b.id}`}
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={b.milkQuantity ?? ""}
                          onChange={(e) => setDeliveryQty(b.id, e.target.value)}
                          className="w-full mt-1 rounded-md border border-gray-200 px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-amber-300"
                        />
                      </div>

                      <div className="flex-shrink-0" style={{ width: 80, height: 80, position: "relative" }}>
                        <Image src="/milkpacket.png" alt="Milk Packet" layout="fill" objectFit="contain" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Step 2: Bulk */}
        {step === 2 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Bulk Customers • {formatDate(selectedDate)}</h2>
            {loadingBulk ? (
              <div className="text-sm text-gray-500">Loading bulk customers…</div>
            ) : (
              <div className="space-y-3">
                {bulkCustomers.map((c) => (
                  <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="text-sm font-semibold text-gray-800 truncate">{c.name}</div>
                      {c.month_year ? <div className="mt-1 text-xs text-gray-400">{c.month_year}</div> : null}
                      <div className="mt-1 text-xs text-gray-500">{c.area || "—"}</div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-28">
                        <div className="flex justify-end">
                          <label htmlFor={`bulk-qty-${c.id}`} className="text-xs text-gray-600 text-right">
                            Qty (L)
                          </label>
                        </div>
                        <input
                          id={`bulk-qty-${c.id}`}
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={c.totalMilk ?? ""}
                          onChange={(e) => setBulkQty(c.id, e.target.value)}
                          className="w-full mt-1 rounded-md border border-gray-200 px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-amber-300"
                        />
                      </div>

                      <div className="flex-shrink-0" style={{ width: 80, height: 80, position: "relative" }}>
                        <Image src="/milkcans.png" alt="Bulk Cans" layout="fill" objectFit="contain" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Step 3: Junnu Assignment (Card Layout) */}
        {step === 3 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Junnu Milk Assignment</h2>
            <p className="text-sm text-gray-600">Assign Junnu milk to delivery boys or bulk customers. Each record represents a Junnu dispatch.</p>

            <div className="space-y-3">
              {junnuList.map((row) => (
                <div key={row.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center">
                  {/* Left side: dropdown */}
                  <div className="flex-1 min-w-0 pr-4">
                    <label className="block text-xs text-gray-600 mb-1">Assign To</label>
                    <select
                      value={row.assignedType ? `${row.assignedType}:${row.assignedId}` : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) updateJunnuAssignee(row.id, "", "");
                        else {
                          const [type, id] = val.split(":");
                          updateJunnuAssignee(row.id, type, id);
                        }
                      }}
                      className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-amber-300"
                    >
                      <option value="">Select Customer</option>
                      <optgroup label="Delivery Boys">
                        {deliveryBoys.map((b) => (
                          <option key={`d-${b.id}`} value={`delivery:${b.id}`}>
                            {b.name} {b.area ? `— ${b.area}` : ""}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Bulk Customers">
                        {bulkCustomers.map((c) => (
                          <option key={`b-${c.id}`} value={`bulk:${c.id}`}>
                            {c.name} {c.area ? `— ${c.area}` : ""}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Right side: qty + image */}
                  <div className="flex items-center gap-4">
                    <div className="w-28">
                      <label className="block text-xs text-gray-600 text-right">Qty (L)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={row.qty ?? ""}
                        onChange={(e) => updateJunnuQty(row.id, e.target.value)}
                        className="w-full mt-1 rounded-md border border-gray-200 px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-amber-300"
                      />
                    </div>

                    <div className="flex-shrink-0" style={{ width: 80, height: 80, position: "relative" }}>
                      <Image src="/junnu.png" alt="Junnu Milk" layout="fill" objectFit="contain" />
                    </div>
                  </div>

                  {/* Delete button (optional) */}
                  <button
                    type="button"
                    onClick={() => removeJunnuRow(row.id)}
                    className="ml-3 text-red-500 hover:text-red-700 text-lg"
                    title="Remove entry"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center mt-3">
              <button
                type="button"
                onClick={addJunnuRow}
                className="px-3 py-2 bg-amber-100 text-amber-700 rounded-md text-sm hover:bg-amber-200"
              >
                + Add Another
              </button>
              <div className="text-sm text-gray-700">
                Total Junnu: <span className="font-semibold text-amber-700">{totalJunnu} L</span>
              </div>
            </div>
          </section>
        )}


        {/* Step 4: Review (restored earlier UI you liked) */}
        {step === 4 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Review • {formatDate(selectedDate)}</h2>

            {/* Delivery Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
              <div className="font-medium text-gray-700">Delivery Summary</div>
              <div className="space-y-2">
                {deliveryBoys.map((d) => (
                  <div key={d.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0" style={{ width: 40, height: 40, position: "relative" }}>
                        <Image src="/milkpacket.png" alt="Milk Packet" layout="fill" objectFit="contain" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{d.name}</div>
                        <div className="text-xs text-gray-500">{d.area}</div>
                      </div>
                    </div>
                    <div className="text-amber-600 font-semibold text-right">{Number(d.milkQuantity || 0)}L</div>
                  </div>
                ))}
                <div className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-100">
                  <div className="font-medium text-gray-800">Total Delivery Milk</div>
                  <div className="font-bold text-amber-700 text-right">{totalDelivery}L</div>
                </div>
              </div>
            </div>

            {/* Bulk Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
              <div className="font-medium text-gray-700">Bulk Summary</div>
              <div className="space-y-2">
                {bulkCustomers.map((b) => (
                  <div key={b.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0" style={{ width: 40, height: 40, position: "relative" }}>
                        <Image src="/milkcans.png" alt="Bulk Cans" layout="fill" objectFit="contain" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{b.name}</div>
                        <div className="text-xs text-gray-500">{b.area}</div>
                      </div>
                    </div>
                    <div className="text-amber-600 font-semibold text-right">{Number(b.totalMilk || 0)}L</div>
                  </div>
                ))}
                <div className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-100">
                  <div className="font-medium text-gray-800">Total Bulk Milk</div>
                  <div className="font-bold text-amber-700 text-right">{totalBulk}L</div>
                </div>
              </div>
            </div>

            {/* Junnu Assignment summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
              <div className="font-medium text-gray-700">Junnu Assignment</div>
              <div className="space-y-1">
                {junnuList.map((j) =>
                  j.assignedType && j.assignedName ? (
                    <div key={j.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">{j.assignedName}</div>
                          <div className="text-xs text-gray-500">{j.assignedType === "delivery" ? "Delivery" : "Bulk"}</div>
                        </div>
                      </div>
                      <div className="text-amber-600 font-semibold text-right">{Number(j.qty || 0)}L</div>
                    </div>
                  ) : null
                )}
                <div className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-100">
                  <div className="font-medium text-gray-800">Total Junnu</div>
                  <div className="font-bold text-amber-700 text-right">{totalJunnu}L</div>
                </div>
              </div>
            </div>

            {/* Grand total */}
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-gray-800">Grand Total</div>
                <div className="text-lg font-bold text-green-700 text-right">{grandTotal}L</div>
              </div>
              <div className="text-xs text-gray-500 mt-1">For delivery on {formatDate(selectedDate)}</div>
            </div>
          </section>
        )}
      </main>

      {/* footer / actions */}
      <footer className="p-3 bg-white">
        <div className="flex gap-3">
          <div className="flex-1">
            {step > 1 ? (
              <button
                type="button"
                onClick={prev}
                className="w-full h-12 flex items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 text-lg"
              >
                Previous
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onClose()}
                className="w-full h-12 flex items-center justify-center rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-lg"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex-1">
            {step < 4 ? (
              <button
                type="button"
                onClick={next}
                className="w-full h-12 flex items-center justify-center rounded-md bg-amber-500 text-white hover:bg-amber-600 text-lg"
              >
                Next
              </button>
            ) : (
     <button
  type="button"
  onClick={submit}
  disabled={isSubmitting} // prevent multiple clicks
  className={`w-full h-12 flex items-center justify-center rounded-md bg-amber-600 text-white hover:bg-amber-700 text-lg ${
    isSubmitting ? "cursor-not-allowed opacity-70" : ""
  }`}
>
  {isSubmitting ? (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
    </svg>
  ) : (
    "Submit Indent"
  )}
</button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}