// api/products.js
export default async function handler(req, res) {
    // Only allow GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const recipeId = process.env.GOOTEN_RECIPE_ID;
    const partnerKey = process.env.GOOTEN_PARTNER_BILLING_KEY;

    if (!recipeId || !partnerKey) {
        return res.status(500).json({ error: 'Missing environment variables' });
    }

    const url = `https://api.print.io/api/products?recipeId=${recipeId}&partnerBillingKey=${encodeURIComponent(partnerKey)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({ error: data.message || 'Gooten API error' });
        }
        // Return the product list (assuming data.Items exists)
        res.status(200).json(data.Items || []);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
