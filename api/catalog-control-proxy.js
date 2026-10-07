const ALLOWED_ACTIONS = new Set(['status', 'shekem', 'shekemfull', 'terminalx']);

function applyCors(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin === 'null' ? '*' : origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const action = String(req.query?.action || '');
  if (!ALLOWED_ACTIONS.has(action)) return res.status(400).json({ success: false, error: 'Unsupported action' });

  const expected = process.env.CATALOG_CONTROL_KEY;
  if (!expected || String(req.query?.key || '') !== expected) {
    return res.status(401).json({ success: false, error: 'Unauthorized catalog control request' });
  }

  const syncSecret = process.env.CATALOG_SYNC_SECRET || process.env.CRON_SECRET;
  if (!syncSecret && action !== 'status') return res.status(500).json({ success: false, error: 'Missing CATALOG_SYNC_SECRET' });

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const base = `${protocol}://${host}`;
  const secret = encodeURIComponent(syncSecret || '');
  const page = Math.max(1, Number(req.query?.page || 1));
  let path;

  if (action === 'status') {
    path = '/api/catalog-status';
  } else if (action === 'shekem') {
    path = `/api/sync-shekem-catalog?secret=${secret}`;
  } else if (action === 'shekemfull') {
    const term = encodeURIComponent(String(req.query?.term || ''));
    const maxPages = Math.max(1, Math.min(10, Number(req.query?.maxPages || 4)));
    path = `/api/sync-shekem-full?secret=${secret}&term=${term}&page=${page}&maxPages=${maxPages}`;
  } else {
    const category = encodeURIComponent(String(req.query?.category || '4'));
    const maxPages = Math.max(1, Math.min(20, Number(req.query?.maxPages || 3)));
    path = `/api/sync-terminalx-catalog?secret=${secret}&category=${category}&page=${page}&maxPages=${maxPages}`;
  }

  try {
    const response = await fetch(`${base}${path}`, { headers: { Accept: 'application/json' } });
    const text = await response.text();
    let payload;
    try { payload = JSON.parse(text); } catch { payload = { success: false, error: `Non-JSON response (${response.status})`, raw: text.slice(0, 300) }; }
    return res.status(response.status).json(payload);
  } catch (error) {
    return res.status(502).json({ success: false, error: error.message });
  }
}
