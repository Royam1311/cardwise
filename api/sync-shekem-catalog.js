const FAST_SIMON_URL = 'https://api.fastsimon.com/full_text_search';
const DEFAULT_TERMS = ['samsung'];

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

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function isEnabled(name) {
  return ['1', 'true', 'yes', 'on'].includes(String(process.env[name] || '').toLowerCase());
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function termsFromEnvironment() {
  const configured = String(process.env.SHEKEM_SYNC_TERMS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  return configured.length ? [...new Set(configured)] : DEFAULT_TERMS;
}

function readAttribute(rawAttributes, names) {
  for (const entry of Array.isArray(rawAttributes) ? rawAttributes : []) {
    if (!Array.isArray(entry) || !names.includes(entry[0])) continue;
    const values = Array.isArray(entry[1]) ? entry[1].flat(Infinity) : [entry[1]];
    const first = values.find(value => value !== null && value !== undefined && value !== '');
    if (first !== undefined) return String(first);
  }
  return null;
}

function normalizeProduct(item) {
  const price = numberOrNull(item.p);
  const productName = String(item.l || '').trim();
  const sku = String(item.sku || item.s || '').trim();
  const brand = readAttribute(item.att, ['מותג יצרן', 'מותג', 'Manufacturer']);
  const model = readAttribute(item.att, ['שם דגם', 'דגם', 'Model']);
  const productType = readAttribute(item.att, ['סוג מוצר', 'קטגוריה']);
  const category = [productType, brand, model].filter(Boolean).join(' | ') || null;

  return {
    product: {
      product_name: productName,
      sku,
      category,
      // Fast Simon's own thumbnail is preferred because it is intended for search-result rendering.
      // The original Shekem image remains the fallback. No generated or synthetic image is used.
      image_url: item.t2 || item.t || null,
      active: true
    },
    price: {
      price,
      productUrl: item.u || null
    }
  };
}

async function supabaseRequest(path, { method = 'GET', body, prefer } = {}) {
  const key = getServerKey();
  const response = await fetch(`${getSupabaseUrl()}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: prefer || 'return=representation'
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${text}`);
  return text ? JSON.parse(text) : [];
}

async function findOrCreateStore() {
  const existing = await supabaseRequest(
    `stores?store_name=eq.${encodeURIComponent('שקם אלקטריק')}&select=id,store_name,website&limit=1`
  );
  if (existing[0]) return existing[0];

  const created = await supabaseRequest('stores', {
    method: 'POST',
    body: {
      store_name: 'שקם אלקטריק',
      website: 'https://www.shekem-electric.co.il/',
      active: true
    }
  });
  return created[0];
}

async function findProductBySku(sku) {
  const rows = await supabaseRequest(
    `products?sku=eq.${encodeURIComponent(sku)}&select=id,sku&limit=1`
  );
  return rows[0] || null;
}

async function saveProduct(product) {
  const existing = await findProductBySku(product.sku);
  if (existing) {
    const rows = await supabaseRequest(`products?id=eq.${encodeURIComponent(existing.id)}`, {
      method: 'PATCH',
      body: product
    });
    return rows[0] || { ...existing, ...product };
  }

  const rows = await supabaseRequest('products', { method: 'POST', body: product });
  return rows[0];
}

async function savePrice(productId, storeId, priceData) {
  if (priceData.price === null) return;

  const existing = await supabaseRequest(
    `prices?product_id=eq.${encodeURIComponent(productId)}&store_id=eq.${encodeURIComponent(storeId)}&select=id&limit=1`
  );

  const row = {
    product_id: productId,
    store_id: storeId,
    price: priceData.price,
    shipping: 0,
    product_url: priceData.productUrl,
    active: true,
    updated_at: new Date().toISOString()
  };

  if (existing[0]) {
    await supabaseRequest(`prices?id=eq.${encodeURIComponent(existing[0].id)}`, {
      method: 'PATCH', body: row, prefer: 'return=minimal'
    });
  } else {
    await supabaseRequest('prices', {
      method: 'POST', body: row, prefer: 'return=minimal'
    });
  }
}

async function fetchSearchPage(term, page, productsPerPage) {
  const uuid = requiredEnv('SHEKEM_FAST_SIMON_UUID');
  const params = new URLSearchParams({
    request_source: 'v-next',
    src: 'v-next',
    UUID: uuid,
    uuid,
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

  const response = await fetch(`${FAST_SIMON_URL}?${params.toString()}`, {
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) throw new Error(`Fast Simon ${response.status}: ${term}, page ${page}`);
  return response.json();
}

function isAuthorized(req) {
  const expected = process.env.CATALOG_SYNC_SECRET || process.env.CRON_SECRET;
  if (!expected) return false;
  return req.headers.authorization === `Bearer ${expected}` || req.query?.secret === expected;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  if (!isEnabled('SHEKEM_SYNC_ENABLED')) {
    return res.status(503).json({ error: 'Shekem synchronization is disabled' });
  }

  const terms = termsFromEnvironment();
  const productsPerPage = Math.max(1, Math.min(Number(process.env.SHEKEM_PRODUCTS_PER_PAGE || 15), 50));
  const maxPagesPerTerm = Math.max(1, Math.min(Number(process.env.SHEKEM_MAX_PAGES_PER_TERM || 3), 50));
  const delayMs = Math.max(500, Number(process.env.SHEKEM_REQUEST_DELAY_MS || 1200));
  const seenSkus = new Set();
  let pagesRequested = 0;
  let productsReceived = 0;
  let productsSaved = 0;
  let productsFailed = 0;

  try {
    const store = await findOrCreateStore();
    if (!store?.id) throw new Error('Could not resolve Shekem store');

    for (const term of terms) {
      let totalPages = 1;
      for (let page = 1; page <= Math.min(totalPages, maxPagesPerTerm); page += 1) {
        const payload = await fetchSearchPage(term, page, productsPerPage);
        pagesRequested += 1;
        totalPages = Math.max(1, Number(payload.total_p || 1));
        const items = Array.isArray(payload.items) ? payload.items : [];
        productsReceived += items.length;

        for (const item of items) {
          const normalized = normalizeProduct(item);
          const sku = normalized.product.sku;
          if (!sku || !normalized.product.product_name || seenSkus.has(sku)) continue;
          seenSkus.add(sku);

          try {
            const savedProduct = await saveProduct(normalized.product);
            if (!savedProduct?.id) throw new Error(`Product ${sku} did not return an id`);
            await savePrice(savedProduct.id, store.id, normalized.price);
            productsSaved += 1;
          } catch (error) {
            productsFailed += 1;
            console.error(`Failed SKU ${sku}:`, error.message);
          }
        }

        if (page < Math.min(totalPages, maxPagesPerTerm)) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    return res.status(200).json({
      success: true,
      imageSourcePriority: ['fast-simon-thumbnail', 'shekem-original'],
      pagesRequested,
      productsReceived,
      productsSaved,
      productsFailed,
      uniqueSkus: seenSkus.size,
      completedAt: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      pagesRequested,
      productsReceived,
      productsSaved,
      productsFailed
    });
  }
}
