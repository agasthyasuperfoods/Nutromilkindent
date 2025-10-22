require("dotenv").config({ path: ".env.local" });
const fetch = require("node-fetch");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fs = require("fs");

(async () => {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;
  const user = process.env.ONEDRIVE_USER;
  const folder = process.env.ONEDRIVE_FOLDER || "";
  const fileName = "test-indent.pdf";

  if (!tenantId || !clientId || !clientSecret || !user) {
    console.error("❌ Missing Azure credentials or OneDrive user");
    process.exit(1);
  }

  // 1️⃣ Generate a PDF dynamically
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 400]);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const text = "NutroMilk Indent - Test Upload\nGenerated dynamically!";
  page.drawText(text, { x: 50, y: 350, size: 18, font, color: rgb(0, 0, 0) });

  const pdfBytes = await pdfDoc.save();
  const fileContent = Buffer.from(pdfBytes).toString("base64");

  try {
    // 2️⃣ Get access token
    const tokenResp = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        scope: "https://graph.microsoft.com/.default",
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
    });

    if (!tokenResp.ok) throw new Error(await tokenResp.text());
    const { access_token } = await tokenResp.json();

    // 3️⃣ Build upload URL
    const encodedPath = folder
      ? `${encodeURIComponent(folder)}/${encodeURIComponent(fileName)}`
      : encodeURIComponent(fileName);
    const uploadUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(user)}/drive/root:/${encodedPath}:/content`;

    // 4️⃣ Upload
    const uploadResp = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/pdf",
      },
      body: Buffer.from(fileContent, "base64"),
    });

    if (!uploadResp.ok) throw new Error(await uploadResp.text());
    const result = await uploadResp.json();
    console.log("✅ Upload successful:", result);
  } catch (err) {
    console.error("❌ Upload error:", err);
  }
})();
