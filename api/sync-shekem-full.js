// Full Shekem Electric catalog sync, run in small batches by the Catalog Control HTML.
// Each call handles one search term and up to `maxPages` result pages, then returns nextPage.
const FAST_SIMON_URL = 'https://api.fastsimon.com/full_text_search';
const MERCHANT_ID = 'shekem-electric';
const PAGE_SIZE = 24;

function env(name, fallback) {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}
const supabaseUrl = () => env('SUPABASE_URL', process.env.VITE_SUPABASE_URL).replace(/\/$/, '');
const serverKey = () => env('SUPABASE_SECRET_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
const num = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };
const clean = v => String(v || '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9\u0590-\u05ff]+/g, ' ').replace(/\s+/g, ' ').trim();

function authorized(req) {
  const expected = process.env.CATALOG_SYNC_SECRET || process.env.CRON_SECRET;
  return Boolean(expected) && (req.headers.authorization === `Bearer ${expected}` || req.query?.secret === expected);
}

function readAttribute(raw, names) {
  for (const entry of Array.isArray(raw) ? raw : []) {
    if (!Array.isArray(entry) || !names.includes(entry[0])) continue;
    const values = Array.isArray(entry[1]) ? entry[1].flat(Infinity) : [entry[1]];
    const first = values.find(v => v !== null && v !== undefined && v !== '');
    if (first !== undefined) return String(first);
  }
  return null;
}

function normalize(item) {
  const sku = String(item.sku || item.s || '').trim();
  const name = String(item.l || '').trim();
  if (!sku || !name) return null;
  const brand = readAttribute(item.att, ['מותג יצרן', 'מותג', 'Manufacturer']);
  const model = readAttribute(item.att, ['שם דגם', 'דגם', 'Model']);
  const type = readAttribute(item.att, ['סוג מוצר', 'קטגוריה']);
  const color = readAttribute(item.att, ['צבע']);
  const categories = (item.att || []).find(e => Array.isArray(e) && e[0] === 'Categories')?.[1] || [];
  return {
    product: {
      merchant_id: MERCHANT_ID,
      merchant_product_id: sku,
      sku,
      product_name: name,
      brand,
      model,
      category: type,
      category_paths: categories,
      image_url: item.t2 || item.t || null,
      product_url: item.u || null,
      attributes: { source: 'fast-simon', fast_simon_id: item.id || null, color, master_key: [clean(brand), clean(model), clean(name)].filter(Boolean).join('|') },
      active: true,
      last_synced_at: new Date().toISOString()
    },
    price: { price: num(item.p), compare: num(item.p_c), url: item.u || null }
  };
}

async function db(path, { method = 'GET', body, prefer } = {}) {
  const key = serverKey();
  const response = await fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: prefer || 'return=representation' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : [];
}

async function resolveStore() {
  const rows = await db(`stores?store_code=eq.${MERCHANT_ID}&select=id&limit=1`);
  if (rows[0]) return rows[0];
  return (await db('stores', { method: 'POST', body: { store_code: MERCHANT_ID, store_name: 'שקם אלקטריק', website: 'https://www.shekem-electric.co.il/', active: true } }))[0];
}

async function saveBatch(items, storeId) {
  const unique = [...new Map(items.map(n => [n.product.merchant_product_id, n])).values()];
  if (!unique.length) return 0;
  const saved = await db('products?on_conflict=merchant_id,merchant_product_id&select=id,merchant_product_id', {
    method: 'POST',
    body: unique.map(n => n.product),
    prefer: 'resolution=merge-duplicates,return=representation'
  });
  const idBySku = new Map(saved.map(r => [r.merchant_product_id, r.id]));
  const prices = unique
    .filter(n => n.price.price !== null && idBySku.has(n.product.merchant_product_id))
    .map(n => {
      const compare = n.price.compare && n.price.compare > n.price.price ? n.price.compare : null;
      return {
        product_id: idBySku.get(n.product.merchant_product_id),
        store_id: storeId,
        price: n.price.price,
        compare_price: compare,
        discount_percent: compare ? Math.round((1 - n.price.price / compare) * 100) : null,
        currency: 'ILS',
        shipping: 0,
        product_url: n.price.url,
        active: true,
        updated_at: new Date().toISOString()
      };
    });
  if (prices.length) {
    await db('prices?on_conflict=product_id,store_id', { method: 'POST', body: prices, prefer: 'resolution=merge-duplicates,return=minimal' });
  }
  return saved.length;
}

async function fetchPage(term, page) {
  const uuid = env('SHEKEM_FAST_SIMON_UUID');
  const params = new URLSearchParams({
    request_source: 'v-next', src: 'v-next', UUID: uuid, uuid,
    store_id: process.env.SHEKEM_FAST_SIMON_STORE_ID || '2',
    cdn_cache_key: process.env.SHEKEM_FAST_SIMON_CDN_CACHE_KEY || '',
    api_type: 'json', facets_required: '0', products_per_page: String(PAGE_SIZE),
    narrow: '[]', q: term, page_num: String(page), sort_by: 'relevency', with_product_attributes: 'true'
  });
  const response = await fetch(`${FAST_SIMON_URL}?${params}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Fast Simon ${response.status} for "${term}" page ${page}`);
  return response.json();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ success: false, error: 'Method not allowed' });
  if (!authorized(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const term = String(req.query?.term || '').trim();
  if (!term) return res.status(400).json({ success: false, error: 'Missing term' });
  const startPage = Math.max(1, Number(req.query?.page || 1));
  const maxPages = Math.max(1, Math.min(10, Number(req.query?.maxPages || 4)));
  const delay = Math.max(300, Number(process.env.SHEKEM_REQUEST_DELAY_MS || 600));

  let pagesRequested = 0, productsReceived = 0, productsSaved = 0, totalPages = 1, totalResults = 0, page = startPage;
  try {
    const store = await resolveStore();
    for (; page < startPage + maxPages; page += 1) {
      const payload = await fetchPage(term, page);
      pagesRequested += 1;
      totalPages = Math.max(1, Number(payload.total_p || 1));
      totalResults = Number(payload.total_results || 0);
      const items = Array.isArray(payload.items) ? payload.items : [];
      productsReceived += items.length;
      productsSaved += await saveBatch(items.map(normalize).filter(Boolean), store.id);
      if (!items.length || page >= totalPages) { page += 1; break; }
      await new Promise(r => setTimeout(r, delay));
    }
    const done = page > totalPages || productsReceived === 0;
    return res.status(200).json({
      success: true, term, startPage, pagesRequested, totalPages, totalResults,
      productsReceived, productsSaved, nextPage: done ? null : page, done,
      completedAt: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ success: false, term, error: error.message, startPage, pagesRequested, productsReceived, productsSaved });
  }
}
