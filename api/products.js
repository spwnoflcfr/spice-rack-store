// api/products.js
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

    // 2. Only allow GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 3. Validate API token (sent from frontend)
    const clientToken = req.headers['x-api-key'];
    if (!clientToken || clientToken !== process.env.CLIENT_API_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // 4. Get environment variables
    const recipeId = process.env.GOOTEN_RECIPE_ID;
    const partnerKey = process.env.GOOTEN_PARTNER_BILLING_KEY;
    if (!recipeId || !partnerKey) {
        return res.status(500).json({ error: 'Server configuration error' });
    }

    // 5. Forward to Gooten
    const url = `https://api.print.io/api/products?recipeId=${recipeId}&partnerBillingKey=${encodeURIComponent(partnerKey)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) {
            console.error('Gooten API error:', data);
            return res.status(response.status).json({ error: 'Failed to fetch products' });
        }
        res.status(200).json(data.Items || []);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
