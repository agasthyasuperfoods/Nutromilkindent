// pages/api/generate-and-download-indent.js

import { Readable } from 'stream';
import PDFDocument from 'pdfkit';
import { query } from '../../lib/db'; 
import * as path from 'path';
import * as fs from 'fs';

// CRITICAL: Disable Next.js body parser for direct response streaming
export const config = {
  api: {
    bodyParser: false, 
  },
};

// --- PDF GENERATION LOGIC ---

function generatePdfStream(indentData, date) {
    // Reduced margins to gain space
    const doc = new PDFDocument({ margin: 30 }); 
    const stream = new Readable().wrap(doc);
    
    // --- STYLES AND CONSTANTS ---
    const primaryColor = '#1f2937'; // Text
    const accentColor = '#f59e0b'; // Amber
    const borderColor = '#e5e7eb'; // Lines
    const startMargin = 30;
    const endMargin = 565; // 612 (A4 width) - 30 (margin) - 17 (scroll)
    const tableWidth = 535; // 565 - 30
    const rowHeight = 18; // Reduced row height
    
    // --- DATE & PATH SETUP ---
    const deliveryDateObj = new Date(date);
    const displayDate = deliveryDateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    
    // --- 1. HEADER SECTION (COMPACT) ---
    
    const startY = 30;
    let currentY = startY;

    // Logo
    if (fs.existsSync(logoPath)) {
        doc.image(logoPath, startMargin, currentY, { width: 40 }); // Smaller logo
    }

    // Company Name, Contact, Email (Inline)
    doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('Agasthya Nutromilk', 80, currentY + 5); 
    doc.fontSize(8).fillColor('#4b5563').font('Helvetica');
    doc.text('Phone: +91-8121001774 | Email: info.anm@agasthya.co.in', 80, currentY + 22);

    // Main Title and Date (Right Aligned)
    doc.fontSize(16).fillColor(primaryColor).font('Helvetica-Bold')
       .text('NutroMilk Indent Report', endMargin - 200, currentY, { width: 200, align: 'right' });
    
    doc.fontSize(10).fillColor(accentColor).font('Helvetica-Bold')
       .text(`INDENT FOR DELIVERY ON: ${displayDate}`, endMargin - 250, currentY + 20, { width: 250, align: 'right' });
    doc.font('Helvetica');
    
    currentY += 50;
    doc.moveDown(0.5);
    
    // --- DRAW TABLE HELPERS (Modified for size) ---

    const drawHeader = (doc, startY, title, columns) => {
        doc.fontSize(12).fillColor(primaryColor).font('Helvetica-Bold').text(title, startMargin, startY).moveDown(0.2);
        
        let y = doc.y;
        
        // Draw Header background and text
        doc.fillColor('#fef3c7').rect(startMargin, y, tableWidth, rowHeight).fill(); 
        doc.fillColor(primaryColor).fontSize(9); // Smaller font
        
        let x = startMargin;
        columns.forEach(col => {
            doc.text(col.label, x + col.padding, y + 5, { width: col.width - col.padding, align: col.align });
            x += col.width;
        });
        
        doc.moveDown(0.2);
        return doc.y;
    };

    const drawRow = (doc, y, columns, data, isOdd) => {
        const bgColor = isOdd ? '#ffffff' : '#f9fafb';
        doc.fillColor(bgColor).rect(startMargin, y, tableWidth, rowHeight).fill();
        doc.fillColor(primaryColor).fontSize(9); // Smaller font
        
        // Draw horizontal line separator
        doc.lineCap('butt').lineWidth(0.5).strokeColor(borderColor).moveTo(startMargin, y).lineTo(endMargin, y).stroke();

        let x = startMargin;
        columns.forEach(col => {
            doc.text(data[col.key] || '', x + col.padding, y + 5, { width: col.width - col.padding, align: col.align });
            x += col.width;
        });
        return y + rowHeight;
    };
    
    currentY = doc.y;
    
    // Define shared column structure
    const indentCols = [
        { label: 'DELIVERY PERSONNEL / AREA', key: 'nameArea', width: 320, align: 'left', padding: 5 },
        { label: 'QUANTITY (L)', key: 'milkQuantity', width: 215, align: 'right', padding: 5 }, 
    ];

    // --- 2. DELIVERY BOYS INDENT TABLE ---
    
    currentY = drawHeader(doc, currentY, 'DELIVERY BOY INDENT', indentCols);
    let tableY = currentY;

    indentData.deliveryBoys.forEach((boy, index) => {
        const quantityValue = (Number.parseFloat(boy.milkQuantity) || 0).toFixed(0);
        const rowData = {
            nameArea: `${boy.name} (${boy.area})`,
            milkQuantity: `${quantityValue} L`,
        };
        tableY = drawRow(doc, tableY, indentCols, rowData, index % 2 !== 0);
    });
    
    doc.lineCap('butt').lineWidth(1).strokeColor(borderColor).moveTo(startMargin, tableY).lineTo(endMargin, tableY).stroke();

    doc.moveDown(1); // Reduced vertical spacing


    // --- 3. BULK CUSTOMERS INDENT TABLE ---
    
    const bulkCols = [
        { label: 'CUSTOMER NAME / LOCATION', key: 'nameArea', width: 320, align: 'left', padding: 5 },
        { label: 'QUANTITY (L)', key: 'totalMilk', width: 215, align: 'right', padding: 5 },
    ];

    currentY = doc.y;
    currentY = drawHeader(doc, currentY, 'BULK CUSTOMER INDENT', bulkCols);
    tableY = currentY;

    indentData.bulkCustomers.forEach((customer, index) => {
        const quantityValue = (Number.parseFloat(customer.totalMilk) || 0).toFixed(0);
        const rowData = {
            nameArea: `${customer.name} (${customer.area})`,
            totalMilk: `${quantityValue} L`,
        };
        tableY = drawRow(doc, tableY, bulkCols, rowData, index % 2 !== 0);
    });

    doc.lineCap('butt').lineWidth(1).strokeColor(borderColor).moveTo(startMargin, tableY).lineTo(endMargin, tableY).stroke();

    doc.moveDown(1.5); // Reduced vertical spacing

    
    // --- 4. TOTALS SECTION (Right Aligned) ---

    const totalDeliveryMilk = indentData.deliveryBoys.reduce((sum, b) => sum + (Number.parseFloat(b.milkQuantity) || 0), 0);
    const totalBulkMilk = indentData.bulkCustomers.reduce((sum, c) => sum + (Number.parseFloat(c.totalMilk) || 0), 0);
    const grandTotal = totalDeliveryMilk + totalBulkMilk;

    const totalsW = 180; // Reduced totals box width
    const totalsX = endMargin - totalsW; 
    
    const drawTotalRow = (label, value, isGrand = false) => {
        const font = isGrand ? 'Helvetica-Bold' : 'Helvetica';
        const color = primaryColor;
        const size = isGrand ? 11 : 9; // Reduced font size
        
        doc.fillColor(color).fontSize(size).font(font);
        
        doc.text(label, totalsX, doc.y + 3, { width: 110, align: 'left' }); // Reduced vertical padding
        doc.text(value, totalsX + 110, doc.y + 3, { width: 70, align: 'right' });
        doc.moveDown(isGrand ? 0.6 : 0.1); 
    };
    
    // Summary Labels
    doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('INDENT SUMMARY', totalsX, doc.y, { align: 'right' });
    doc.moveDown(0.3);

    drawTotalRow('Total Delivery Milk', `${totalDeliveryMilk.toFixed(0)} L`);
    drawTotalRow('Total Bulk Milk', `${totalBulkMilk.toFixed(0)} L`);
    drawTotalRow('Total Junnu Milk', '0 L'); 
    
    // Separator line before Grand Total
    doc.lineCap('butt').lineWidth(1).strokeColor(primaryColor).moveTo(totalsX, doc.y).lineTo(endMargin, doc.y).stroke();
    doc.moveDown(0.1);

    drawTotalRow('GRAND TOTAL', `${grandTotal.toFixed(0)} L`, true);
    
    // Separator line after Grand Total
    doc.lineCap('butt').lineWidth(1).strokeColor(primaryColor).moveTo(totalsX, doc.y).lineTo(endMargin, doc.y).stroke();

    doc.moveDown(1.5); // Space before footer


    // --- 5. FOOTER / TERMS ---
    
    doc.fontSize(7).fillColor('#6b7280'); // Smallest font size
    doc.text('Terms & Conditions: Items are non-returnable. This is a system-generated indent report.', startMargin, doc.y);

    // --- END DOCUMENT ---
    doc.end();
    return stream;
}

// --- API ROUTE HANDLER (DATABASE LOGIC UNMODIFIED) ---

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'Date parameter is required' });
  }

  const fileName = `Indent_Invoice_${date}.pdf`;

  try {
    // 1. FETCH DATA FROM DATABASE
    
    // A. Fetch Delivery Boys 
    const deliveryBoysQuery = `
      SELECT 
        db.delivery_boy_name as name, 
        db.delivery_area as area, 
        COALESCE(i.quantity, 0) as "milkQuantity"
      FROM delivery_boys db
      LEFT JOIN indents i ON db.employee_id = i.delivery_boy_id 
        AND i.indent_date = $1
        AND i.item_type = 'REGULAR_MILK' 
      ORDER BY db.delivery_boy_name;
    `;
    const deliveryBoysRes = await query(deliveryBoysQuery, [date]);
    const deliveryBoys = deliveryBoysRes.rows.map(r => ({ 
        ...r, 
        milkQuantity: String(Number.parseFloat(r.milkQuantity) || 0) 
    })); 

    // B. Fetch Bulk Customers 
    const bulkCustomersQuery = `
      SELECT 
        c.company_name as name, 
        c.area, 
        i.quantity as "totalMilk"
      FROM bulk_customers c
      JOIN indents i ON c.company_id = i.company_id 
      WHERE i.indent_date = $1
      ORDER BY c.company_name;
    `;
    const bulkCustomersRes = await query(bulkCustomersQuery, [date]);
    const bulkCustomers = bulkCustomersRes.rows.map(r => ({ 
        ...r, 
        totalMilk: String(Number.parseFloat(r.totalMilk) || 0) 
    })); 


    if (deliveryBoys.length === 0 && bulkCustomers.length === 0) {
        return res.status(404).json({ error: `No indent data found for ${date}.` });
    }
    
    const indentData = { deliveryBoys, bulkCustomers };

    // 2. GENERATE PDF STREAM
    const pdfStream = generatePdfStream(indentData, date);

    // 3. SET HEADERS AND STREAM TO CLIENT
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    pdfStream.pipe(res);

  } catch (error) {
    console.error('PDF Generation/Download error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: `Download failed: ${error.message || 'Internal server error during PDF generation.'}` });
    }
  }
}