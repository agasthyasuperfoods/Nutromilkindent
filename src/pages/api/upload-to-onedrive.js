import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileName, fileContent, folderPath = "" } = req.body;

    console.log('📤 Upload request received:', { 
      fileName, 
      hasContent: !!fileContent, 
      contentLength: fileContent?.length,
      folderPath 
    });

    // Validate input
    if (!fileName) {
      console.error('❌ Missing fileName');
      return res.status(400).json({ error: "fileName is required" });
    }

    if (!fileContent) {
      console.error('❌ Missing fileContent');
      return res.status(400).json({ error: "fileContent is required" });
    }

    let finalFileContent;

    // Convert base64 to buffer
    try {
      finalFileContent = Buffer.from(fileContent, "base64");
      console.log('✅ PDF buffer created:', finalFileContent.length, 'bytes');
    } catch (error) {
      console.error('❌ Failed to convert base64 to buffer:', error);
      return res.status(400).json({ error: "Invalid base64 content" });
    }

    const tenantId = process.env.AZURE_TENANT_ID;
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const user = process.env.ONEDRIVE_USER;

    console.log('🔑 Azure credentials check:', {
      hasTenantId: !!tenantId,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasUser: !!user,
      user: user
    });

    if (!tenantId || !clientId || !clientSecret || !user) {
      console.error('❌ Missing Azure credentials');
      return res.status(500).json({ 
        error: "Missing Azure credentials or OneDrive user",
        details: {
          hasTenantId: !!tenantId,
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret,
          hasUser: !!user
        }
      });
    }

    console.log('🔑 Getting access token...');

    // Get access token
    const tokenResp = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, 
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          scope: "https://graph.microsoft.com/.default",
          client_secret: clientSecret,
          grant_type: "client_credentials",
        }),
      }
    );

    if (!tokenResp.ok) {
      const errorText = await tokenResp.text();
      console.error('❌ Token request failed:', errorText);
      throw new Error(`Token request failed: ${errorText}`);
    }

    const { access_token } = await tokenResp.json();
    console.log('✅ Access token obtained');

    // Build upload URL - use proper encoding
    const folder = folderPath || process.env.ONEDRIVE_FOLDER || "Indents";
    const fullPath = folder ? `${folder}/${fileName}` : fileName;
    
    // Use proper URI encoding for the path
    const encodedPath = fullPath.split('/').map(part => encodeURIComponent(part)).join('/');
    
    const uploadUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(user)}/drive/root:/${encodedPath}:/content`;

    console.log('📁 Upload details:', {
      folder,
      fileName,
      fullPath,
      encodedPath,
      uploadUrl
    });

    console.log('📤 Uploading file to OneDrive...');

    // Upload to OneDrive
    const uploadResp = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/pdf",
      },
      body: finalFileContent,
    });

    if (!uploadResp.ok) {
      const errorText = await uploadResp.text();
      console.error('❌ Upload failed:', uploadResp.status, errorText);
      throw new Error(`Upload failed (${uploadResp.status}): ${errorText}`);
    }

    const fileData = await uploadResp.json();
    console.log('✅ File uploaded successfully:', fileData.name);
    console.log('📎 File details:', {
      id: fileData.id,
      name: fileData.name,
      size: fileData.size,
      webUrl: fileData.webUrl
    });

    return res.status(200).json({ 
      success: true, 
      file: fileData,
      message: `File uploaded successfully: ${fileData.name}`
    });
  } catch (err) {
    console.error("❌ Upload error:", err.message);
    console.error("Stack trace:", err.stack);
    return res.status(500).json({ 
      error: err.message,
      details: err.toString()
    });
  }
}
