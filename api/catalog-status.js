function getSupabaseUrl() {
  const value = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!value) throw new Error('Missing environment variable: VITE_SUPABASE_URL');
  return value.replace(/\/$/, '');
}

function getServerKey() {
  const value = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error('Missing server secret: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY');
  return value;
}

async function supabaseGet(path, prefer = '') {
  const key = getServerKey();
  const response = await fetch(`${getSupabaseUrl()}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, ...(prefer ? { Prefer: prefer } : {}) }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${text}`);
  return { data: text ? JSON.parse(text) : [], contentRange: response.headers.get('content-range') };
}

function countFromContentRange(value) {
  const match = String(value || '').match(/\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

async function countProducts(merchantId = null) {
  const merchantFilter = merchantId ? `&merchant_id=eq.${encodeURIComponent(merchantId)}` : '';
  const response = await supabaseGet(`products?active=eq.true${merchantFilter}&select=id&limit=1`, 'count=exact');
  return countFromContentRange(response.contentRange) ?? response.data.length;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const [activeProducts, shekemElectric, terminalX] = await Promise.all([
      countProducts(), countProducts('shekem-electric'), countProducts('terminal-x')
    ]);
    return res.status(200).json({
      success: true,
      catalogReady: activeProducts > 0,
      activeProducts,
      merchants: { 'shekem-electric': shekemElectric, 'terminal-x': terminalX },
      checkedAt: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
