const MERCHANT_ID = 'shekem-electric';
const PROVIDER = 'fast-simon';
const API_URL = 'https://api.fastsimon.com/full_text_search';
const DEFAULT_TERMS = [
  'טלפון', 'סמארטפון', 'טלוויזיה', 'מקרר', 'מקפיא', 'מכונת כביסה',
  'מייבש כביסה', 'מדיח כלים', 'מזגן', 'שואב אבק', 'מחשב', 'טאבלט',
  'אוזניות', 'רמקול', 'קונסולה', 'מיקרוגל', 'תנור', 'כיריים',
  'מכונת קפה', 'בלנדר', 'מיקסר', 'גריל', 'מאוורר'
];

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function envBoolean(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function splitTerms(value) {
  if (!value) return DEFAULT_TERMS;
  return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))];
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function attributeMap(rawAttributes) {
  const output = {};
  for (const entry of Array.isArray(rawAttributes) ? rawAttributes : []) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const [key, value] = entry;
    if (!key || key === 'Categories' || key === 'Price' || key.includes('swatch image')) continue;
    const values = Array.isArray(value) ? value.flat(Infinity).filter(Boolean) : [value];
    if (values.length) output[String(key)] = values.length === 1 ? values[0] : values;
  }
  return output;
}

function categoryPaths(rawAttributes) {
  const categories = (Array.isArray(rawAttributes) ? rawAttributes : [])
    .find(entry => Array.isArray(entry) && entry[0] === 'Categories');
  return Array.isArray(categories?.[1]) ? categories[1] : [];
}

function firstAttribute(attributes, names) {
  for (const name of names) {
    const value = attributes[name];
    if (Array.isArray(value)) return value[0] || null;
    if (value !== undefined && value !== null && value !== '') return String(value);
  }
  return null;
}

function normalizeProduct(item) {
  const attributes = attributeMap(item.att);
  const comparePrice = numeric(item.p_c);
  return {
    merchant_id: MERCHANT_ID,
    merchant_product_id: item.id ? String(item.id) : null,
    sku: String(item.sku || item.s || '').trim(),
    product_name: String(item.l || '').trim(),
    brand: firstAttribute(attributes, ['מותג יצרן', 'מותג', 'Manufacturer']),
    model: firstAttribute(attributes, ['שם דגם', 'דגם', 'Model']),
    category: firstAttribute(attributes, ['סוג מוצר', 'קטגוריה']),
    category_paths: categoryPaths(item.att),
    image_url: item.t || item.t2 || null,
    product_url: item.u || null,
    attributes,
    active: true,
    last_seen_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
    price: numeric(item.p),
    compare_price: comparePrice && comparePrice > 0 ? comparePrice : null
  };
}

async function supabaseRequest(path, options = {}) {
  const baseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
  const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function createRun(terms) {
  const rows = await supabaseRequest('catalog_sync_runs', {
    method: 'POST',
    body: JSON.stringify({
      merchant_id: MERCHANT_ID,
      provider: PROVIDER,
      mode: 'incremental-search-index',
      status: 'running',
      requested_terms: terms
    })
  });
  return rows?.[0];
}

async function finishRun(id, patch) {
  if (!id) return;
  await supabaseRequest(`catalog_sync_runs?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...patch, finished_at: new Date().toISOString() }),
    prefer: 'return=minimal'
  });
}

async function ensureStore() {
  const rows = await supabaseRequest('stores?on_conflict=store_code', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: JSON.stringify({
      store_code: MERCHANT_ID,
      store_name: 'שקם אלקטריק',
      website: 'https://www.shekem-electric.co.il/',
      active: true,
      updated_at: new Date().toISOString()
    })
  });
  return rows?.[0];
}

async function fetchPage(term, page, productsPerPage) {
  const params = new URLSearchParams({
    request_source: 'v-next',
    src: 'v-next',
    UUID: requiredEnv('SHEKEM_FAST_SIMON_UUID'),
    uuid: requiredEnv('SHEKEM_FAST_SIMON_UUID'),
    store_id: process.env.SHEKEM_FAST_SIMON_STORE_ID || '2',
    cdn_cache_key: requiredEnv('SHEKEM_FAST_SIMON_CDN_CACHE_KEY'),
    api_type: 'json',
    facets_required: page === 1 ? '1' : '0',
    products_per_page: String(productsPerPage),
    narrow: '[]',
    q: term,
    page_num: String(page),
    sort_by: 'relevency',
    with_product_attributes: 'true'
  });
  const response = await fetch(`${API_URL}?${params.toString()}`, {
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`Fast Simon ${response.status} for term "${term}" page ${page}`);
  return response.json();
}

async function upsertProduct(product, storeId) {
  const { price, compare_price: comparePrice, ...productRow } = product;
  const productRows = await supabaseRequest('products?on_conflict=merchant_id,sku', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: JSON.stringify(productRow)
  });
  const savedProduct = productRows?.[0];
  if (!savedProduct?.id || price === null) return;
  await supabaseRequest('prices?on_conflict=product_id,store_id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: JSON.stringify({
      product_id: savedProduct.id,
      store_id: storeId,
      price,
      compare_price: comparePrice,
      currency: 'ILS',
      shipping: 0,
      product_url: product.product_url,
      active: true,
      updated_at: new Date().toISOString()
    })
  });
}

function authorized(req) {
  const expected = process.env.CRON_SECRET || process.env.CATALOG_SYNC_SECRET;
  if (!expected) return false;
  const header = req.headers.authorization || '';
  const querySecret = req.query?.secret;
  return header === `Bearer ${expected}` || querySecret === expected;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (!envBoolean('SHEKEM_SYNC_ENABLED')) {
    return res.status(503).json({
      error: 'Shekem synchronization is disabled',
      action: 'Enable only after obtaining permission to use the product data source.'
    });
  }

  const terms = splitTerms(process.env.SHEKEM_SYNC_TERMS);
  const maxPagesPerTerm = Math.max(1, Math.min(Number(process.env.SHEKEM_MAX_PAGES_PER_TERM || 25), 100));
  const productsPerPage = Math.max(1, Math.min(Number(process.env.SHEKEM_PRODUCTS_PER_PAGE || 50), 100));
  const delayMs = Math.max(250, Number(process.env.SHEKEM_REQUEST_DELAY_MS || 900));
  let run;
  let pagesRequested = 0;
  let productsReceived = 0;
  let productsUpserted = 0;
  let productsFailed = 0;
  const seenSkus = new Set();

  try {
    run = await createRun(terms);
    const store = await ensureStore();
    if (!store?.id) throw new Error('Could not resolve Shekem store row');

    for (const term of terms) {
      let totalPages = 1;
      for (let page = 1; page <= Math.min(totalPages, maxPagesPerTerm); page += 1) {
        const payload = await fetchPage(term, page, productsPerPage);
        pagesRequested += 1;
        totalPages = Math.max(1, Number(payload.total_p || 1));
        const items = Array.isArray(payload.items) ? payload.items : [];
        productsReceived += items.length;

        for (const item of items) {
          const product = normalizeProduct(item);
          if (!product.sku || !product.product_name || seenSkus.has(product.sku)) continue;
          seenSkus.add(product.sku);
          try {
            await upsertProduct(product, store.id);
            productsUpserted += 1;
          } catch (error) {
            productsFailed += 1;
            console.error('Product upsert failed', product.sku, error);
          }
        }
        if (page < Math.min(totalPages, maxPagesPerTerm)) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    await finishRun(run?.id, {
      status: productsFailed ? 'completed_with_errors' : 'completed',
      pages_requested: pagesRequested,
      products_received: productsReceived,
      products_upserted: productsUpserted,
      products_failed: productsFailed,
      details: {
        unique_skus: seenSkus.size,
        catalog_scope: 'configured search terms',
        full_catalog_guaranteed: false
      }
    });

    return res.status(200).json({
      success: true,
      runId: run?.id,
      pagesRequested,
      productsReceived,
      productsUpserted,
      productsFailed,
      uniqueSkus: seenSkus.size,
      scope: 'configured search terms',
      warning: 'This connector does not guarantee complete merchant-catalog coverage without an authorized full feed.'
    });
  } catch (error) {
    await finishRun(run?.id, {
      status: 'failed',
      pages_requested: pagesRequested,
      products_received: productsReceived,
      products_upserted: productsUpserted,
      products_failed: productsFailed,
      error_message: error.message
    }).catch(() => {});
    return res.status(500).json({ error: error.message });
  }
}
