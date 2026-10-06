import { supabase, configured } from './supabase';
import './benefy-product-variants.css';

const mountedSku = new WeakMap();
const cache = new Map();

function normalize(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u0591-\u05c7]/g, '')
    .replace(/[^a-z0-9\u0590-\u05ff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function skuFromCard(card) {
  const text = card?.textContent || '';
  return text.match(/(?:SKU|מק[״"]?ט)\s*:?\s*([A-Za-z0-9_-]+)/i)?.[1] || null;
}

function colorLabel(product) {
  const attrs = product?.attributes || {};
  return attrs.color || attrs.color_label || attrs.colors?.[0] || 'צבע נוסף';
}

function colorStyle(label) {
  const colors = {
    'שחור':'#111827','לבן':'#ffffff','אפור':'#9ca3af','אפור כהה':'#4b5563','כסוף':'#cbd5e1',
    'כחול':'#2563eb','כחול בהיר':'#7dd3fc','כחול נייבי':'#172554','אדום':'#dc2626','ירוק':'#16a34a',
    'ורוד':'#f472b6','סגול':'#7c3aed','בז':'#d6c6a5','חום':'#7c2d12','כתום':'#f97316','זהב':'#d4af37',
    black:'#111827',white:'#ffffff',grey:'#9ca3af',gray:'#9ca3af',silver:'#cbd5e1',blue:'#2563eb',
    navy:'#172554',red:'#dc2626',green:'#16a34a',pink:'#f472b6',purple:'#7c3aed',beige:'#d6c6a5',
    brown:'#7c2d12',orange:'#f97316'
  };
  return colors[normalize(label)] || 'linear-gradient(135deg,#dbeafe,#60a5fa)';
}

function sameProductExceptColor(a, b) {
  if (a.merchant_id !== b.merchant_id) return false;
  if (normalize(a.brand) !== normalize(b.brand)) return false;
  return normalize(a.product_name) === normalize(b.product_name);
}

async function queryByMasterKey(selected) {
  const key = selected.attributes?.master_key;
  if (!key) return [];
  const { data } = await supabase
    .from('products')
    .select('id,sku,product_name,brand,model,category,image_url,product_url,merchant_id,attributes')
    .eq('merchant_id', selected.merchant_id)
    .eq('active', true)
    .contains('attributes', { master_key: key })
    .limit(50);
  return data || [];
}

async function queryByExactIdentity(selected) {
  let request = supabase
    .from('products')
    .select('id,sku,product_name,brand,model,category,image_url,product_url,merchant_id,attributes')
    .eq('merchant_id', selected.merchant_id)
    .eq('active', true)
    .eq('product_name', selected.product_name)
    .limit(50);
  if (selected.brand) request = request.eq('brand', selected.brand);
  const { data } = await request;
  return (data || []).filter(candidate => sameProductExceptColor(selected, candidate));
}

async function fetchVariants(sku) {
  if (cache.has(sku)) return cache.get(sku);
  const { data: selected, error } = await supabase
    .from('products')
    .select('id,sku,product_name,brand,model,category,image_url,product_url,merchant_id,attributes')
    .eq('sku', sku)
    .eq('active', true)
    .limit(1)
    .maybeSingle();
  if (error || !selected) return [];

  const [byKey, byIdentity] = await Promise.all([
    queryByMasterKey(selected),
    queryByExactIdentity(selected)
  ]);
  const variants = [...new Map([selected, ...byKey, ...byIdentity].map(item => [item.sku, item])).values()]
    .filter(item => sameProductExceptColor(selected, item))
    .sort((a, b) => colorLabel(a).localeCompare(colorLabel(b), 'he'));

  for (const item of variants) cache.set(item.sku, variants);
  return variants;
}

function activateVariant(product) {
  const input = document.querySelector('.hero-premium form input');
  const form = input?.closest('form');
  if (!input || !form) return;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, product.sku);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  form.requestSubmit();
}

function render(card, sku, variants) {
  card.querySelector('.benefy-variant-picker')?.remove();
  if (variants.length < 2) return;

  const section = document.createElement('section');
  section.className = 'benefy-variant-picker';
  section.setAttribute('aria-label', 'בחירת צבע');

  const heading = document.createElement('div');
  heading.className = 'benefy-variant-picker__heading';
  const title = document.createElement('strong');
  title.textContent = 'צבעים זמינים';
  const count = document.createElement('span');
  count.textContent = `${variants.length} אפשרויות`;
  heading.append(title, count);

  const list = document.createElement('div');
  list.className = 'benefy-variant-picker__list';
  for (const variant of variants) {
    const label = colorLabel(variant);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `benefy-variant-chip ${variant.sku === sku ? 'is-active' : ''}`;
    button.title = label;
    button.setAttribute('aria-label', `${label}, מק״ט ${variant.sku}`);

    const swatch = document.createElement('span');
    swatch.className = 'benefy-variant-chip__swatch';
    swatch.style.background = colorStyle(label);
    const info = document.createElement('span');
    info.className = 'benefy-variant-chip__info';
    const name = document.createElement('strong');
    name.textContent = label;
    const code = document.createElement('small');
    code.textContent = variant.sku;
    info.append(name, code);
    button.append(swatch, info);
    button.addEventListener('click', () => activateVariant(variant));
    list.appendChild(button);
  }
  section.append(heading, list);
  const summary = card.querySelector('.summary');
  if (summary) card.insertBefore(section, summary);
  else card.appendChild(section);
}

async function mount(card) {
  if (!configured || !card) return;
  const sku = skuFromCard(card);
  if (!sku || mountedSku.get(card) === sku) return;
  mountedSku.set(card, sku);
  const variants = await fetchVariants(sku);
  if (card.isConnected && skuFromCard(card) === sku) render(card, sku, variants);
}

function scan() {
  document.querySelectorAll('.product-card').forEach(card => mount(card));
}

export function initProductVariantSelector() {
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  return () => observer.disconnect();
}
