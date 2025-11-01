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
    { id: 1, name: "Raj Kumar", area: "Area A", mobile: "9000000001", milkQuantity: "50", oneLiterPacks: "50", fiveHundredMLPacks: "0" },
    { id: 2, name: "Suresh Patel", area: "Area B", mobile: "9000000002", milkQuantity: "33", oneLiterPacks: "33", fiveHundredMLPacks: "0" },
  ];
  
  const fallbackBulk = [
    { id: 101, name: "Hotel Grand", area: "Market Road", totalMilk: "120", cansLiters: "120", oneLiterPacks: "0", fiveHundredMLPacks: "0" },
    { id: 102, name: "Restaurant Spice", area: "Station St", totalMilk: "85", cansLiters: "80", oneLiterPacks: "0", fiveHundredMLPacks: "0" },
  ];

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
          const mapped = rows.map((r) => {
            const qty = String(r.milk_quantity ?? r.default_quantity ?? 33);
            return {
              id: r.id ?? `d-${Date.now()}-${Math.random()}`,
              name: r.name ?? "Unnamed",
              area: r.area ?? "",
              mobile: r.mobile ?? "N/A",
              milkQuantity: qty,
              oneLiterPacks: qty,
              fiveHundredMLPacks: "0",
            };
          });
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

  useEffect(() => {
    let mounted = true;
    (async function loadBulk() {
      setLoadingBulk(true);
      try {
        const res = await fetch('/api/bulk-customers-v2');
        if (!res.ok) throw new Error(`bulk fetch failed: ${res.status}`);
        const data = await res.json();
        const rows = data?.rows ?? [];
        
        if (!Array.isArray(rows) || rows.length === 0) throw new Error("no rows");
        
        const dayIndex = new Date(selectedDate).getDay();
        const mapped = rows.map((r) => {
          const qWeek = r.default_quantity_weekdays ?? 0;
          const qSat = r.saturday ?? null;
          const qSun = r.sunday ?? null;
          
          let chosen = qWeek;
          if (dayIndex === 6 && qSat != null) chosen = qSat;
          if (dayIndex === 0 && qSun != null) chosen = qSun;
          
          return {
            id: r.company_id ?? `b-${Date.now()}-${Math.random()}`,
            name: r.company_name ?? "Unnamed",
            area: r.area ?? "",
            totalMilk: String(chosen ?? 0),
            cansLiters: String(chosen ?? 0),
            oneLiterPacks: "0",
            fiveHundredMLPacks: "0",
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

  const setDeliveryPackaging = (id, field, value) => {
    setDeliveryBoys((prev) => prev.map((d) => {
      if (String(d.id) !== String(id)) return d;
      
      const updated = { ...d, [field]: value };
      
      if (field === 'milkQuantity') {
        return updated;
      }
      
      const oneLiter = Number(updated.oneLiterPacks || 0);
      const fiveHundredML = Number(updated.fiveHundredMLPacks || 0);
      updated.milkQuantity = String(oneLiter + (fiveHundredML * 0.5));
      
      return updated;
    }));
  };

  const setBulkPackaging = (id, field, value) => {
    setBulkCustomers((prev) => prev.map((c) => {
      if (String(c.id) !== String(id)) return c;
      
      const updated = { ...c, [field]: value };
      
      if (field === 'totalMilk') {
        return updated;
      }
      
      const cans = Number(updated.cansLiters || 0);
      const oneLiter = Number(updated.oneLiterPacks || 0);
      const fiveHundredML = Number(updated.fiveHundredMLPacks || 0);
      updated.totalMilk = String(cans + oneLiter + (fiveHundredML * 0.5));
      
      return updated;
    }));
  };

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
    const pageWidth = 595;
    const pageHeight = 842;
    let y = margin;
    const lineHeight = 14;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("NutroMilk Indent Report", pageWidth / 2, y, { align: "center" });
    y += 24;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Agasthya Nutromilk", 300, y);
    doc.text("Phone: +91-8121001774", 300, y + lineHeight);
    doc.text("Email: info.anm@agasthya.co.in", 300, y + lineHeight * 2);
    y += 60;

    doc.setDrawColor(0);
    doc.rect(36, y, pageWidth - 72, 20);
    doc.setFont("helvetica", "bold");
    doc.text("INDENT FOR DELIVERY ON:", 41, y + 13);
    doc.setFont("helvetica", "normal");
    doc.text(formatDate(selectedDate), 216, y + 13);
    doc.text("Generated:", 380, y + 13);
    doc.text(new Date().toLocaleDateString('en-GB'), 445, y + 13);
    y += 30;

    doc.setFillColor(230, 230, 230);
    doc.rect(36, y, pageWidth - 72, 20, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("SI No.", 41, y + 13);
    doc.text("ITEM / ASSIGNED TO", 96, y + 13);
    doc.text("QTY (L)", 415, y + 13, { align: 'right' });
    doc.text("TYPE", 485, y + 13);
    y += 20;

    doc.setFont("helvetica", "normal");
    let siNo = 1;

    const drawRow = (name, quantity, type) => {
      if (y > pageHeight - 150) {
        doc.addPage();
        y = margin;
      }
      doc.text(String(siNo++), 41, y + 10);
      doc.text(name, 96, y + 10);
      doc.text(String(Number(quantity || 0)), 415, y + 10, { align: 'right' });
      doc.text(type, 485, y + 10);
      doc.line(36, y + 14, pageWidth - 36, y + 14);
      y += 14;
    };

    deliveryBoys.filter(d => Number(d.milkQuantity) > 0).forEach(d => {
      const packs1L = Number(d.oneLiterPacks || 0);
      const packs500ml = Number(d.fiveHundredMLPacks || 0);
      let detail = "";
      if (packs1L > 0) detail += `${packs1L}x1L`;
      if (packs500ml > 0) detail += (detail ? ", " : "") + `${packs500ml}x500ml`;
      
      drawRow(`${d.name} (${d.area || 'N/A'}) - ${detail}`, d.milkQuantity, "Delivery Milk");
    });

    bulkCustomers.filter(c => Number(c.totalMilk) > 0).forEach(c => {
      const cans = Number(c.cansLiters || 0);
      const packs1L = Number(c.oneLiterPacks || 0);
      const packs500ml = Number(c.fiveHundredMLPacks || 0);
      const numCans = Math.floor(cans / 40);
      const remainder = cans % 40;
      
      let detail = "";
      if (numCans > 0) detail += `${numCans}x40L Can`;
      if (remainder > 0) detail += (detail ? ", " : "") + `${remainder}L`;
      if (packs1L > 0) detail += (detail ? ", " : "") + `${packs1L}x1L`;
      if (packs500ml > 0) detail += (detail ? ", " : "") + `${packs500ml}x500ml`;
      
      drawRow(`${c.name} (${c.area || 'N/A'}) - ${detail}`, c.totalMilk, "Bulk Milk");
    });

    junnuList.filter(j => Number(j.qty) > 0 && j.assignedType).forEach(j => {
      drawRow(`${j.assignedName} (${j.assignedType === "delivery" ? "Delivery" : "Bulk"})`, j.qty, "Junnu Milk");
    });

    y = 650;
    const boxX = 390;
    const boxWidth = 168;
    let totalY = y;

    const drawTotalRow = (label, value, isBold = false) => {
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.text(label, boxX + 5, totalY + 13);
      doc.text(`${value} L`, boxX + boxWidth - 5, totalY + 13, { align: 'right' });
      totalY += 18;
    };

    doc.rect(boxX, y, boxWidth, 72);
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
          one_liter_packs: Number(d.oneLiterPacks || 0),
          five_hundred_ml_packs: Number(d.fiveHundredMLPacks || 0),
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
          cans_liters: Number(c.cansLiters || 0),
          one_liter_packs: Number(c.oneLiterPacks || 0),
          five_hundred_ml_packs: Number(c.fiveHundredMLPacks || 0),
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

  const handleCancel = async () => {
    const result = await Swal.fire({
      title: 'Cancel Indent?',
      text: "All changes will be lost. Are you sure?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f43f5e',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, cancel',
      cancelButtonText: 'No, go back'
    });

    if (result.isConfirmed) {
      onClose();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header / Stepper */}
      <header className="flex items-center justify-between gap-2 px-3 py-3 bg-white overflow-x-auto">
        <button 
          onClick={handleCancel}
          className="text-gray-500 hover:text-gray-700 flex-shrink-0 text-lg"
          title="Cancel"
        >
          ✕
        </button>
        <div className="flex items-center gap-2 flex-1 justify-center">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${step >= 1 ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-600"}`}>1</div>
            <div className={`text-xs font-medium whitespace-nowrap ${step >= 1 ? "text-amber-600" : "text-gray-500"}`}>Delivery</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${step >= 2 ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-600"}`}>2</div>
            <div className={`text-xs font-medium whitespace-nowrap ${step >= 2 ? "text-amber-600" : "text-gray-500"}`}>Bulk</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${step >= 3 ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-600"}`}>3</div>
            <div className={`text-xs font-medium whitespace-nowrap ${step >= 3 ? "text-amber-600" : "text-gray-500"}`}>Junnu</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${step >= 4 ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-600"}`}>4</div>
            <div className={`text-xs font-medium whitespace-nowrap ${step >= 4 ? "text-amber-600" : "text-gray-500"}`}>Review</div>
          </div>
        </div>
        <div className="w-6 flex-shrink-0"></div>
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
                {deliveryBoys.map((b) => {
                  const oneLiter = Number(b.oneLiterPacks || 0);
                  const fiveHundredML = Number(b.fiveHundredMLPacks || 0);
                  const calculatedTotal = oneLiter + (fiveHundredML * 0.5);
                  const actualTotal = Number(b.milkQuantity || 0);
                  const packsMatch = Math.abs(calculatedTotal - actualTotal) < 0.01;
                  
                  return (
                    <div key={b.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 relative" style={{ width: 80, height: 80 }}>
                          <Image src="/milkpacket.png" alt="Milk Packet" layout="fill" objectFit="contain" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-800 truncate">{b.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{b.area || "—"}</div>
                          <div className="text-xs text-gray-400 mt-0.5">Mobile: {b.mobile}</div>
                          
                          <div className="grid grid-cols-3 gap-2 mt-3">
                            <div className="col-span-3">
                              <label className="block text-xs text-gray-600 mb-1">Total Qty (L)</label>
                              <input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.5"
                                value={b.milkQuantity === "0" ? "" : b.milkQuantity ?? ""}
                                placeholder="0"
                                onChange={(e) => setDeliveryPackaging(b.id, 'milkQuantity', e.target.value)}
                                className="w-full text-sm rounded border border-gray-300 px-2 py-1.5 text-center bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">1L Packs</label>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                value={b.oneLiterPacks === "0" ? "" : b.oneLiterPacks ?? ""}
                                placeholder="0"
                                onChange={(e) => setDeliveryPackaging(b.id, 'oneLiterPacks', e.target.value)}
                                className="w-full text-sm rounded border border-gray-300 px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-600 mb-1">500ml Packs</label>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                value={b.fiveHundredMLPacks === "0" ? "" : b.fiveHundredMLPacks ?? ""}
                                placeholder="0"
                                onChange={(e) => setDeliveryPackaging(b.id, 'fiveHundredMLPacks', e.target.value)}
                                className="w-full text-sm rounded border border-gray-300 px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                              />
                            </div>
                          </div>
                          
                          <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${packsMatch ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            <span>{packsMatch ? '✓' : '✗'}</span>
                            <span>{packsMatch ? 'Packs Match' : 'Packs Mismatch'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                {bulkCustomers.map((c) => {
                  const cansL = Number(c.cansLiters || 0);
                  const packs1L = Number(c.oneLiterPacks || 0);
                  const packs500ml = Number(c.fiveHundredMLPacks || 0);
                  const calculatedTotal = cansL + packs1L + (packs500ml * 0.5);
                  const actualTotal = Number(c.totalMilk || 0);
                  const packsMatch = Math.abs(calculatedTotal - actualTotal) < 0.01;
                  
                  return (
                    <div key={c.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 relative" style={{ width: 80, height: 80 }}>
                          <Image src="/milkcans.png" alt="Milk Cans" layout="fill" objectFit="contain" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-800 truncate">{c.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{c.area || "—"}</div>
                          
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-600 mb-1">Total Qty (L)</label>
                              <input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.5"
                                value={c.totalMilk === "0" ? "" : c.totalMilk ?? ""}
                                placeholder="0"
                                onChange={(e) => setBulkPackaging(c.id, 'totalMilk', e.target.value)}
                                className="w-full text-sm rounded border border-gray-300 px-2 py-1.5 text-center bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Cans (L)</label>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                step="40"
                                value={c.cansLiters === "0" ? "" : c.cansLiters ?? ""}
                                placeholder="0"
                                onChange={(e) => setBulkPackaging(c.id, 'cansLiters', e.target.value)}
                                className="w-full text-sm rounded border border-gray-300 px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">1L Packs</label>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                value={c.oneLiterPacks === "0" ? "" : c.oneLiterPacks ?? ""}
                                placeholder="0"
                                onChange={(e) => setBulkPackaging(c.id, 'oneLiterPacks', e.target.value)}
                                className="w-full text-sm rounded border border-gray-300 px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-xs text-gray-600 mb-1">500ml Packs</label>
                              <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                value={c.fiveHundredMLPacks === "0" ? "" : c.fiveHundredMLPacks ?? ""}
                                placeholder="0"
                                onChange={(e) => setBulkPackaging(c.id, 'fiveHundredMLPacks', e.target.value)}
                                className="w-full text-sm rounded border border-gray-300 px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                              />
                            </div>
                          </div>
                          
                          <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${packsMatch ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            <span>{packsMatch ? '✓' : '✗'}</span>
                            <span>{packsMatch ? 'Packs Match' : 'Packs Mismatch'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Step 3: Junnu */}
        {step === 3 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Junnu Assignment</h2>
            <p className="text-sm text-gray-600">Assign Junnu milk to delivery boys or bulk customers.</p>
            <div className="space-y-3">
              {junnuList.map((row) => (
                <div key={row.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
                  <div className="flex-shrink-0 relative" style={{ width: 60, height: 60 }}>
                    <Image src="/junnu.png" alt="Junnu" layout="fill" objectFit="contain" />
                  </div>
                  <div className="flex-1 min-w-0">
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
                      className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="">Select Customer</option>
                      <optgroup label="Delivery Boys">
                        {deliveryBoys.map((b) => (
                          <option key={`d-${b.id}`} value={`delivery:${b.id}`}>{b.name} — {b.area}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Bulk Customers">
                        {bulkCustomers.map((c) => (
                          <option key={`b-${c.id}`} value={`bulk:${c.id}`}>{c.name} — {c.area}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <div className="w-20">
                    <label className="block text-xs text-gray-600 mb-1 text-right">Qty (L)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      placeholder="0"
                      value={row.qty === "0" ? "" : row.qty ?? ""}
                      onChange={(e) => updateJunnuQty(row.id, e.target.value)}
                      className="w-full text-sm rounded border border-gray-300 px-2 py-1.5 text-center focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <button type="button" onClick={() => removeJunnuRow(row.id)} className="flex-shrink-0 text-red-500 hover:text-red-700 text-lg" title="Remove">✕</button>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center">
              <button type="button" onClick={addJunnuRow} className="px-3 py-2 bg-amber-100 text-amber-700 rounded text-sm hover:bg-amber-200">+ Add Another</button>
              <div className="text-sm text-gray-700">Total Junnu: <span className="font-semibold text-amber-700">{totalJunnu} L</span></div>
            </div>
          </section>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Delivery Summary</h2>
            
            {/* Delivery Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
              <div className="font-medium text-gray-700">Delivery Summary</div>
              <div className="space-y-2">
                {deliveryBoys.filter(d => Number(d.milkQuantity) > 0).map((d) => {
                  const packs1L = Number(d.oneLiterPacks || 0);
                  const packs500ml = Number(d.fiveHundredMLPacks || 0);
                  
                  return (
                    <div key={d.id} className="border-b border-gray-100 last:border-0 pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex-shrink-0 relative" style={{ width: 32, height: 40 }}>
                            <Image src="/milkpacket.png" alt="Milk" layout="fill" objectFit="contain" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">{d.name}</div>
                            <div className="text-xs text-gray-500">{d.area}</div>
                          </div>
                        </div>
                        <div className="text-amber-600 font-semibold text-right ml-2">{Number(d.milkQuantity || 0)}L</div>
                      </div>
                      {/* Packaging Breakdown */}
                      {(packs1L > 0 || packs500ml > 0) && (
                        <div className="mt-2 ml-11 bg-gray-50 rounded p-2 text-xs text-gray-600">
                          {packs1L > 0 && (
                            <div className="flex items-center justify-between">
                              <span>📦 1L Packets</span>
                              <span className="font-medium">{packs1L} pcs</span>
                            </div>
                          )}
                          {packs500ml > 0 && (
                            <div className="flex items-center justify-between mt-1">
                              <span>📦 500ml Packets</span>
                              <span className="font-medium">{packs500ml} pcs</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="flex items-center justify-between p-2 bg-amber-50 rounded mt-2">
                  <div className="font-medium text-gray-800">Total Delivery Milk</div>
                  <div className="font-bold text-amber-700">{totalDelivery}L</div>
                </div>
              </div>
            </div>

            {/* Bulk Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
              <div className="font-medium text-gray-700">Bulk Summary</div>
              <div className="space-y-2">
                {bulkCustomers.filter(c => Number(c.totalMilk) > 0).map((b) => {
                  const cansL = Number(b.cansLiters || 0);
                  const packs1L = Number(b.oneLiterPacks || 0);
                  const packs500ml = Number(b.fiveHundredMLPacks || 0);
                  
                  const fullCans = Math.floor(cansL / 40);
                  const partialCan = cansL % 40;
                  
                  return (
                    <div key={b.id} className="border-b border-gray-100 last:border-0 pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex-shrink-0 relative" style={{ width: 32, height: 40 }}>
                            <Image src="/milkcans.png" alt="Bulk" layout="fill" objectFit="contain" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">{b.name}</div>
                            <div className="text-xs text-gray-500">{b.area}</div>
                          </div>
                        </div>
                        <div className="text-amber-600 font-semibold text-right ml-2">{Number(b.totalMilk || 0)}L</div>
                      </div>
                      
                      {/* Packaging Breakdown */}
                      {(fullCans > 0 || partialCan > 0 || packs1L > 0 || packs500ml > 0) && (
                        <div className="mt-2 ml-11 bg-gray-50 rounded p-2 text-xs text-gray-600 space-y-1">
                          {fullCans > 0 && (
                            <div className="flex items-center justify-between">
                              <span>🥫 40L Cans</span>
                              <span className="font-medium">{fullCans} can{fullCans > 1 ? 's' : ''}</span>
                            </div>
                          )}
                          {partialCan > 0 && (
                            <div className="flex items-center justify-between">
                              <span>🥫 Partial Can</span>
                              <span className="font-medium">{partialCan}L</span>
                            </div>
                          )}
                          {packs1L > 0 && (
                            <div className="flex items-center justify-between">
                              <span>📦 1L Packets</span>
                              <span className="font-medium">{packs1L} pcs</span>
                            </div>
                          )}
                          {packs500ml > 0 && (
                            <div className="flex items-center justify-between">
                              <span>📦 500ml Packets</span>
                              <span className="font-medium">{packs500ml} pcs</span>
                            </div>
                          )}
                          {(cansL > 0 || packs1L > 0 || packs500ml > 0) && (
                            <div className="pt-1 border-gray-200 mt-1 text-xs font-medium text-gray-700">
                              Total: {cansL}L (cans) + {packs1L}×1L + {packs500ml}×500ml
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="flex items-center justify-between p-2 bg-amber-50 rounded mt-2">
                  <div className="font-medium text-gray-800">Total Bulk Milk</div>
                  <div className="font-bold text-amber-700">{totalBulk}L</div>
                </div>
              </div>
            </div>

            {/* Junnu Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
              <div className="font-medium text-gray-700">Junnu Assignment</div>
              <div className="space-y-1">
                {junnuList.filter(j => Number(j.qty) > 0 && j.assignedName).map((j) => (
                  <div key={j.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex-shrink-0 relative" style={{ width: 24, height: 32 }}>
                        <Image src="/junnu.png" alt="Junnu" layout="fill" objectFit="contain" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">{j.assignedName}</div>
                        <div className="text-xs text-gray-500">{j.assignedType === "delivery" ? "Delivery" : "Bulk"}</div>
                      </div>
                    </div>
                    <div className="text-amber-600 font-semibold text-right ml-2">{Number(j.qty || 0)}L</div>
                  </div>
                ))}
                <div className="flex items-center justify-between p-2 bg-amber-50 rounded mt-2">
                  <div className="font-medium text-gray-800">Total Junnu</div>
                  <div className="font-bold text-amber-700">{totalJunnu}L</div>
                </div>
              </div>
            </div>

            {/* Grand Total */}
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-gray-800">Grand Total</div>
                <div className="text-lg font-bold text-green-700">{grandTotal}L</div>
              </div>
              <div className="text-xs text-gray-500 mt-1">For delivery on {formatDate(selectedDate)}</div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="flex p-4 bg-white gap-1">
        <button 
          onClick={prev} 
          disabled={step === 1 || isSubmitting} 
          className={`w-1/2 py-3 rounded-lg font-semibold transition text-base ${step === 1 || isSubmitting ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-gray-300 text-gray-700 hover:bg-gray-400"}`}
        >
          ← Back
        </button>
        {step < 4 ? (
          <button 
            onClick={next} 
            className="w-1/2 py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition text-base"
          >
            Next →
          </button>
        ) : (
          <button 
            onClick={submit} 
            disabled={isSubmitting} 
            className={`w-1/2 py-3 rounded-lg font-semibold transition text-base ${isSubmitting ? "bg-amber-300 text-white cursor-wait" : "bg-amber-500 text-white hover:bg-amber-600"}`}
          >
            {isSubmitting ? "Submitting..." : "Submit & Save"}
          </button>
        )}
      </footer>
    </div>
  );
}
