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

export async function getCatalogPage({ page = 1, pageSize = 24, merchantId = 'shekem-electric' } = {}) {
  requireCatalog();
  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.max(1, Math.min(Number(pageSize) || 24, 100));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;
  const { data, error, count } = await supabase
    .from('products')
    .select(PRODUCT_FIELDS, { count: 'exact' })
    .eq('merchant_id', merchantId)
    .eq('active', true)
    .order('product_name', { ascending: true })
    .range(from, to);
  if (error) throw error;
  return { products: data || [], count: count || 0, page: safePage, pageSize: safeSize };
}

export async function searchCatalog(term, { limit = 12, merchantId = 'shekem-electric' } = {}) {
  requireCatalog();
  const query = String(term || '').trim();
  if (query.length < 2) return [];
  const escaped = query.replace(/[,%()]/g, ' ');
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_FIELDS)
    .eq('merchant_id', merchantId)
    .eq('active', true)
    .or([
      `product_name.ilike.%${escaped}%`,
      `brand.ilike.%${escaped}%`,
      `model.ilike.%${escaped}%`,
      `category.ilike.%${escaped}%`,
      `sku.ilike.%${escaped}%`
    ].join(','))
    .limit(Math.max(1, Math.min(Number(limit) || 12, 50)));
  if (error) throw error;
  return data || [];
}

export async function getProductBySku(sku, merchantId = 'shekem-electric') {
  requireCatalog();
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_FIELDS)
    .eq('merchant_id', merchantId)
    .eq('sku', String(sku))
    .eq('active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCatalogStatus() {
  const response = await fetch('/api/catalog-status');
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Catalog status request failed');
  return payload;
}
