import { configured, supabase } from './supabase';

const MIN_CHARS = 2;
const LIMIT = 10;
const DEBOUNCE_MS = 160;
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

const normalize = value => String(value || '')
  .replace(/[,%()]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const money = value => value === null || value === undefined
  ? ''
  : new Intl.NumberFormat('he-IL', {
      style: 'currency', currency: 'ILS', maximumFractionDigits: 0
    }).format(Number(value));

function setReactValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function loadSuggestions(rawTerm) {
  const term = normalize(rawTerm);
  const key = term.toLocaleLowerCase('he-IL');
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.data;

  const { data: products, error } = await supabase
    .from('products')
    .select('id,product_name,sku,category,image_url')
    .eq('active', true)
    .or(`product_name.ilike.%${term}%,sku.ilike.%${term}%,category.ilike.%${term}%`)
    .limit(LIMIT);
  if (error) throw error;

  const rows = products || [];
  const ids = rows.map(item => item.id);
  let prices = [];
  if (ids.length) {
    const response = await supabase
      .from('prices')
      .select('product_id,price,shipping')
      .in('product_id', ids)
      .eq('active', true);
    prices = response.data || [];
  }

  const best = new Map();
  for (const row of prices) {
    const total = Number(row.price || 0) + Number(row.shipping || 0);
    if (!best.has(row.product_id) || total < best.get(row.product_id).total) {
      best.set(row.product_id, { price: Number(row.price || 0), total });
    }
  }

  const data = rows.map(item => ({
    ...item,
    price: best.get(item.id)?.price ?? null,
    exactSku: String(item.sku || '').toLocaleLowerCase('he-IL') === key,
    starts: String(item.product_name || '').toLocaleLowerCase('he-IL').startsWith(key)
  })).sort((a, b) => {
    if (a.exactSku !== b.exactSku) return a.exactSku ? -1 : 1;
    if (a.starts !== b.starts) return a.starts ? -1 : 1;
    return String(a.product_name || '').localeCompare(String(b.product_name || ''), 'he');
  });

  cache.set(key, { at: Date.now(), data });
  return data;
}

export function enableAutocompleteSearch() {
  if (!configured || !supabase) return () => {};

  let form;
  let input;
  let panel;
  let timer;
  let requestId = 0;
  let results = [];
  let activeIndex = -1;
  let attachedInput = null;

  const close = () => {
    activeIndex = -1;
    results = [];
    if (panel) {
      panel.classList.remove('is-open', 'is-loading');
      panel.replaceChildren();
    }
    input?.setAttribute('aria-expanded', 'false');
  };

  const choose = product => {
    close();
    setReactValue(input, product.sku || product.product_name);
    requestAnimationFrame(() => form.requestSubmit());
  };

  const makeItem = (product, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'benefy-autocomplete__item';
    button.dataset.index = String(index);
    button.setAttribute('role', 'option');

    const media = document.createElement('span');
    media.className = 'benefy-autocomplete__image';
    if (product.image_url) {
      const img = document.createElement('img');
      img.src = product.image_url;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.onerror = () => { media.textContent = '◫'; media.classList.add('is-empty'); };
      media.appendChild(img);
    } else {
      media.textContent = '◫';
      media.classList.add('is-empty');
    }

    const info = document.createElement('span');
    info.className = 'benefy-autocomplete__details';
    const title = document.createElement('strong');
    title.textContent = product.product_name || '';
    const meta = document.createElement('span');
    meta.className = 'benefy-autocomplete__meta';
    meta.textContent = `SKU ${product.sku || '-'}${product.category ? ` • ${product.category}` : ''}`;
    info.append(title, meta);

    const price = document.createElement('span');
    price.className = 'benefy-autocomplete__price';
    price.textContent = product.price === null ? 'בחר להצגת מחיר' : money(product.price);

    button.append(media, info, price);
    button.onpointerdown = event => event.preventDefault();
    button.onclick = () => choose(product);
    return button;
  };

  const render = (items, term) => {
    if (!panel) return;
    results = items;
    activeIndex = -1;
    panel.replaceChildren();
    panel.classList.remove('is-loading');

    const heading = document.createElement('div');
    heading.className = 'benefy-autocomplete__heading';
    heading.textContent = items.length ? `הצעות עבור “${term}”` : `לא נמצאו הצעות עבור “${term}”`;
    panel.appendChild(heading);

    for (const [index, product] of items.entries()) panel.appendChild(makeItem(product, index));

    if (items.length) {
      const all = document.createElement('button');
      all.type = 'button';
      all.className = 'benefy-autocomplete__footer';
      all.textContent = `הצג את כל התוצאות עבור “${term}”`;
      all.onpointerdown = event => event.preventDefault();
      all.onclick = () => { close(); form.requestSubmit(); };
      panel.appendChild(all);
    }

    panel.classList.add('is-open');
    input.setAttribute('aria-expanded', 'true');
  };

  const run = async value => {
    const term = normalize(value);
    if (term.length < MIN_CHARS) return close();
    const id = ++requestId;
    panel.classList.add('is-open', 'is-loading');
    panel.innerHTML = '<div class="benefy-autocomplete__loading">מחפש בקטלוג...</div>';
    input.setAttribute('aria-expanded', 'true');
    try {
      const items = await loadSuggestions(term);
      if (id === requestId && normalize(input.value) === term) render(items, term);
    } catch (error) {
      console.error('Autocomplete error:', error);
      if (id === requestId) close();
    }
  };

  const onInput = () => {
    clearTimeout(timer);
    const value = input.value;
    if (normalize(value).length < MIN_CHARS) return close();
    timer = setTimeout(() => run(value), DEBOUNCE_MS);
  };

  const activate = index => {
    const items = [...panel.querySelectorAll('.benefy-autocomplete__item')];
    if (!items.length) return;
    activeIndex = (index + items.length) % items.length;
    items.forEach((node, i) => node.classList.toggle('is-active', i === activeIndex));
    items[activeIndex].scrollIntoView({ block: 'nearest' });
  };

  const onKeyDown = event => {
    if (!panel.classList.contains('is-open')) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); activate(activeIndex + 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); activate(activeIndex - 1); }
    else if (event.key === 'Enter' && activeIndex >= 0) { event.preventDefault(); choose(results[activeIndex]); }
    else if (event.key === 'Escape') { event.preventDefault(); close(); }
  };

  const onOutside = event => { if (form && !form.contains(event.target)) close(); };

  const detach = () => {
    if (!attachedInput) return;
    attachedInput.removeEventListener('input', onInput);
    attachedInput.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('pointerdown', onOutside);
    panel?.remove();
    attachedInput = null;
  };

  const attach = () => {
    const nextForm = document.querySelector('.hero-premium form');
    const nextInput = nextForm?.querySelector('input');
    if (!nextForm || !nextInput || nextInput === attachedInput) return;
    detach();
    form = nextForm;
    input = nextInput;
    panel = document.createElement('div');
    panel.className = 'benefy-autocomplete';
    form.appendChild(panel);
    form.classList.add('benefy-search-form--autocomplete');
    input.autocomplete = 'off';
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onOutside);
    attachedInput = input;
  };

  attach();
  const observer = new MutationObserver(attach);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    clearTimeout(timer);
    requestId += 1;
    observer.disconnect();
    detach();
  };
}
