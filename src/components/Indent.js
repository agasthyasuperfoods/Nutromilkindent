// src/components/Indent.js
import React, { useEffect, useState } from "react";
import Image from "next/image";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import jsPDF from "jspdf";

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

  /* ---------------- fetch bulk customers ---------------- */
  useEffect(() => {
    let mounted = true;
    (async function loadBulk() {
      setLoadingBulk(true);
      try {
        const d = new Date(selectedDate);
        const dateParam = d.toISOString().slice(0, 10);
        const res = await fetch(`/api/bulk-customers?date=${encodeURIComponent(dateParam)}`);
        if (!res.ok) throw new Error(`bulk fetch failed: ${res.status}`);
        const data = await res.json();
        const rows = Array.isArray(data) ? data : data?.rows ?? data?.data ?? [];
        if (!Array.isArray(rows) || rows.length === 0) throw new Error("no rows");

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
      assignedName = found ? c.name : "";
    }
    setJunnuList((p) => p.map((r) => (r.id === rowId ? { ...r, assignedType, assignedId, assignedName } : r)));
  };

  const updateJunnuQty = (rowId, qty) => {
    const sanitized = qty === "" ? "" : String(qty);
    setJunnuList((p) => p.map((r) => (r.id === rowId ? { ...r, qty: sanitized } : r)));
  };

  /* ---------------- totals ---------------- */
  const totalDelivery = deliveryBoys.reduce((s, b) => s + Number(b.milkQuantity || 0), 0);
  const totalBulk = bulkCustomers.reduce((s, c) => s + Number(c.totalMilk || 0), 0);
  const totalJunnu = junnuList.reduce((s, j) => s + Number(j.qty || 0), 0);
  const grandTotal = totalDelivery + totalBulk + totalJunnu;

  /* ---------------- navigation & helpers ---------------- */
  const next = () => setStep((s) => Math.min(4, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));
  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });


  /* ---------------- NEW PDF Invoice Generator (client-side) ----------------
     Generates a structured PDF resembling an invoice/bill, using review screen data.
     Returns: base64 string (no data: prefix)
  */
 const generateInvoicePdfBase64 = () => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 36;
  const col1 = 36; // SI No.
  const col2 = 300; // Item Name
  const col3 = 400; // QTY (L)
  const col4 = 480; // Type
  const pageWidth = 595;
  const pageHeight = 842;
  let y = margin;
  const lineHeight = 14;

  // --- HEADER & LOGO ---
  doc.setFont("Helvetica", "Bold");
  doc.setFontSize(20);
  doc.text("NutroMilk Indent Report", pageWidth / 2, y, { align: "center" });
  y += 24;

  // Company Logo
  try {
    doc.addImage("/logo.png", "PNG", col1, y - 5, 50, 50);
  } catch (e) {
    console.warn("Logo not found, using text fallback:", e);
    doc.setDrawColor(200);
    doc.rect(col1, y - 5, 50, 50);
    doc.setFontSize(10);
    doc.text("Agasthya Nutromilk", col1 + 25, y + 20, { align: 'center' });
    doc.text("LOGO", col1 + 25, y + 32, { align: 'center' });
  }

  // Company Details
  doc.setFontSize(10);
  doc.setFont("Helvetica", "Normal");
  doc.text("Agasthya Nutromilk", col2, y);
  doc.text("Phone: +91-8121001774", col2, y + lineHeight);
  doc.text("Email: info.anm@agasthya.co.in", col2, y + lineHeight * 2);
  y += 60;

  // Indent Date Box
  doc.setDrawColor(0);
  doc.rect(col1, y, pageWidth - 2 * margin, 20);
  doc.setFont("Helvetica", "Bold");
  doc.text("INDENT FOR DELIVERY ON:", col1 + 5, y + 13);
  doc.setFont("Helvetica", "Normal");
  doc.text(formatDate(selectedDate), col1 + 180, y + 13);
  doc.text("Generated:", col4 - 100, y + 13);
  doc.text(new Date().toLocaleDateString('en-GB'), col4 - 35, y + 13);
  y += 30;

  // --- ITEMS TABLE HEADER ---
  doc.setFillColor(230, 230, 230);
  doc.rect(col1, y, pageWidth - 2 * margin, 20, 'F');
  doc.setFontSize(10);
  doc.setFont("Helvetica", "Bold");
  doc.text("SI No.", col1 + 5, y + 13);
  doc.text("ITEM / ASSIGNED TO", col1 + 60, y + 13);
  doc.text("QTY (L)", col3 + 15, y + 13, { align: 'right' });
  doc.text("TYPE", col4 + 5, y + 13);
  y += 20;

  // --- ITEMS TABLE BODY ---
  doc.setFont("Helvetica", "Normal");
  doc.setFontSize(10);
  let siNo = 1;

  const drawRow = (name, quantity, type) => {
    if (y > pageHeight - margin - 150) {
      doc.addPage();
      y = margin;
      // Redraw table header on new page
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

  // 1. Delivery Milk (Regular)
  deliveryBoys.filter(d => Number(d.milkQuantity) > 0).forEach(d => {
    drawRow(`${d.name} (${d.area || 'N/A'})`, d.milkQuantity, "Delivery Milk");
  });

  // 2. Bulk Milk (Regular)
  bulkCustomers.filter(c => Number(c.totalMilk) > 0).forEach(c => {
    drawRow(`${c.name} (${c.area || 'N/A'})`, c.totalMilk, "Bulk Milk");
  });

  // 3. Junnu Milk
  junnuList.filter(j => Number(j.qty) > 0 && j.assignedType).forEach(j => {
    drawRow(`${j.assignedName} (${j.assignedType === "delivery" ? "Delivery" : "Bulk"})`, j.qty, "Junnu Milk");
  });

  // Draw solid lines to fill up to totals box area
  while (y < 650) {
    doc.line(col1, y, pageWidth - margin, y);
    y += 14;
  }
  y = 650;

  // --- TOTALS BOX ---
  const boxX = 390;
  const boxWidth = 168;
  let totalY = y;

  const drawTotalRow = (label, value, isBold = false) => {
    doc.setFontSize(10);
    doc.setFont("Helvetica", isBold ? "Bold" : "Normal");
    doc.text(label, boxX + 5, totalY + 13);
    doc.text(`${value} L`, boxX + boxWidth - 5, totalY + 13, { align: 'right' });
    totalY += 18;
  };

  doc.setDrawColor(0);
  doc.rect(boxX, y, boxWidth, 18 * 4 + 4);

  drawTotalRow("Total Delivery Milk", totalDelivery);
  drawTotalRow("Total Bulk Milk", totalBulk);
  drawTotalRow("Total Junnu Milk", totalJunnu);

  // Grand Total Line
  doc.setLineWidth(1);
  doc.line(boxX + 2, totalY + 2, boxX + boxWidth - 2, totalY + 2);
  totalY += 4;
  doc.setFontSize(12);
  drawTotalRow("GRAND TOTAL", grandTotal, true);

  // --- FOOTER ---
  const footerY = pageHeight - margin;
  doc.setFontSize(8);
  doc.setFont("Helvetica", "Oblique");
  doc.text("Terms & Conditions: Items are non-returnable. This is a system-generated indent report.", col1, footerY);

  // return base64 without data: prefix
  const dataUri = doc.output("datauristring");
  const commaIndex = dataUri.indexOf(",");
  return dataUri.slice(commaIndex + 1);
};
  /* ---------------- Original generatePdfBase64 (optional, for local review) ---------------- */
  // You can keep this function if you want a simpler local PDF preview,
  // but it's not used in the submission logic below.
  const generatePdfBase64 = () => { /* ... existing simple PDF logic ... */
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    const pageHeight = 792; 
    let y = margin;

    doc.setFontSize(16);
    doc.text(`Indent • ${formatDate(selectedDate)}`, margin, y);
    y += 22;

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    y += 24; 

    const sections = [
      {
        title: "Delivery Summary",
        items: deliveryBoys,
        qtyKey: "milkQuantity",
        total: totalDelivery,
        totalLabel: "Total Delivery Milk",
      },
      {
        title: "Bulk Summary",
        items: bulkCustomers,
        qtyKey: "totalMilk",
        total: totalBulk,
        totalLabel: "Total Bulk Milk",
      },
      {
        title: "Junnu Assignment",
        items: junnuList
          .filter((j) => j.assignedType && j.assignedName && Number(j.qty) > 0)
          .map((j) => ({
            name: `${j.assignedName} (${j.assignedType === "delivery" ? "Delivery" : "Bulk"})`,
            qty: j.qty,
          })),
        qtyKey: "qty",
        total: totalJunnu,
        totalLabel: "Total Junnu Milk",
      },
    ];

    const drawSection = (title, items, qtyKey, totalLabel, total) => {
      if (y > pageHeight - margin - 40) {
        doc.addPage();
        y = margin;
      }

      doc.setFontSize(13);
      doc.setFont("Helvetica", "Bold");
      doc.text(title, margin, y);
      doc.setFont("Helvetica", "Normal");
      y += 16;
      doc.setFontSize(11);

      if (items.length === 0) {
        doc.text("— No entries —", margin + 8, y);
        y += 18;
      } else {
        items.forEach((item) => {
          const itemName = item.name + (qtyKey !== "qty" && item.area ? ` (${item.area})` : "");
          doc.text(`${itemName} — ${Number(item[qtyKey] || 0)} L`, margin + 8, y);
          y += 14;
          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
            doc.setFontSize(11);
          }
        });

        y += 6;
        doc.setFontSize(11);
        doc.setFont("Helvetica", "Bold");
        doc.text(`${totalLabel}: ${total} L`, margin + 8, y);
        doc.setFont("Helvetica", "Normal");
        y += 22;
      }
    };

    sections.forEach((s) => drawSection(s.title, s.items, s.qtyKey, s.totalLabel, s.total));

    y += 10;
    doc.setFontSize(14);
    doc.setFont("Helvetica", "Bold");
    doc.text(`Grand Total: ${grandTotal} L`, margin, y);
    doc.setFont("Helvetica", "Normal");
    y += 16;
    doc.setFontSize(10);
    doc.text(`For delivery on ${formatDate(selectedDate)}`, margin, y);

    const dataUri = doc.output("datauristring");
    const commaIndex = dataUri.indexOf(",");
    return dataUri.slice(commaIndex + 1);
  };


  /* ---------------- submission handler ---------------- */
  const submit = async () => {
    setIsSubmitting(true);

    try {
      // 1) Build payload for your existing /api/indents
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

      // 2) Send to your existing API
      const res = await fetch("/api/indents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Submission failed");

      // 3) Generate PDF (base64) using the new invoice format
      const pdfBase64 = generateInvoicePdfBase64(); 

      // 4) Upload to OneDrive
      const fileName = `Indent_Invoice_${selectedDate.toISOString().slice(0, 10)}_${Date.now()}.pdf`;
      const folderPath = process.env.NEXT_PUBLIC_ONEDRIVE_FOLDER || "";

      const uploadResp = await fetch("/api/upload-to-onedrive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, fileContent: pdfBase64, folderPath }),
      });

      const uploadData = await uploadResp.json();

      if (!uploadResp.ok) {
        console.warn("OneDrive upload failed:", uploadData);
        await Swal.fire({ icon: "warning", title: "Submitted — Upload failed", html: `Saved to DB but failed to upload to OneDrive.<br/>${uploadData.error || ""}`, confirmButtonColor: "#f59e0b" });
      } else {
        await Swal.fire({ icon: "success", title: "Indent Submitted & Saved", html: `Saved as: ${fileName}`, confirmButtonColor: "#f59e0b" });
      }

      onClose();
    } catch(err) {
      console.error(err);
      await Swal.fire({ icon: "error", title: "Submission Failed", text: err.message || "Check console", confirmButtonColor: "#f43f5e" });
    } finally {
      setIsSubmitting(false);
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

        {step === 3 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Junnu Milk Assignment</h2>
            <p className="text-sm text-gray-600">Assign Junnu milk to delivery boys or bulk customers. Each record represents a Junnu dispatch.</p>

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
              <button type="button" onClick={addJunnuRow} className="px-3 py-2 bg-amber-100 text-amber-700 rounded-md text-sm hover:bg-amber-200">
                + Add Another
              </button>
              <div className="text-sm text-gray-700">
                Total Junnu: <span className="font-semibold text-amber-700">{totalJunnu} L</span>
              </div>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Review • {formatDate(selectedDate)}</h2>

            {/* Summaries - unchanged */}
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

      {/* footer / navigation - BIG BUTTONS */}
<footer className="flex justify-between p-4 bg-white">
  <button
    onClick={prev}
    disabled={step === 1 || isSubmitting}
    className={`px-16 py-2 rounded-md font-medium transition ${
      step === 1 || isSubmitting
        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
        : "bg-gray-300 text-gray-700 hover:bg-gray-400"
    }`}
  >
    &larr; Back
  </button>

  {step < 4 ? (
    <button
      onClick={next}
      className="px-12 py-2 bg-amber-500 text-white rounded-md font-medium hover:bg-amber-600 transition"
    >
      Next &rarr;
    </button>
  ) : (
    <button
      onClick={submit}
      disabled={isSubmitting}
      className={`px-12 py-2 rounded-md font-medium transition ${
        isSubmitting
          ? "bg-amber-300 text-white cursor-wait"
          : "bg-amber-500 text-white hover:bg-amber-600"
      }`}
    >
      {isSubmitting ? "Submitting..." : "Submit & Save"}
    </button>
  )}
</footer>
    </div>
  );
}