// api/orders.js
import { ratelimit } from './_lib/rate-limit.js';

export default async function handler(req, res) {
    // 1. Origin validation
    const allowedOrigins = [
        process.env.FRONTEND_URL || 'https://your-app.vercel.app',
        'http://localhost:3000',
        'http://localhost:5173',
    ];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        return res.status(403).json({ error: 'Forbidden origin' });
    }

    // 2. Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 3. Validate API token
    const clientToken = req.headers['x-api-key'];
    if (!clientToken || clientToken !== process.env.CLIENT_API_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // 4. Rate limiting (prevent spam)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const { success, reset } = await ratelimit.limit(ip);
    if (!success) {
        return res.status(429).json({
            error: 'Too many requests. Please wait a moment.',
            reset: new Date(reset).toISOString(),
        });
    }

    // 5. Input validation
    const payload = req.body;
    if (!payload.ShipToAddress || !payload.Items || !Array.isArray(payload.Items) || payload.Items.length === 0) {
        return res.status(400).json({ error: 'Missing ShipToAddress or Items' });
    }

    const addr = payload.ShipToAddress;
    if (!addr.FirstName || !addr.LastName || !addr.Line1 || !addr.City || !addr.State || !addr.PostalCode || !addr.CountryCode) {
        return res.status(400).json({ error: 'Incomplete shipping address' });
    }

    for (const item of payload.Items) {
        if (!item.Sku || typeof item.Sku !== 'string') {
            return res.status(400).json({ error: 'Invalid item SKU' });
        }
        if (!item.Quantity || item.Quantity < 1) {
            return res.status(400).json({ error: 'Item quantity must be at least 1' });
        }
    }

    // 6. Get environment variables
    const recipeId = process.env.GOOTEN_RECIPE_ID;
    const partnerKey = process.env.GOOTEN_PARTNER_BILLING_KEY;
    if (!recipeId || !partnerKey) {
        return res.status(500).json({ error: 'Server configuration error' });
    }

    // 7. Forward to Gooten
    const url = `https://api.print.io/api/orders?recipeId=${recipeId}&partnerBillingKey=${encodeURIComponent(partnerKey)}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) {
            console.error('Gooten order error:', data);
            return res.status(response.status).json({ error: 'Order placement failed' });
        }
        res.status(200).json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
