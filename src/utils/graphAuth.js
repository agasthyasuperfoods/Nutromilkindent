// src/utils/graphAuth.js

// Read credentials directly from the environment variables (.env.local)
const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const SCOPE = process.env.MS_GRAPH_SCOPE || "https://graph.microsoft.com/.default";

const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

let cachedToken = {
    value: null,
    expiry: 0
};

export async function getGraphAccessToken() {
    if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
        console.error("Missing critical Azure credentials in .env.local for Graph API.");
        return null;
    }
    
    // Return cached token if it's still valid
    if (cachedToken.value && cachedToken.expiry > Date.now() + 300000) {
        return cachedToken.value;
    }
    
    const body = new URLSearchParams();
    body.append('client_id', CLIENT_ID);
    body.append('scope', SCOPE);
    body.append('client_secret', CLIENT_SECRET);
    body.append('grant_type', 'client_credentials');

    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            body: body,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Token fetch failed:', response.status, errorText);
            return null;
        }

        const data = await response.json();
        
        cachedToken = {
            value: data.access_token,
            expiry: Date.now() + (data.expires_in * 1000)
        };

        return data.access_token;
    } catch (error) {
        console.error("Critical error during token fetching:", error);
        return null;
    }
}