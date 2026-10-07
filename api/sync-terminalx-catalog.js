// Terminal X catalog sync (batched). Each call handles one category and up to `maxPages` pages of 24.
const ENDPOINT = 'https://www.terminalx.com/a/listingSearch';
const MERCHANT_ID = 'terminal-x';
const PAGE_SIZE = 24;
const CATEGORIES = [
  { id: '3', name: 'נשים', path: 'women' }, { id: '4', name: 'גברים', path: 'men' },
  { id: '5', name: 'ילדים', path: 'kids' }, { id: '392', name: 'ביוטי', path: 'beauty' },
  { id: '23600', name: 'ספורט', path: 'sports' }, { id: '19858', name: 'בית', path: 'home' },
  { id: '32018', name: 'תכשיטים', path: 'jewelry' }, { id: '31898', name: 'וולנס', path: 'wellness' }
];

function env(name, fallback) { const v = process.env[name] || fallback; if (!v) throw new Error(`Missing environment variable: ${name}`); return v; }
const supabaseUrl = () => env('SUPABASE_URL', process.env.VITE_SUPABASE_URL).replace(/\/$/, '');
const serverKey = () => env('SUPABASE_SECRET_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
const enabled = () => ['1', 'true', 'yes', 'on'].includes(String(process.env.TERMINALX_SYNC_ENABLED || '').toLowerCase());
const clean = v => String(v || '').normalize('NFKC').toLowerCase().replace(/[\u0591-\u05c7]/g, '').replace(/[^a-z0-9\u0590-\u05ff]+/g, ' ').replace(/\s+/g, ' ').trim();
const num = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };
const label = (item, key) => item?.tx_labels?.[key] || null;

function authorized(req) {
  const expected = process.env.CATALOG_SYNC_SECRET || process.env.CRON_SECRET;
  return Boolean(expected) && (req.headers.authorization === `Bearer ${expected}` || req.query?.secret === expected);
}

function normalize(item, category) {
  if (!item?.sku || !(item.name || item?.image?.label)) return null;
  const variants = (Array.isArray(item.variants) ? item.variants : []).map(v => {
    const a = {};
    for (const e of v?.attributes || []) if (e?.code) a[e.code] = { label: e.label, id: e.value_index };
    return { sku: v?.product?.sku || null, color: a.color?.label || null, color_id: a.color?.id || null, size: a.size?.label || null, stock_status: v?.product?.stock_status2 || null };
  });
  const colorId = variants.find(v => v.color_id)?.color_id;
  const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];
  const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))];
  const name = String(item.name || item.image.label).trim();
  const brand = label(item, 'brand');
  const url = `https://www.terminalx.com/${category.path}/${String(item.sku).toLowerCase()}${colorId ? `?color=${colorId}` : ''}`;
  const p = item?.price_range?.minimum_price || {};
  const price = num(p?.final_price?.value);
  const regular = num(p?.regular_price?.value);
  return {
    product: {
      merchant_id: MERCHANT_ID,
      merchant_product_id: String(item.id || item.sku),
      sku: String(item.sku),
      product_name: name,
      brand,
      model: item.supplier_style || null,
      category: category.name,
      category_paths: [category.path],
      image_url: item?.small_image?.url || item?.image?.url || item?.thumbnail?.url || null,
      product_url: url,
      attributes: {
        source: 'terminalx-listingSearch',
        master_key: [clean(brand), clean(name), clean(label(item, 'div') || label(item, 'div_top')), clean(item?.fabric)].filter(Boolean).join('|'),
        color: label(item, 'color_group') || colors[0] || null,
        color_id: colorId || null,
        colors, sizes, stock: variants,
        supplier_style: item.supplier_style || null,
        gallery: (item.media_gallery || []).filter(x => x && !x.disabled && x.url).map(x => x.url).slice(0, 8)
      },
      active: item.status !== '0' && item.stock_status2 !== 'OUT_OF_STOCK',
      last_synced_at: new Date().toISOString()
    },
    price: { price, compare: regular && price && regular > price ? regular : null, discount: num(p?.discount?.percent_off), url }
  };
}

async function db(path, { method = 'GET', body, prefer } = {}) {
  const key = serverKey();
  const r = await fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: prefer || 'return=representation' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : [];
}

async function resolveStore() {
  const rows = await db(`stores?store_code=eq.${MERCHANT_ID}&select=id&limit=1`);
  if (rows[0]) return rows[0];
  return (await db('stores', { method: 'POST', body: { store_code: MERCHANT_ID, store_name: 'Terminal X', website: 'https://www.terminalx.com/', active: true } }))[0];
}

async function saveBatch(items, storeId) {
  const unique = [...new Map(items.map(n => [n.product.merchant_product_id, n])).values()];
  if (!unique.length) return 0;
  const saved = await db('products?on_conflict=merchant_id,merchant_product_id&select=id,merchant_product_id', {
    method: 'POST', body: unique.map(n => n.product), prefer: 'resolution=merge-duplicates,return=representation'
  });
  const ids = new Map(saved.map(r => [r.merchant_product_id, r.id]));
  const prices = unique.filter(n => n.price.price !== null && ids.has(n.product.merchant_product_id)).map(n => ({
    product_id: ids.get(n.product.merchant_product_id), store_id: storeId,
    price: n.price.price, compare_price: n.price.compare, discount_percent: n.price.discount,
    currency: 'ILS', shipping: 0, product_url: n.price.url, active: true, updated_at: new Date().toISOString()
  }));
  if (prices.length) await db('prices?on_conflict=product_id,store_id', { method: 'POST', body: prices, prefer: 'resolution=merge-duplicates,return=minimal' });
  return saved.length;
}

async function fetchPage(category, page) {
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Origin: 'https://www.terminalx.com', Referer: `https://www.terminalx.com/${category.path}` },
    body: JSON.stringify({ listingSearchOptions: { myBagSkus: [] }, listingSearchQuery: { categoryId: category.id, filter: { category_id: { eq: category.id } }, pageSize: PAGE_SIZE, currentPage: page, includeAggregations: false, sort: { default: true } } })
  });
  if (!r.ok) throw new Error(`Terminal X ${r.status}, category ${category.id}, page ${page}`);
  const json = await r.json();
  const root = json?.data?.elasticSearch || {};
  return { items: Array.isArray(root.items) ? root.items : [], productCount: Number(root?.categories?.[0]?.product_count) || null, path: root?.categories?.[0]?.url_path || null };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ success: false, error: 'Method not allowed' });
  if (!authorized(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (!enabled()) return res.status(503).json({ success: false, error: 'Terminal X synchronization is disabled' });

  const requested = String(req.query?.category || '4');
  const category = CATEGORIES.find(c => c.id === requested || c.path === requested);
  if (!category) return res.status(400).json({ success: false, error: `Unknown category ${requested}` });
  const startPage = Math.max(1, Number(req.query?.page || 1));
  const maxPages = Math.max(1, Math.min(10, Number(req.query?.maxPages || 5)));
  const delay = Math.max(300, Number(process.env.TERMINALX_REQUEST_DELAY_MS || 500));
  let emptyPages = 0, page = startPage, pagesRequested = 0, productsReceived = 0, productsSaved = 0, productCount = null, done = false;

  try {
    const store = await resolveStore();
    for (; page < startPage + maxPages; page += 1) {
      const result = await fetchPage(category, page);
      pagesRequested += 1;
      productCount = result.productCount ?? productCount;
      productsReceived += result.items.length;
      const resolved = { ...category, path: result.path || category.path };
      productsSaved += await saveBatch(result.items.map(i => normalize(i, resolved)).filter(Boolean), store.id);
      const totalPages = productCount ? Math.ceil(productCount / PAGE_SIZE) : null;
      // Terminal X may return fewer than 24 items on a page (hidden or filtered products),
      // so a short page is NOT the end. Stop only on an empty page or after the last page.
      if (!result.items.length) emptyPages += 1; else emptyPages = 0;
      if ((totalPages && page >= totalPages) || (!totalPages && result.items.length === 0) || emptyPages >= 3) { done = true; page += 1; break; }
      await new Promise(r => setTimeout(r, delay));
    }
    return res.status(200).json({
      success: true, category: category.id, categoryName: category.name, startPage, pagesRequested,
      productCount, totalPages: productCount ? Math.ceil(productCount / PAGE_SIZE) : null,
      productsReceived, productsSaved, done, nextPage: done ? null : page, completedAt: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ success: false, category: category.id, error: error.message, startPage, pagesRequested, productsReceived, productsSaved, nextPage: page });
  }
}
