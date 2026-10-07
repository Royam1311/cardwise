const MERCHANTS = ['shekem-electric', 'terminal-x', 'tzilzul'];

function env(name, fallback) {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

async function count(filter = '') {
  const url = env('SUPABASE_URL', process.env.VITE_SUPABASE_URL).replace(/\/$/, '');
  const key = env('SUPABASE_SECRET_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
  const response = await fetch(`${url}/rest/v1/products?active=eq.true${filter}&select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' }
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${(await response.text()).slice(0, 200)}`);
  const match = String(response.headers.get('content-range') || '').match(/\/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const [activeProducts, ...perMerchant] = await Promise.all([
      count(),
      ...MERCHANTS.map(m => count(`&merchant_id=eq.${encodeURIComponent(m)}`))
    ]);
    const merchants = Object.fromEntries(MERCHANTS.map((m, i) => [m, perMerchant[i]]));
    return res.status(200).json({ success: true, catalogReady: activeProducts > 0, activeProducts, merchants, checkedAt: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
