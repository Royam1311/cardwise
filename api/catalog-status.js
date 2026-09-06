function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

async function supabaseGet(path) {
  const baseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
  const key = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${text}`);
  return text ? JSON.parse(text) : [];
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const [products, runs] = await Promise.all([
      supabaseGet('products?merchant_id=eq.shekem-electric&active=eq.true&select=id'),
      supabaseGet('catalog_sync_runs?merchant_id=eq.shekem-electric&select=id,status,products_upserted,products_failed,started_at,finished_at,error_message&order=started_at.desc&limit=1')
    ]);
    return res.status(200).json({
      merchantId: 'shekem-electric',
      activeProducts: products.length,
      lastSync: runs[0] || null
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
