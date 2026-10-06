import { supabase, configured } from './supabase';
import './benefy-product-variants.css';

const mounted = new WeakSet();
const cache = new Map();

function textOf(selector, root = document) {
  return root.querySelector(selector)?.textContent?.trim() || '';
}

function skuFromCard(card) {
  const text = card?.textContent || '';
  const match = text.match(/(?:SKU|מק[״"]?ט)\s*:?\s*([A-Za-z0-9_-]+)/i);
  return match?.[1] || null;
}

function colorLabel(product) {
  const attrs = product?.attributes || {};
  return attrs.color || attrs.color_label || attrs.colors?.[0] || 'צבע נוסף';
}

function colorStyle(label) {
  const value = String(label || '').toLowerCase();
  const colors = {
    'שחור':'#111827','לבן':'#ffffff','אפור':'#9ca3af','אפור כהה':'#4b5563','כסוף':'#cbd5e1',
    'כחול':'#2563eb','כחול נייבי':'#172554','אדום':'#dc2626','ירוק':'#16a34a','ורוד':'#f472b6',
    'סגול':'#7c3aed','בז':'#d6c6a5','חום':'#7c2d12','כתום':'#f97316','זהב':'#d4af37',
    black:'#111827',white:'#ffffff',grey:'#9ca3af',gray:'#9ca3af',silver:'#cbd5e1',blue:'#2563eb',
    red:'#dc2626',green:'#16a34a',pink:'#f472b6',purple:'#7c3aed',beige:'#d6c6a5',brown:'#7c2d12',orange:'#f97316'
  };
  return colors[value] || 'linear-gradient(135deg,#dbeafe,#93c5fd)';
}

async function fetchVariants(sku) {
  if (cache.has(sku)) return cache.get(sku);
  const { data: selected, error } = await supabase
    .from('products')
    .select('id,sku,product_name,image_url,product_url,merchant_id,attributes')
    .eq('sku', sku)
    .eq('active', true)
    .limit(1)
    .maybeSingle();
  if (error || !selected) return [];

  const key = selected.attributes?.master_key;
  if (!key) return [selected];

  const { data } = await supabase
    .from('products')
    .select('id,sku,product_name,image_url,product_url,merchant_id,attributes')
    .eq('merchant_id', selected.merchant_id)
    .eq('active', true)
    .contains('attributes', { master_key: key })
    .order('sku', { ascending: true });

  const unique = [...new Map((data || [selected]).map(item => [item.sku, item])).values()];
  cache.set(sku, unique);
  for (const item of unique) cache.set(item.sku, unique);
  return unique;
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

async function mount(card) {
  if (!configured || !card || mounted.has(card)) return;
  mounted.add(card);
  const sku = skuFromCard(card);
  if (!sku) return;
  const variants = await fetchVariants(sku);
  if (variants.length < 2 || !card.isConnected) return;

  const section = document.createElement('section');
  section.className = 'benefy-variant-picker';
  section.setAttribute('aria-label', 'בחירת צבע');

  const heading = document.createElement('div');
  heading.className = 'benefy-variant-picker__heading';
  heading.innerHTML = `<strong>צבעים זמינים</strong><span>${variants.length} אפשרויות</span>`;
  section.appendChild(heading);

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

  section.appendChild(list);
  const summary = card.querySelector('.summary');
  if (summary) card.insertBefore(section, summary);
  else card.appendChild(section);
}

function scan() {
  document.querySelectorAll('.product-card').forEach(card => mount(card));
}

export function initProductVariantSelector() {
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}
