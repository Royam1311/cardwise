import { configured, supabase } from './supabase';

const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 10;
const DEBOUNCE_MS = 280;

function money(value) {
  if (value === null || value === undefined || value === '') return '';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0
  }).format(Number(value));
}

function safeSearchTerm(value) {
  return String(value || '')
    .replace(/[,%()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function setReactInputValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;

  if (setter) setter.call(input, value);
  else input.value = value;

  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

async function findSuggestions(term) {
  if (!configured || !supabase) return [];

  const clean = safeSearchTerm(term);
  if (clean.length < MIN_QUERY_LENGTH) return [];

  const { data: products, error } = await supabase
    .from('products')
    .select('id,product_name,sku,category,image_url')
    .eq('active', true)
    .or([
      `product_name.ilike.%${clean}%`,
      `sku.ilike.%${clean}%`,
      `category.ilike.%${clean}%`
    ].join(','))
    .limit(RESULT_LIMIT);

  if (error) throw error;
  if (!products?.length) return [];

  const ids = products.map(product => product.id);
  const { data: prices } = await supabase
    .from('prices')
    .select('product_id,price,shipping,updated_at')
    .in('product_id', ids)
    .eq('active', true);

  const bestPriceByProduct = new Map();
  for (const row of prices || []) {
    const total = Number(row.price || 0) + Number(row.shipping || 0);
    const existing = bestPriceByProduct.get(row.product_id);
    if (!existing || total < existing.total) {
      bestPriceByProduct.set(row.product_id, {
        price: Number(row.price || 0),
        total,
        updatedAt: row.updated_at
      });
    }
  }

  const lower = clean.toLocaleLowerCase('he-IL');
  return products
    .map(product => ({
      ...product,
      price: bestPriceByProduct.get(product.id)?.price ?? null,
      exactSku: String(product.sku || '').toLocaleLowerCase('he-IL') === lower,
      startsWith: String(product.product_name || '').toLocaleLowerCase('he-IL').startsWith(lower)
    }))
    .sort((a, b) => {
      if (a.exactSku !== b.exactSku) return a.exactSku ? -1 : 1;
      if (a.startsWith !== b.startsWith) return a.startsWith ? -1 : 1;
      return String(a.product_name || '').localeCompare(String(b.product_name || ''), 'he');
    });
}

function createSuggestionRow(product, index, onChoose) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'benefy-autocomplete__item';
  button.dataset.index = String(index);
  button.setAttribute('role', 'option');
  button.setAttribute('aria-selected', 'false');

  const imageBox = document.createElement('span');
  imageBox.className = 'benefy-autocomplete__image';

  if (product.image_url) {
    const image = document.createElement('img');
    image.src = product.image_url;
    image.alt = '';
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => {
      image.remove();
      imageBox.classList.add('is-empty');
      imageBox.textContent = '◫';
    }, { once: true });
    imageBox.appendChild(image);
  } else {
    imageBox.classList.add('is-empty');
    imageBox.textContent = '◫';
  }

  const details = document.createElement('span');
  details.className = 'benefy-autocomplete__details';

  const title = document.createElement('strong');
  title.textContent = product.product_name || '';

  const meta = document.createElement('span');
  meta.className = 'benefy-autocomplete__meta';

  const sku = document.createElement('span');
  sku.textContent = `SKU ${product.sku || '-'}`;
  meta.appendChild(sku);

  if (product.category) {
    const category = document.createElement('span');
    category.textContent = product.category;
    meta.appendChild(category);
  }

  details.append(title, meta);

  const price = document.createElement('span');
  price.className = 'benefy-autocomplete__price';
  price.textContent = product.price !== null ? money(product.price) : 'מחיר בבחירה';

  button.append(imageBox, details, price);
  button.addEventListener('pointerdown', event => event.preventDefault());
  button.addEventListener('click', () => onChoose(product));
  return button;
}

export function enableAutocompleteSearch() {
  if (!configured || !supabase) return () => {};

  let input = null;
  let form = null;
  let panel = null;
  let timer = null;
  let requestSequence = 0;
  let activeIndex = -1;
  let currentResults = [];
  let attached = false;

  function closePanel() {
    activeIndex = -1;
    currentResults = [];
    panel?.classList.remove('is-open', 'is-loading');
    panel?.setAttribute('aria-hidden', 'true');
    if (panel) panel.innerHTML = '';
    input?.setAttribute('aria-expanded', 'false');
  }

  function choose(product) {
    if (!input || !form) return;
    closePanel();
    setReactInputValue(input, product.sku || product.product_name || '');
    window.setTimeout(() => form.requestSubmit(), 0);
  }

  function setActiveIndex(nextIndex) {
    const items = [...(panel?.querySelectorAll('.benefy-autocomplete__item') || [])];
    if (!items.length) return;

    activeIndex = (nextIndex + items.length) % items.length;
    items.forEach((item, index) => {
      const selected = index === activeIndex;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-selected', selected ? 'true' : 'false');
      if (selected) item.scrollIntoView({ block: 'nearest' });
    });
  }

  function renderResults(results, term) {
    if (!panel || !input) return;
    panel.innerHTML = '';
    panel.classList.remove('is-loading');
    activeIndex = -1;
    currentResults = results;

    const heading = document.createElement('div');
    heading.className = 'benefy-autocomplete__heading';
    heading.textContent = results.length
      ? `הצעות עבור “${term}”`
      : `לא נמצאו הצעות עבור “${term}”`;
    panel.appendChild(heading);

    if (results.length) {
      const list = document.createElement('div');
      list.className = 'benefy-autocomplete__list';
      list.setAttribute('role', 'listbox');
      results.forEach((product, index) => {
        list.appendChild(createSuggestionRow(product, index, choose));
      });
      panel.appendChild(list);

      const footer = document.createElement('button');
      footer.type = 'button';
      footer.className = 'benefy-autocomplete__footer';
      footer.textContent = `הצג את כל התוצאות עבור “${term}”`;
      footer.addEventListener('pointerdown', event => event.preventDefault());
      footer.addEventListener('click', () => {
        closePanel();
        form?.requestSubmit();
      });
      panel.appendChild(footer);
    }

    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    input.setAttribute('aria-expanded', 'true');
  }

  async function search(value) {
    const term = safeSearchTerm(value);
    if (term.length < MIN_QUERY_LENGTH) return closePanel();

    const sequence = ++requestSequence;
    panel?.classList.add('is-open', 'is-loading');
    panel?.setAttribute('aria-hidden', 'false');
    if (panel) panel.innerHTML = '<div class="benefy-autocomplete__loading">מחפש בקטלוג...</div>';
    input?.setAttribute('aria-expanded', 'true');

    try {
      const results = await findSuggestions(term);
      if (sequence !== requestSequence || input?.value.trim() !== value.trim()) return;
      renderResults(results, term);
    } catch (error) {
      console.error('BENEFY autocomplete failed:', error);
      if (sequence === requestSequence) closePanel();
    }
  }

  function onInput() {
    window.clearTimeout(timer);
    const value = input?.value || '';
    if (safeSearchTerm(value).length < MIN_QUERY_LENGTH) return closePanel();
    timer = window.setTimeout(() => search(value), DEBOUNCE_MS);
  }

  function onKeyDown(event) {
    if (!panel?.classList.contains('is-open')) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(activeIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(activeIndex - 1);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      const selected = currentResults[activeIndex];
      if (selected) choose(selected);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closePanel();
    }
  }

  function onFocus() {
    const value = input?.value || '';
    if (safeSearchTerm(value).length >= MIN_QUERY_LENGTH) onInput();
  }

  function onDocumentPointerDown(event) {
    if (!form?.contains(event.target)) closePanel();
  }

  function detach() {
    if (!attached) return;
    input?.removeEventListener('input', onInput);
    input?.removeEventListener('keydown', onKeyDown);
    input?.removeEventListener('focus', onFocus);
    document.removeEventListener('pointerdown', onDocumentPointerDown);
    panel?.remove();
    attached = false;
    input = null;
    form = null;
    panel = null;
  }

  function attach() {
    const nextForm = document.querySelector('.hero-premium form');
    const nextInput = nextForm?.querySelector('input');
    if (!nextForm || !nextInput) return;
    if (attached && nextInput === input) return;

    detach();
    form = nextForm;
    input = nextInput;
    panel = document.createElement('div');
    panel.className = 'benefy-autocomplete';
    panel.setAttribute('aria-hidden', 'true');
    form.appendChild(panel);

    form.classList.add('benefy-search-form--autocomplete');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');

    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeyDown);
    input.addEventListener('focus', onFocus);
    document.addEventListener('pointerdown', onDocumentPointerDown);
    attached = true;
  }

  attach();
  const observer = new MutationObserver(attach);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    window.clearTimeout(timer);
    requestSequence += 1;
    observer.disconnect();
    detach();
  };
}
