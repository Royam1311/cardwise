import { configured, supabase } from './supabase';

const PRODUCT_FIELDS = `
  id,
  merchant_id,
  merchant_product_id,
  sku,
  product_name,
  brand,
  model,
  category,
  category_paths,
  image_url,
  product_url,
  attributes,
  active,
  last_synced_at,
  prices (
    id,
    price,
    compare_price,
    discount_percent,
    currency,
    shipping,
    product_url,
    updated_at,
    stores (id, store_code, store_name, website)
  )
`;

function requireCatalog() {
  if (!configured || !supabase) throw new Error('Supabase is not configured');
}

function clean(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[^a-z0-9\u0590-\u05ff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const COLOR_WORDS = new Set([
  'שחור','שחורה','שחורים','לבן','לבנה','לבנים','אפור','אפורה','כסוף','כסופה','זהב','זהובה',
  'כחול','כחולה','אדום','אדומה','ירוק','ירוקה','ורוד','ורודה','סגול','סגולה','בז','חום','חומה',
  'כתום','כתומה','שקוף','שקופה','black','white','grey','gray','silver','gold','blue','red','green',
  'pink','purple','beige','brown','orange','navy','tan'
]);

function stripColorOnly(name, attributes = {}) {
  const explicit = [attributes?.color, attributes?.color_label, attributes?.colour]
    .filter(Boolean).map(clean);
  let tokens = clean(name).split(' ').filter(Boolean);
  tokens = tokens.filter(token => !COLOR_WORDS.has(token) && !explicit.includes(token));
  return tokens.join(' ');
}

function groupKey(product) {
  const stored = product?.attributes?.master_key;
  if (stored) return String(stored);
  const brand = clean(product?.brand);
  const model = clean(product?.model);
  const base = stripColorOnly(product?.product_name, product?.attributes);
  return [brand, model, base].filter(Boolean).join('|') || clean(product?.product_name);
}

function lowestPrice(prices = []) {
  return prices
    .filter(row => Number.isFinite(Number(row?.price)))
    .sort((a, b) => Number(a.price) - Number(b.price))[0] || null;
}

export function groupCatalogProducts(products = []) {
  const groups = new Map();
  for (const product of products) {
    const key = groupKey(product);
    const color = product?.attributes?.color || product?.attributes?.color_label || null;
    const existing = groups.get(key) || {
      ...product,
      masterKey: key,
      variants: [],
      offers: [],
      merchantCount: 0,
      colorCount: 0
    };

    existing.variants.push({
      productId: product.id,
      merchantId: product.merchant_id,
      merchantSku: product.sku,
      color,
      sizes: product?.attributes?.sizes || [],
      stock: product?.attributes?.stock || [],
      imageUrl: product.image_url,
      productUrl: product.product_url
    });

    for (const price of product.prices || []) {
      existing.offers.push({
        ...price,
        merchantId: product.merchant_id,
        merchantSku: product.sku,
        color,
        productId: product.id,
        productName: product.product_name,
        imageUrl: product.image_url,
        productUrl: price.product_url || product.product_url
      });
    }
    groups.set(key, existing);
  }

  return [...groups.values()].map(group => {
    const merchants = new Set(group.offers.map(offer => offer.merchantId).filter(Boolean));
    const colors = new Set(group.variants.map(variant => clean(variant.color)).filter(Boolean));
    const bestOffer = lowestPrice(group.offers);
    return {
      ...group,
      prices: group.offers,
      bestOffer,
      merchantCount: merchants.size,
      colorCount: colors.size,
      image_url: group.image_url || group.variants.find(v => v.imageUrl)?.imageUrl || null
    };
  });
}

export async function getCatalogPage({ page = 1, pageSize = 24, merchantId = null, grouped = true } = {}) {
  requireCatalog();
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.max(1, Math.min(Number(pageSize) || 24, 100));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;
  let request = supabase
    .from('products')
    .select(PRODUCT_FIELDS, { count: 'exact' })
    .eq('active', true)
    .order('product_name', { ascending: true })
    .range(from, to);
  if (merchantId) request = request.eq('merchant_id', merchantId);
  const { data, error, count } = await request;
  if (error) throw error;
  const products = data || [];
  return { products: grouped ? groupCatalogProducts(products) : products, count: count || 0, page: safePage, pageSize: safeSize };
}

export async function searchCatalog(term, { limit = 48, merchantId = null, grouped = true } = {}) {
  requireCatalog();
  const query = String(term || '').trim();
  if (query.length < 2) return [];
  const escaped = query.replace(/[,%()]/g, ' ');
  let request = supabase
    .from('products')
    .select(PRODUCT_FIELDS)
    .eq('active', true)
    .or([
      `product_name.ilike.%${escaped}%`,
      `brand.ilike.%${escaped}%`,
      `model.ilike.%${escaped}%`,
      `category.ilike.%${escaped}%`,
      `sku.ilike.%${escaped}%`
    ].join(','))
    .limit(Math.max(1, Math.min(Number(limit) || 48, 100)));
  if (merchantId) request = request.eq('merchant_id', merchantId);
  const { data, error } = await request;
  if (error) throw error;
  return grouped ? groupCatalogProducts(data || []) : (data || []);
}

export async function getProductBySku(sku, merchantId = null) {
  requireCatalog();
  let request = supabase
    .from('products')
    .select(PRODUCT_FIELDS)
    .eq('sku', String(sku))
    .eq('active', true);
  if (merchantId) request = request.eq('merchant_id', merchantId);
  const { data, error } = await request.limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCatalogStatus() {
  const response = await fetch('/api/catalog-status');
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Catalog status request failed');
  return payload;
}
