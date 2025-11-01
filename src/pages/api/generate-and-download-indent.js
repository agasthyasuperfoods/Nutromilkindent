import { Readable } from 'stream';
import PDFDocument from 'pdfkit';
import { Pool } from 'pg';
import * as path from 'path';
import * as fs from 'fs';
import fetch from 'node-fetch';

// Create two separate pools
const hrPool = new Pool({
  connectionString: process.env.HR_DATABASE_URL,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
});

const mainPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
});

export const config = {
  api: {
    bodyParser: false, 
  },
};

// Generate PDF Stream with Logo and Packaging Details
function generatePdfStream(indentData, date) {
  const doc = new PDFDocument({ 
    margin: 50,
    size: 'A4',
    bufferPages: true
  });

  const { deliveryBoys = [], bulkCustomers = [] } = indentData;

  // Format date
  const formattedDate = new Date(date).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Logo path - try multiple locations
  const possibleLogoPaths = [
    path.join(process.cwd(), 'public', 'logo.png'),
    path.join(process.cwd(), 'public', 'assets', 'logo.png'),
    path.join(process.cwd(), 'public', 'images', 'logo.png'),
    path.join(process.cwd(), 'assets', 'logo.png'),
  ];

  let logoPath = null;
  for (const p of possibleLogoPaths) {
    if (fs.existsSync(p)) {
      logoPath = p;
      console.log('✅ Logo found at:', logoPath);
      break;
    }
  }

  if (!logoPath) {
    console.warn('⚠️ Logo not found. Checked paths:', possibleLogoPaths);
  }

  // Header with Logo
  if (logoPath) {
    try {
      doc.image(logoPath, 50, 45, { width: 80, height: 80 });
    } catch (err) {
      console.error('❌ Error loading logo:', err.message);
    }
  }

  // Company Details
  doc.fontSize(20)
     .font('Helvetica-Bold')
     .text('NutroMilk Indent Report', 150, 50, { align: 'left' });

  doc.fontSize(10)
     .font('Helvetica')
     .text('Agasthya Nutromilk', 150, 75)
     .text('Phone: +91-8121001774', 150, 90)
     .text('Email: info.anm@agasthya.co.in', 150, 105);

  // Date Box
  doc.rect(50, 140, 495, 30)
     .stroke();
  
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('INDENT FOR DELIVERY ON:', 60, 150);
  
  doc.font('Helvetica')
     .text(formattedDate, 260, 150);

  doc.text('Generated:', 420, 150);
  doc.text(new Date().toLocaleDateString('en-GB'), 480, 150);

  // Table Header
  let yPos = 190;
  
  doc.rect(50, yPos, 495, 25)
     .fillAndStroke('#e6e6e6', '#000000');

  doc.fillColor('#000000')
     .fontSize(10)
     .font('Helvetica-Bold')
     .text('SI No.', 60, yPos + 8, { width: 40 })
     .text('ITEM / ASSIGNED TO', 110, yPos + 8, { width: 250 })
     .text('QTY (L)', 370, yPos + 8, { width: 80, align: 'right' })
     .text('TYPE', 460, yPos + 8, { width: 80 });

  yPos += 25;
  let siNo = 1;

  // Helper function to add row with packaging details
  const addRow = (name, quantity, type, packagingDetails = '') => {
    // Check if we need a new page
    if (yPos > 720) {
      doc.addPage();
      yPos = 50;
      
      // Redraw header on new page
      doc.rect(50, yPos, 495, 25)
         .fillAndStroke('#e6e6e6', '#000000');
      
      doc.fillColor('#000000')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('SI No.', 60, yPos + 8, { width: 40 })
         .text('ITEM / ASSIGNED TO', 110, yPos + 8, { width: 250 })
         .text('QTY (L)', 370, yPos + 8, { width: 80, align: 'right' })
         .text('TYPE', 460, yPos + 8, { width: 80 });
      
      yPos += 25;
    }

    // Main row
    doc.font('Helvetica')
       .fontSize(9)
       .text(String(siNo++), 60, yPos + 5, { width: 40 })
       .text(name, 110, yPos + 5, { width: 250 })
       .text(String(quantity), 370, yPos + 5, { width: 80, align: 'right' })
       .text(type, 460, yPos + 5, { width: 80 });

    yPos += 20;

    // Add packaging details if present
    if (packagingDetails) {
      doc.fontSize(7)
         .fillColor('#666666')
         .text(packagingDetails, 110, yPos, { width: 250 });
      yPos += 12;
    }

    doc.moveTo(50, yPos)
       .lineTo(545, yPos)
       .stroke();

    doc.fillColor('#000000'); // Reset color
    yPos += 5;
  };

  // Add Delivery Boys with packaging
  deliveryBoys
    .filter(d => Number(d.milkQuantity) > 0)
    .forEach(d => {
      const packs1L = Number(d.oneLiterPacks || 0);
      const packs500ml = Number(d.fiveHundredMLPacks || 0);
      
      let details = '';
      if (packs1L > 0) details += `${packs1L}x1L`;
      if (packs500ml > 0) details += (details ? ', ' : '') + `${packs500ml}x500ml`;
      
      const fullName = `${d.name} (${d.area || 'N/A'})${details ? ' - ' + details : ''}`;
      addRow(fullName, d.milkQuantity, 'Delivery Milk');
    });

  // Add Bulk Customers with packaging
  bulkCustomers
    .filter(c => Number(c.totalMilk) > 0)
    .forEach(c => {
      const cansL = Number(c.cansLiters || 0);
      const packs1L = Number(c.oneLiterPacks || 0);
      const packs500ml = Number(c.fiveHundredMLPacks || 0);
      
      const numCans = Math.floor(cansL / 40);
      const remainder = cansL % 40;
      
      let details = '';
      if (numCans > 0) details += `${numCans}x40L Can`;
      if (remainder > 0) details += (details ? ', ' : '') + `${remainder}L`;
      if (packs1L > 0) details += (details ? ', ' : '') + `${packs1L}x1L`;
      if (packs500ml > 0) details += (details ? ', ' : '') + `${packs500ml}x500ml`;
      
      const fullName = `${c.name} (${c.area || 'N/A'})${details ? ' - ' + details : ''}`;
      addRow(fullName, c.totalMilk, 'Bulk Milk');
    });

  // Calculate totals
  const totalDelivery = deliveryBoys.reduce((sum, d) => sum + Number(d.milkQuantity || 0), 0);
  const totalBulk = bulkCustomers.reduce((sum, c) => sum + Number(c.totalMilk || 0), 0);
  const grandTotal = totalDelivery + totalBulk;

  // Totals Box
  const boxX = 350;
  const boxY = yPos + 20;
  const boxWidth = 195;

  doc.rect(boxX, boxY, boxWidth, 80)
     .stroke();

  doc.fontSize(10)
     .font('Helvetica')
     .text('Total Delivery Milk', boxX + 10, boxY + 10)
     .text(`${totalDelivery} L`, boxX + boxWidth - 60, boxY + 10, { width: 50, align: 'right' });

  doc.text('Total Bulk Milk', boxX + 10, boxY + 30)
     .text(`${totalBulk} L`, boxX + boxWidth - 60, boxY + 30, { width: 50, align: 'right' });

  doc.moveTo(boxX + 5, boxY + 50)
     .lineTo(boxX + boxWidth - 5, boxY + 50)
     .stroke();

  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('GRAND TOTAL', boxX + 10, boxY + 58)
     .text(`${grandTotal} L`, boxX + boxWidth - 60, boxY + 58, { width: 50, align: 'right' });

  // Footer
  doc.fontSize(8)
     .font('Helvetica')
     .text('Generated by NutroMilk Indent System', 50, 780, { align: 'center', width: 495 });

  doc.end();
  return doc;
}

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
    console.log('📄 Generating PDF for date:', date);

    // 1. FETCH DELIVERY BOYS FROM HR DATABASE
    const deliveryBoysQuery = `
      SELECT 
        "Name" as name, 
        COALESCE(area, '') as area,
        COALESCE(id::text, '') as employee_id
      FROM public."Milk_point_Employees"
      WHERE LOWER(COALESCE("Designation", '')) = 'delivery boy'
      ORDER BY "Name";
    `;
    
    const hrClient = await hrPool.connect();
    try {
      const deliveryBoysRes = await hrClient.query(deliveryBoysQuery);
      console.log('✅ Fetched delivery boys:', deliveryBoysRes.rows.length);
      
      // Now get their quantities and packaging from indents table (main DB)
      const mainClient = await mainPool.connect();
      try {
        const deliveryBoys = [];
        
        for (const boy of deliveryBoysRes.rows) {
          const indentQuery = `
            SELECT 
              COALESCE(quantity, 0) as quantity,
              COALESCE(one_liter_packs, 0) as one_liter_packs,
              COALESCE(five_hundred_ml_packs, 0) as five_hundred_ml_packs
            FROM indents
            WHERE delivery_boy_id = $1 
              AND indent_date = $2
              AND item_type = 'REGULAR_MILK'
            LIMIT 1;
          `;
          const indentRes = await mainClient.query(indentQuery, [boy.employee_id, date]);
          const row = indentRes.rows[0] || {};
          
          deliveryBoys.push({
            name: boy.name,
            area: boy.area,
            milkQuantity: String(Number(row.quantity) || 0),
            oneLiterPacks: String(Number(row.one_liter_packs) || 0),
            fiveHundredMLPacks: String(Number(row.five_hundred_ml_packs) || 0),
          });
        }

        console.log('✅ Delivery boys with quantities:', deliveryBoys.length);

        // 2. FETCH BULK CUSTOMERS FROM MAIN DATABASE WITH PACKAGING
        const bulkCustomersQuery = `
          SELECT 
            c.company_name as name, 
            c.area, 
            COALESCE(i.quantity, 0) as "totalMilk",
            COALESCE(i.cans_liters, 0) as "cansLiters",
            COALESCE(i.one_liter_packs, 0) as "oneLiterPacks",
            COALESCE(i.five_hundred_ml_packs, 0) as "fiveHundredMLPacks"
          FROM bulk_customers c
          LEFT JOIN indents i ON c.company_id = i.company_id 
            AND i.indent_date = $1
          ORDER BY c.company_name;
        `;
        const bulkCustomersRes = await mainClient.query(bulkCustomersQuery, [date]);
        const bulkCustomers = bulkCustomersRes.rows.map(r => ({ 
          name: r.name,
          area: r.area,
          totalMilk: String(Number(r.totalMilk) || 0),
          cansLiters: String(Number(r.cansLiters) || 0),
          oneLiterPacks: String(Number(r.oneLiterPacks) || 0),
          fiveHundredMLPacks: String(Number(r.fiveHundredMLPacks) || 0),
        }));

        console.log('✅ Bulk customers:', bulkCustomers.length);

        if (deliveryBoys.length === 0 && bulkCustomers.length === 0) {
          return res.status(404).json({ error: `No indent data found for ${date}.` });
        }

        const indentData = { deliveryBoys, bulkCustomers };

        // 3. GENERATE PDF STREAM
        const pdfStream = generatePdfStream(indentData, date);

        // 4. SET HEADERS AND STREAM TO CLIENT
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        
        pdfStream.pipe(res);

      } finally {
        mainClient.release();
      }
    } finally {
      hrClient.release();
    }

  } catch (error) {
    console.error('❌ PDF Generation error:', error.message);
    console.error('Stack trace:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: `Download failed: ${error.message}` });
    }
  }
}
