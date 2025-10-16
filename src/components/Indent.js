// src/components/Indent.js
import React, { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Indent component (3-step)
 *  - Step 1: Delivery Boys (name, area, mobile on left; Qty(L) + milk packet image on right)
 *  - Step 2: Bulk Customers (name/area left; Qty(L) + bulk cans image on right)
 *  - Step 3: Review + Submit
 *
 * Props:
 *  - selectedDate: Date
 *  - onClose: fn
 *
 * Notes:
 *  - Delivery boys fetched from /api/delivery-boys
 *  - Bulk customers fetched from /api/bulk-customers?date=YYYY-MM-DD
 *  - Default delivery quantity falls back to 33 L
 *  - Delivery item image: /milkpacket.png
 *  - Bulk item image: /bulkcans.png
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

  const [loadingDelivery, setLoadingDelivery] = useState(true);
  const [loadingBulk, setLoadingBulk] = useState(true);

  const fallbackDelivery = [
    { id: 1, name: "Raj Kumar", area: "Area A", mobile: "9000000001", milkQuantity: "33", image: null },
    { id: 2, name: "Suresh Patel", area: "Area B", mobile: "9000000002", milkQuantity: "33", image: null },
    { id: 3, name: "Amit Sharma", area: "Area C", mobile: "9000000003", milkQuantity: "33", image: null },
    { id: 4, name: "Vikram Singh", area: "Area A", mobile: "9000000004", milkQuantity: "33", image: null },
    { id: 5, name: "Rahul Verma", area: "Area D", mobile: "9000000005", milkQuantity: "33", image: null },
  ];

  const fallbackBulk = [
    { id: 1, name: "Hotel Grand", area: "Market Road", totalMilk: "120", image: null },
    { id: 2, name: "Restaurant Spice", area: "Station St", totalMilk: "85", image: null },
    { id: 3, name: "Cafe Coffee", area: "Mall Rd", totalMilk: "65", image: null },
    { id: 4, name: "School Canteen", area: "School Lane", totalMilk: "95", image: null },
  ];

  /* ---------- fetch delivery boys (from Postgres API) ---------- */
  useEffect(() => {
    let mounted = true;
    (async function loadDelivery() {
      setLoadingDelivery(true);
      try {
        const res = await fetch("/api/delivery-boys");
        if (!res.ok) throw new Error("delivery fetch failed");
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
        // fallback handled below
      }
      if (mounted) {
        setDeliveryBoys(fallbackDelivery);
        setLoadingDelivery(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  /* ---------- fetch bulk customers (with date param) ---------- */
  useEffect(() => {
    let mounted = true;
    (async function loadBulk() {
      setLoadingBulk(true);

      // format selectedDate to YYYY-MM-DD
      let dateParam;
      try {
        const d = new Date(selectedDate);
        dateParam = d.toISOString().slice(0, 10);
      } catch (e) {
        dateParam = new Date().toISOString().slice(0, 10);
      }

      try {
        const res = await fetch(`/api/bulk-customers?date=${encodeURIComponent(dateParam)}`);
        if (!res.ok) throw new Error("bulk fetch failed");
        const data = await res.json();
        const rows = data?.rows ?? data ?? [];
        if (Array.isArray(rows) && mounted) {
          const mapped = rows.map((r) => ({
            id: r.company_id ?? r.id ?? `b-${Date.now()}-${Math.random()}`,
            name: r.company_name ?? r.name ?? "Unnamed",
            area: r.area ?? r.location ?? "",
            totalMilk: String(r.quantity ?? 0),
            image: r.logo_url ?? r.image ?? null,
          }));
          setBulkCustomers(mapped);
          setLoadingBulk(false);
          return;
        }
      } catch (err) {
        // fallback below
      }
      if (mounted) {
        setBulkCustomers(fallbackBulk);
        setLoadingBulk(false);
      }
    })();
    return () => (mounted = false);
  }, [selectedDate]);

  /* ---------- handlers ---------- */
  const setDeliveryQty = (id, qty) =>
    setDeliveryBoys((prev) => prev.map((p) => (p.id === id ? { ...p, milkQuantity: qty } : p)));

  const setBulkQty = (id, qty) =>
    setBulkCustomers((prev) => prev.map((p) => (p.id === id ? { ...p, totalMilk: qty } : p)));

  const handleImageUpload = (id, type, ev) => {
    const file = ev.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target.result;
      if (type === "bulk") setBulkCustomers((p) => p.map((x) => (x.id === id ? { ...x, image: src } : x)));
      else setDeliveryBoys((p) => p.map((x) => (x.id === id ? { ...x, image: src } : x)));
    };
    reader.readAsDataURL(file);
  };

  const totalDelivery = deliveryBoys.reduce((s, b) => s + Number(b.milkQuantity || 0), 0);
  const totalBulk = bulkCustomers.reduce((s, c) => s + Number(c.totalMilk || 0), 0);

  /* ---------- navigation helpers ---------- */
  const next = () => setStep((s) => Math.min(3, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));
  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  const submit = async () => {
    const payload = {
      date: selectedDate,
      deliveryBoys,
      bulkCustomers,
      totals: { delivery: totalDelivery, bulk: totalBulk },
    };
    try {
      await fetch("/api/indents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } catch (err) {
      console.warn("submit failed (best-effort)", err);
    }
    alert(`Indent submitted — Grand total ${totalDelivery + totalBulk} L`);
    onClose();
  };

  /* ---------- render UI ---------- */
  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* header / stepper */}
      <header className="flex items-center justify-between gap-4 p-4 border-b bg-white">
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
          <div className={`text-sm font-medium ${step >= 3 ? "text-amber-600" : "text-gray-500"}`}>Review</div>
        </div>
      </header>

      {/* body */}
      <main className="flex-1 overflow-auto p-4">
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
                    {/* left block: name/area/mobile (stacked) */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-gray-800 truncate">{b.name}</div>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">{b.area || "—"}</div>
                      <div className="mt-1 text-xs text-gray-400">Mobile: {b.mobile || "—"}</div>
                    </div>

                    {/* right block: qty + milk packet image */}
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
                          style={{ textAlign: "right" }}
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

        {/* Step 2: Bulk (same visual layout as Delivery) */}
        {step === 2 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Bulk Customers • {formatDate(selectedDate)}</h2>

            {loadingBulk ? (
              <div className="text-sm text-gray-500">Loading bulk customers…</div>
            ) : (
              <div className="space-y-3">
                {bulkCustomers.map((c) => (
                  <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center">
                    {/* left block: name/area */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold text-gray-800 truncate">{c.name}</div>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">{c.area || "—"}</div>
                    </div>

                    {/* right block: qty + bulk cans image */}
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
                          style={{ textAlign: "right" }}
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

        {/* Step 3: Review */}
        {step === 3 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Review • {formatDate(selectedDate)}</h2>

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

            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-gray-800">Grand Total</div>
                <div className="text-lg font-bold text-green-700 text-right">{totalDelivery + totalBulk}L</div>
              </div>
              <div className="text-xs text-gray-500 mt-1">For delivery on {formatDate(selectedDate)}</div>
            </div>
          </section>
        )}
      </main>

      {/* footer / actions */}
      <footer className="p-3 border-t bg-white">
        <div className="flex items-center justify-between">
          <div>
            {step > 1 ? (
              <button onClick={prev} className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">
                Previous
              </button>
            ) : (
              <div />
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <button onClick={next} className="px-4 py-2 rounded bg-amber-500 text-white hover:bg-amber-600">
                Next
              </button>
            ) : (
              <button onClick={submit} className="px-4 py-2 rounded bg-amber-600 text-white hover:bg-green-700">
                Submit Indent
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
