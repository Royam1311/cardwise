const ENDPOINT = 'https://www.terminalx.com/a/listingSearch';
const MERCHANT_ID = 'terminal-x';
const PAGE_SIZE = 24;
const CATEGORIES = [
  { id: '3', name: 'נשים', path: 'women' },
  { id: '4', name: 'גברים', path: 'men' },
  { id: '5', name: 'ילדים', path: 'kids' },
  { id: '392', name: 'ביוטי', path: 'beauty' },
  { id: '23600', name: 'ספורט', path: 'sports' },
  { id: '19858', name: 'בית', path: 'home' },
  { id: '32018', name: 'תכשיטים', path: 'jewelry' },
  { id: '31898', name: 'וולנס', path: 'wellness' }
];

function envUrl() { const v = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL; if (!v) throw new Error('Missing VITE_SUPABASE_URL'); return v.replace(/\/$/, ''); }
function envKey() { const v = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY; if (!v) throw new Error('Missing Supabase server key'); return v; }
function enabled() { return ['1', 'true', 'yes', 'on'].includes(String(process.env.TERMINALX_SYNC_ENABLED || '').toLowerCase()); }
function authorized(req) { const expected = process.env.CATALOG_SYNC_SECRET || process.env.CRON_SECRET; return Boolean(expected) && (req.headers.authorization === `Bearer ${expected}` || req.query?.secret === expected); }
function clean(value) { return String(value || '').normalize('NFKC').toLowerCase().replace(/[\u0591-\u05c7]/g, '').replace(/[^a-z0-9\u0590-\u05ff]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function numberOrNull(value) { const n = Number(value); return Number.isFinite(n) ? n : null; }
function label(item, key) { return item?.tx_labels?.[key] || null; }
function variantsOf(item) { return Array.isArray(item?.variants) ? item.variants : []; }
function variantAttrs(variant) { const result = {}; for (const entry of variant?.attributes || []) if (entry?.code) result[entry.code] = { label: entry.label, valueIndex: entry.value_index }; return result; }
function imageOf(item) { return item?.small_image?.url || item?.image?.url || item?.thumbnail?.url || item?.media_gallery?.find(x => x && !x.disabled)?.url || null; }
function priceOf(item) { const p = item?.price_range?.minimum_price || {}; return { price: numberOrNull(p?.final_price?.value), comparePrice: numberOrNull(p?.regular_price?.value), discount: numberOrNull(p?.discount?.percent_off) }; }

// Deliberately excludes merchant SKU, color, price and availability.
// Products are grouped only when brand, normalized name, division and fabric match.
function masterKey(item) {
  return [clean(label(item, 'brand')), clean(item?.name), clean(label(item, 'div') || label(item, 'div_top')), clean(item?.fabric)]
    .filter(Boolean).join('|');
}

function productUrl(path, sku, colorId) {
  const base = `https://www.terminalx.com/${path}/${String(sku).toLowerCase()}`;
  return colorId ? `${base}?color=${encodeURIComponent(colorId)}` : base;
}
function affiliateUrl(url) { const template = process.env.TERMINALX_AFFILIATE_URL_TEMPLATE; return template?.includes('{url}') ? template.replace('{url}', encodeURIComponent(url)) : url; }

function normalize(item, category) {
  const variants = variantsOf(item).map(variant => {
    const attrs = variantAttrs(variant);
    return {
      sku: variant?.product?.sku || null,
      color: attrs.color?.label || null,
      color_id: attrs.color?.valueIndex || null,
      size: attrs.size?.label || null,
      size_id: attrs.size?.valueIndex || null,
      stock_status: variant?.product?.stock_status2 || null
    };
  });
  const firstColor = variants.find(v => v.color_id) || {};
  const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];
  const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))];
  const color = label(item, 'color_group') || colors[0] || null;
  const directUrl = productUrl(category.path, item.sku, firstColor.color_id);
  const pricing = priceOf(item);
  return {
    product: {
      merchant_id: MERCHANT_ID,
      merchant_product_id: String(item.id || item.sku),
      sku: String(item.sku || ''),
      product_name: String(item.name || item?.image?.label || '').trim(),
      brand: label(item, 'brand'),
      model: item.supplier_style || null,
      category: category.name,
      category_paths: [category.path],
      image_url: imageOf(item),
      product_url: affiliateUrl(directUrl),
      attributes: {
        source: 'terminalx-listingSearch',
        master_key: masterKey(item),
        color,
        color_id: firstColor.color_id || null,
        colors,
        sizes,
        stock: variants,
        supplier_style: item.supplier_style || null,
        gallery: (item.media_gallery || []).filter(x => x && !x.disabled && x.url).map(x => x.url),
        terminalx_product_url: directUrl
      },
      active: item.status !== '0',
      last_synced_at: new Date().toISOString()
    },
    price: { price: pricing.price, comparePrice: pricing.comparePrice, discount: pricing.discount, productUrl: affiliateUrl(directUrl) }
  };
}

async function db(path, { method = 'GET', body, prefer } = {}) {
  const key = envKey();
  const response = await fetch(`${envUrl()}/rest/v1/${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: prefer || 'return=representation' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${text}`);
  return text ? JSON.parse(text) : [];
}
async function resolveStore() { const rows = await db(`stores?store_code=eq.${MERCHANT_ID}&select=id&limit=1`); if (rows[0]) return rows[0]; return (await db('stores', { method: 'POST', body: { store_code: MERCHANT_ID, store_name: 'Terminal X', website: 'https://www.terminalx.com/', active: true } }))[0]; }
async function saveProduct(product) { const rows = await db(`products?merchant_id=eq.${MERCHANT_ID}&merchant_product_id=eq.${encodeURIComponent(product.merchant_product_id)}&select=id,category_paths&limit=1`); if (rows[0]) { product.category_paths = [...new Set([...(rows[0].category_paths || []), ...(product.category_paths || [])])]; return (await db(`products?id=eq.${rows[0].id}`, { method: 'PATCH', body: product }))[0] || { ...rows[0], ...product }; } return (await db('products', { method: 'POST', body: product }))[0]; }
async function savePrice(productId, storeId, price) { if (price.price === null) return; const rows = await db(`prices?product_id=eq.${productId}&store_id=eq.${storeId}&select=id&limit=1`); const payload = { product_id: productId, store_id: storeId, price: price.price, compare_price: price.comparePrice, discount_percent: price.discount, currency: 'ILS', shipping: 0, product_url: price.productUrl, active: true, updated_at: new Date().toISOString() }; if (rows[0]) await db(`prices?id=eq.${rows[0].id}`, { method: 'PATCH', body: payload, prefer: 'return=minimal' }); else await db('prices', { method: 'POST', body: payload, prefer: 'return=minimal' }); }
async function fetchPage(category, page) { const response = await fetch(ENDPOINT, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', Origin: 'https://www.terminalx.com', Referer: `https://www.terminalx.com/${category.path}` }, body: JSON.stringify({ listingSearchOptions: { myBagSkus: [] }, listingSearchQuery: { categoryId: category.id, filter: { category_id: { eq: category.id } }, pageSize: PAGE_SIZE, currentPage: page, includeAggregations: page === 1, sort: { default: true } } }) }); if (!response.ok) throw new Error(`Terminal X ${response.status}, category ${category.id}, page ${page}`); return response.json(); }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (!enabled()) return res.status(503).json({ error: 'Terminal X synchronization is disabled' });
  const requested = String(req.query?.category || '');
  const categories = requested ? CATEGORIES.filter(c => c.id === requested || c.path === requested) : CATEGORIES;
  const startPage = Math.max(1, Number(req.query?.page || 1));
  const maxPages = Math.max(1, Math.min(Number(req.query?.maxPages || process.env.TERMINALX_MAX_PAGES_PER_RUN || 3), 20));
  const delay = Math.max(300, Number(process.env.TERMINALX_REQUEST_DELAY_MS || 700));
  let pagesRequested = 0, productsReceived = 0, productsSaved = 0, productsFailed = 0;
  try {
    const store = await resolveStore();
    for (const category of categories) {
      for (let page = startPage; page < startPage + maxPages; page += 1) {
        const payload = await fetchPage(category, page);
        pagesRequested += 1;
        const root = payload?.data?.elasticSearch || {};
        const items = Array.isArray(root.items) ? root.items : [];
        const resolvedCategory = { ...category, path: root?.categories?.[0]?.url_path || category.path };
        productsReceived += items.length;
        for (const item of items) {
          try {
            const normalized = normalize(item, resolvedCategory);
            if (!normalized.product.sku || !normalized.product.product_name) continue;
            const product = await saveProduct(normalized.product);
            await savePrice(product.id, store.id, normalized.price);
            productsSaved += 1;
          } catch (error) { productsFailed += 1; console.error('Terminal X product failed:', error.message); }
        }
        if (items.length < PAGE_SIZE) break;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return res.status(200).json({ success: true, categories: categories.map(c => c.id), startPage, maxPages, pagesRequested, productsReceived, productsSaved, productsFailed, nextPage: startPage + maxPages, completedAt: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message, pagesRequested, productsReceived, productsSaved, productsFailed });
  }
}
