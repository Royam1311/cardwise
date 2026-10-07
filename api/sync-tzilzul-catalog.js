// Tzilzul (WooCommerce Store API) catalog sync. Each call handles a few pages of 100 products.
const API = 'https://tzilzul.co.il/wp-json/wc/store/v1/products';
const MERCHANT_ID = 'tzilzul';
const PER_PAGE = 100;

function env(name, fallback) {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}
const supabaseUrl = () => env('SUPABASE_URL', process.env.VITE_SUPABASE_URL).replace(/\/$/, '');
const serverKey = () => env('SUPABASE_SECRET_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
const clean = v => String(v || '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9\u0590-\u05ff]+/g, ' ').replace(/\s+/g, ' ').trim();
const stripHtml = v => String(v || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

function authorized(req) {
  const expected = process.env.CATALOG_SYNC_SECRET || process.env.CRON_SECRET;
  return Boolean(expected) && (req.headers.authorization === `Bearer ${expected}` || req.query?.secret === expected);
}

function money(value, minorUnit) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n / Math.pow(10, Number(minorUnit) || 0);
}

function attribute(item, names) {
  const found = (item.attributes || []).find(a => names.includes(a.name) || names.includes(a.taxonomy));
  return found?.terms?.map(t => t.name).filter(Boolean) || [];
}

function normalize(item) {
  if (!item?.id || !item?.name) return null;
  const minor = item.prices?.currency_minor_unit;
  const price = money(item.prices?.price, minor);
  const regular = money(item.prices?.regular_price, minor);
  const name = stripHtml(item.name);
  const brand = item.brands?.[0]?.name || attribute(item, ['יצרן', 'pa_brand'])[0] || null;
  const colors = attribute(item, ['צבע', 'pa_color']);
  const categories = (item.categories || []).map(c => stripHtml(c.name)).filter(Boolean);
  const specs = {};
  for (const a of item.attributes || []) {
    if (a?.name && a.terms?.length) specs[a.name] = a.terms.map(t => t.name).join(', ');
  }
  return {
    product: {
      merchant_id: MERCHANT_ID,
      merchant_product_id: String(item.id),
      sku: String(item.sku || `tz-${item.id}`),
      product_name: name,
      brand,
      model: null,
      category: categories[categories.length - 1] || categories[0] || null,
      category_paths: categories,
      image_url: item.images?.[0]?.thumbnail || item.images?.[0]?.src || null,
      product_url: item.permalink || null,
      attributes: {
        source: 'woocommerce-store-api',
        type: item.type,
        colors,
        color: colors.length === 1 ? colors[0] : null,
        has_variations: (item.variations || []).length > 0,
        in_stock: Boolean(item.is_in_stock),
        specs,
        gallery: (item.images || []).map(i => i.src).filter(Boolean).slice(0, 8),
        master_key: [clean(brand), clean(name)].filter(Boolean).join('|')
      },
      active: Boolean(item.is_purchasable !== false),
      last_synced_at: new Date().toISOString()
    },
    price: {
      price,
      compare: regular && price && regular > price ? regular : null,
      url: item.permalink || null,
      inStock: Boolean(item.is_in_stock)
    }
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
  return (await db('stores', { method: 'POST', body: { store_code: MERCHANT_ID, store_name: 'הצלצול', website: 'https://tzilzul.co.il/', active: true } }))[0];
}

async function saveBatch(items, storeId) {
  const unique = [...new Map(items.map(n => [n.product.merchant_product_id, n])).values()];
  if (!unique.length) return 0;
  const saved = await db('products?on_conflict=merchant_id,merchant_product_id&select=id,merchant_product_id', {
    method: 'POST', body: unique.map(n => n.product), prefer: 'resolution=merge-duplicates,return=representation'
  });
  const ids = new Map(saved.map(r => [r.merchant_product_id, r.id]));
  const prices = unique
    .filter(n => n.price.price !== null && ids.has(n.product.merchant_product_id))
    .map(n => ({
      product_id: ids.get(n.product.merchant_product_id),
      store_id: storeId,
      price: n.price.price,
      compare_price: n.price.compare,
      discount_percent: n.price.compare ? Math.round((1 - n.price.price / n.price.compare) * 100) : null,
      currency: 'ILS',
      shipping: 0,
      product_url: n.price.url,
      active: n.price.inStock,
      updated_at: new Date().toISOString()
    }));
  if (prices.length) {
    await db('prices?on_conflict=product_id,store_id', { method: 'POST', body: prices, prefer: 'resolution=merge-duplicates,return=minimal' });
  }
  return saved.length;
}

async function fetchPage(page) {
  const response = await fetch(`${API}?per_page=${PER_PAGE}&page=${page}&orderby=id&order=asc`, {
    headers: { Accept: 'application/json', 'User-Agent': 'BENEFY-Catalog/1.0' }
  });
  if (response.status === 400 && page > 1) return { items: [], totalPages: page - 1, total: null };
  if (!response.ok) throw new Error(`Tzilzul ${response.status} on page ${page}`);
  const items = await response.json();
  return {
    items: Array.isArray(items) ? items : [],
    totalPages: Number(response.headers.get('x-wp-totalpages')) || null,
    total: Number(response.headers.get('x-wp-total')) || null
  };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ success: false, error: 'Method not allowed' });
  if (!authorized(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const startPage = Math.max(1, Number(req.query?.page || 1));
  const maxPages = Math.max(1, Math.min(5, Number(req.query?.maxPages || 2)));
  const delay = Math.max(300, Number(process.env.TZILZUL_REQUEST_DELAY_MS || 700));
  let page = startPage, pagesRequested = 0, productsReceived = 0, productsSaved = 0, totalPages = null, total = null, done = false;

  try {
    const store = await resolveStore();
    for (; page < startPage + maxPages; page += 1) {
      const result = await fetchPage(page);
      pagesRequested += 1;
      totalPages = result.totalPages ?? totalPages;
      total = result.total ?? total;
      productsReceived += result.items.length;
      productsSaved += await saveBatch(result.items.map(normalize).filter(Boolean), store.id);
      if (!result.items.length || result.items.length < PER_PAGE || (totalPages && page >= totalPages)) { done = true; page += 1; break; }
      await new Promise(r => setTimeout(r, delay));
    }
    return res.status(200).json({
      success: true, startPage, pagesRequested, totalPages, totalProducts: total,
      productsReceived, productsSaved, done, nextPage: done ? null : page,
      completedAt: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message, startPage, pagesRequested, productsReceived, productsSaved });
  }
}
