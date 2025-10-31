// src/components/Indent.js
import React, { useEffect, useState } from "react";
import Image from "next/image";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import jsPDF from "jspdf";

export default function Indent({ selectedDate = new Date(), onClose = () => {} }) {
  const [step, setStep] = useState(1);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [bulkCustomers, setBulkCustomers] = useState([]);
  const [junnuList, setJunnuList] = useState([{ id: Date.now(), assignedType: "", assignedId: "", assignedName: "", qty: "0" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingDelivery, setLoadingDelivery] = useState(true);
  const [loadingBulk, setLoadingBulk] = useState(true);

  const fallbackDelivery = [
    { id: 1, name: "Raj Kumar", area: "Area A", milkQuantity: "33" },
    { id: 2, name: "Suresh Patel", area: "Area B", milkQuantity: "33" },
  ];
  
  const fallbackBulk = [
    { id: 101, name: "Hotel Grand", area: "Market Road", totalMilk: "120" },
    { id: 102, name: "Restaurant Spice", area: "Station St", totalMilk: "85" },
  ];

  // Fetch delivery boys from HR database
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
            id: r.id ?? `d-${Date.now()}-${Math.random()}`,
            name: r.name ?? "Unnamed",
            area: r.area ?? "",
            milkQuantity: String(r.milk_quantity ?? r.default_quantity ?? 33),
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

  // Fetch bulk customers from bulk-customers-v2 (already joined with monthly_bulk_indents)
  useEffect(() => {
    let mounted = true;
    (async function loadBulk() {
      setLoadingBulk(true);
      try {
        // Use bulk-customers-v2 which already joins with monthly_bulk_indents
        const res = await fetch('/api/bulk-customers-v2');
        if (!res.ok) throw new Error(`bulk fetch failed: ${res.status}`);
        const data = await res.json();
        const rows = data?.rows ?? [];
        
        if (!Array.isArray(rows) || rows.length === 0) throw new Error("no rows");
        
        const dayIndex = new Date(selectedDate).getDay();
        const mapped = rows.map((r) => {
          // Data comes from monthly_bulk_indents via JOIN
          const qWeek = r.default_quantity_weekdays ?? 0;
          const qSat = r.saturday ?? null;
          const qSun = r.sunday ?? null;
          
          // Choose quantity based on day of week
          let chosen = qWeek;
          if (dayIndex === 6 && qSat != null) chosen = qSat; // Saturday
          if (dayIndex === 0 && qSun != null) chosen = qSun; // Sunday
          
          return {
            id: r.company_id ?? `b-${Date.now()}-${Math.random()}`,
            name: r.company_name ?? "Unnamed",
            area: r.area ?? "",
            totalMilk: String(chosen ?? 0),
            month_year: r.month_year ?? null,
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

  const setDeliveryQty = (id, qty) =>
    setDeliveryBoys((prev) => prev.map((p) => (String(p.id) === String(id) ? { ...p, milkQuantity: qty } : p)));

  const setBulkQty = (id, qty) =>
    setBulkCustomers((prev) => prev.map((p) => (String(p.id) === String(id) ? { ...p, totalMilk: qty } : p)));

  const addJunnuRow = () =>
    setJunnuList((p) => [...p, { id: Date.now() + Math.floor(Math.random() * 999), assignedType: "", assignedId: "", assignedName: "", qty: "0" }]);

  const removeJunnuRow = (id) => setJunnuList((p) => p.filter((r) => r.id !== id));

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
    const sanitized = qty === "" ? "" : String(qty);
    setJunnuList((p) => p.map((r) => (r.id === rowId ? { ...r, qty: sanitized } : r)));
  };

  const totalDelivery = deliveryBoys.reduce((s, b) => s + Number(b.milkQuantity || 0), 0);
  const totalBulk = bulkCustomers.reduce((s, c) => s + Number(c.totalMilk || 0), 0);
  const totalJunnu = junnuList.reduce((s, j) => s + Number(j.qty || 0), 0);
  const grandTotal = totalDelivery + totalBulk + totalJunnu;

  const next = () => setStep((s) => Math.min(4, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));
  
  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  const generateInvoicePdfBase64 = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 36;
    const col1 = 36;
    const col2 = 300;
    const col3 = 400;
    const col4 = 480;
    const pageWidth = 595;
    const pageHeight = 842;
    let y = margin;
    const lineHeight = 14;

    // Header
    doc.setFont("Helvetica", "Bold");
    doc.setFontSize(20);
    doc.text("NutroMilk Indent Report", pageWidth / 2, y, { align: "center" });
    y += 24;

    // Company Details
    doc.setFontSize(10);
    doc.setFont("Helvetica", "Normal");
    doc.text("Agasthya Nutromilk", col2, y);
    doc.text("Phone: +91-8121001774", col2, y + lineHeight);
    doc.text("Email: info.anm@agasthya.co.in", col2, y + lineHeight * 2);
    y += 60;

    // Date Box
    doc.setDrawColor(0);
    doc.rect(col1, y, pageWidth - 2 * margin, 20);
    doc.setFont("Helvetica", "Bold");
    doc.text("INDENT FOR DELIVERY ON:", col1 + 5, y + 13);
    doc.setFont("Helvetica", "Normal");
    doc.text(formatDate(selectedDate), col1 + 180, y + 13);
    doc.text("Generated:", col4 - 100, y + 13);
    doc.text(new Date().toLocaleDateString('en-GB'), col4 - 35, y + 13);
    y += 30;

    // Table Header
    doc.setFillColor(230, 230, 230);
    doc.rect(col1, y, pageWidth - 2 * margin, 20, 'F');
    doc.setFont("Helvetica", "Bold");
    doc.text("SI No.", col1 + 5, y + 13);
    doc.text("ITEM / ASSIGNED TO", col1 + 60, y + 13);
    doc.text("QTY (L)", col3 + 15, y + 13, { align: 'right' });
    doc.text("TYPE", col4 + 5, y + 13);
    y += 20;

    // Table Body
    doc.setFont("Helvetica", "Normal");
    let siNo = 1;

    const drawRow = (name, quantity, type) => {
      if (y > pageHeight - margin - 150) {
        doc.addPage();
        y = margin;
        doc.setFillColor(230, 230, 230);
        doc.rect(col1, y, pageWidth - 2 * margin, 20, 'F');
        doc.setFont("Helvetica", "Bold");
        doc.text("SI No.", col1 + 5, y + 13);
        doc.text("ITEM / ASSIGNED TO", col1 + 60, y + 13);
        doc.text("QTY (L)", col3 + 15, y + 13, { align: 'right' });
        doc.text("TYPE", col4 + 5, y + 13);
        y += 20;
        doc.setFont("Helvetica", "Normal");
      }

      doc.text(String(siNo++), col1 + 5, y + 10);
      doc.text(name, col1 + 60, y + 10);
      doc.text(String(Number(quantity || 0)), col3 + 15, y + 10, { align: 'right' });
      doc.text(type, col4 + 5, y + 10);
      doc.line(col1, y + 14, pageWidth - margin, y + 14);
      y += 14;
    };

    // Delivery Boys
    deliveryBoys.filter(d => Number(d.milkQuantity) > 0).forEach(d => {
      drawRow(`${d.name} (${d.area || 'N/A'})`, d.milkQuantity, "Delivery Milk");
    });

    // Bulk Customers
    bulkCustomers.filter(c => Number(c.totalMilk) > 0).forEach(c => {
      drawRow(`${c.name} (${c.area || 'N/A'})`, c.totalMilk, "Bulk Milk");
    });

    // Junnu
    junnuList.filter(j => Number(j.qty) > 0 && j.assignedType).forEach(j => {
      drawRow(`${j.assignedName} (${j.assignedType === "delivery" ? "Delivery" : "Bulk"})`, j.qty, "Junnu Milk");
    });

    // Totals
    y = 650;
    const boxX = 390;
    const boxWidth = 168;
    let totalY = y;

    const drawTotalRow = (label, value, isBold = false) => {
      doc.setFont("Helvetica", isBold ? "Bold" : "Normal");
      doc.text(label, boxX + 5, totalY + 13);
      doc.text(`${value} L`, boxX + boxWidth - 5, totalY + 13, { align: 'right' });
      totalY += 18;
    };

    doc.rect(boxX, y, boxWidth, 18 * 4 + 4);
    drawTotalRow("Total Delivery Milk", totalDelivery);
    drawTotalRow("Total Bulk Milk", totalBulk);
    drawTotalRow("Total Junnu Milk", totalJunnu);
    doc.setLineWidth(1);
    doc.line(boxX + 2, totalY + 2, boxX + boxWidth - 2, totalY + 2);
    totalY += 4;
    doc.setFontSize(12);
    drawTotalRow("GRAND TOTAL", grandTotal, true);

    const dataUri = doc.output("datauristring");
    return dataUri.slice(dataUri.indexOf(",") + 1);
  };

  const submit = async () => {
    setIsSubmitting(true);
    try {
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
        .map(j => ({
          date: selectedDate.toISOString().slice(0, 10),
          delivery_boy_id: j.assignedType === "delivery" ? String(j.assignedId) : null,
          company_id: j.assignedType === "bulk" ? String(j.assignedId) : null,
          company_name: j.assignedName,
          quantity: Number(j.qty),
          item_type: "JUNNU_MILK",
        }));

      const payload = [...deliveryEntries, ...bulkEntries, ...junnuEntries];

      const res = await fetch("/api/indents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Submission failed");

      const pdfBase64 = generateInvoicePdfBase64();
      const fileName = `Indent_${selectedDate.toISOString().slice(0, 10)}_${Date.now()}.pdf`;
      const folderPath = process.env.NEXT_PUBLIC_ONEDRIVE_FOLDER || "";

      const uploadResp = await fetch("/api/upload-to-onedrive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, fileContent: pdfBase64, folderPath }),
      });

      const uploadData = await uploadResp.json();

      if (!uploadResp.ok) {
        console.warn("OneDrive upload failed:", uploadData);
        await Swal.fire({ 
          icon: "warning", 
          title: "Submitted — Upload failed", 
          text: `Saved to DB but failed to upload to OneDrive.`,
          confirmButtonColor: "#f59e0b" 
        });
      } else {
        await Swal.fire({ 
          icon: "success", 
          title: "Indent Submitted & Saved", 
          text: `Saved as: ${fileName}`,
          confirmButtonColor: "#f59e0b" 
        });
      }

      onClose();
    } catch (err) {
      console.error(err);
      await Swal.fire({ 
        icon: "error", 
        title: "Submission Failed", 
        text: err.message || "Check console",
        confirmButtonColor: "#f43f5e" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header / Stepper */}
      <header className="flex items-center justify-between gap-4 p-4 bg-white border-b">
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

      {/* Body */}
      <main className="flex-1 overflow-auto p-4 space-y-4">
        {/* Step 1: Delivery Boys */}
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
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-28">
                        <div className="flex justify-end">
                          <label htmlFor={`del-qty-${b.id}`} className="text-xs text-gray-600 text-right">Qty (L)</label>
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

        {/* Step 2: Bulk Customers */}
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
                      {c.month_year && <div className="mt-1 text-xs text-gray-400">{c.month_year}</div>}
                      <div className="mt-1 text-xs text-gray-500">{c.area || "—"}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-28">
                        <div className="flex justify-end">
                          <label htmlFor={`bulk-qty-${c.id}`} className="text-xs text-gray-600 text-right">Qty (L)</label>
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

        {/* Step 3: Junnu Assignment */}
        {step === 3 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Junnu Milk Assignment</h2>
            <p className="text-sm text-gray-600">Assign Junnu milk to delivery boys or bulk customers.</p>
            <div className="space-y-3">
              {junnuList.map((row) => (
                <div key={row.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center">
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
                          <option key={`d-${b.id}`} value={`delivery:${b.id}`}>{b.name} {b.area ? `— ${b.area}` : ""}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Bulk Customers">
                        {bulkCustomers.map((c) => (
                          <option key={`b-${c.id}`} value={`bulk:${c.id}`}>{c.name} {c.area ? `— ${c.area}` : ""}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
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
                  <button type="button" onClick={() => removeJunnuRow(row.id)} className="ml-3 text-red-500 hover:text-red-700 text-lg" title="Remove entry">✕</button>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-3">
              <button type="button" onClick={addJunnuRow} className="px-3 py-2 bg-amber-100 text-amber-700 rounded-md text-sm hover:bg-amber-200">+ Add Another</button>
              <div className="text-sm text-gray-700">Total Junnu: <span className="font-semibold text-amber-700">{totalJunnu} L</span></div>
            </div>
          </section>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Review • {formatDate(selectedDate)}</h2>
            
            {/* Delivery Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
              <div className="font-medium text-gray-700">Delivery Summary</div>
              <div className="space-y-2">
                {deliveryBoys.filter(d => Number(d.milkQuantity) > 0).map((d) => (
                  <div key={d.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0" style={{ width: 40, height: 40, position: "relative" }}>
                        <Image src="/milkpacket.png" alt="Milk" layout="fill" objectFit="contain" />
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
                {bulkCustomers.filter(c => Number(c.totalMilk) > 0).map((b) => (
                  <div key={b.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0" style={{ width: 40, height: 40, position: "relative" }}>
                        <Image src="/milkcans.png" alt="Bulk" layout="fill" objectFit="contain" />
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

            {/* Junnu Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
              <div className="font-medium text-gray-700">Junnu Assignment</div>
              <div className="space-y-1">
                {junnuList.filter(j => Number(j.qty) > 0 && j.assignedName).map((j) => (
                  <div key={j.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{j.assignedName}</div>
                        <div className="text-xs text-gray-500">{j.assignedType === "delivery" ? "Delivery" : "Bulk"}</div>
                      </div>
                    </div>
                    <div className="text-amber-600 font-semibold text-right">{Number(j.qty || 0)}L</div>
                  </div>
                ))}
                <div className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-100">
                  <div className="font-medium text-gray-800">Total Junnu</div>
                  <div className="font-bold text-amber-700 text-right">{totalJunnu}L</div>
                </div>
              </div>
            </div>

            {/* Grand Total */}
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

      {/* Footer */}
      <footer className="flex justify-between p-4 bg-white border-t">
        <button onClick={prev} disabled={step === 1 || isSubmitting} className={`px-16 py-2 rounded-md font-medium transition ${step === 1 || isSubmitting ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-gray-300 text-gray-700 hover:bg-gray-400"}`}>&larr; Back</button>
        {step < 4 ? (
          <button onClick={next} className="px-19 py-2 bg-amber-500 text-white rounded-md font-medium hover:bg-amber-600 transition">Next &rarr;</button>
        ) : (
          <button onClick={submit} disabled={isSubmitting} className={`px-12 py-2 rounded-md font-medium transition ${isSubmitting ? "bg-amber-300 text-white cursor-wait" : "bg-amber-500 text-white hover:bg-amber-600"}`}>{isSubmitting ? "Submitting..." : "Submit & Save"}</button>
        )}
      </footer>
    </div>
  );
}
