import { configured, supabase } from './supabase';
import './benefy-catalog-infinite-scroll.css';

const PAGE_SIZE = 24;
const INITIAL_APP_LIMIT = 48;
let activeQuery = '';
let offset = INITIAL_APP_LIMIT;
let loading = false;
let exhausted = false;
let observer = null;
let generation = 0;

function safeTerm(value) {
  return String(value || '').replace(/[,%()]/g, ' ').trim();
}

function currentQuery() {
  return safeTerm(document.querySelector('.hero-premium form input')?.value);
}

function createVisual(item) {
  const visual = document.createElement('div');
  visual.className = 'product-visual product-visual--compact';
  if (!item.image_url) {
    visual.classList.add('product-visual--empty');
    visual.textContent = 'התמונה עדיין לא זמינה';
    return visual;
  }
  const image = document.createElement('img');
  image.src = item.image_url;
  image.alt = item.product_name || '';
  image.loading = 'lazy';
  image.referrerPolicy = 'no-referrer';
  image.onerror = () => {
    visual.classList.add('product-visual--empty');
    visual.replaceChildren(document.createTextNode('התמונה עדיין לא זמינה'));
  };
  visual.appendChild(image);
  return visual;
}

function activateProduct(item) {
  const input = document.querySelector('.hero-premium form input');
  const form = input?.closest('form');
  if (!input || !form) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, item.sku || item.product_name || '');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  form.requestSubmit();
}

function createCard(item) {
  const card = document.createElement('article');
  card.className = 'catalog-card catalog-card--infinite';
  card.dataset.productId = String(item.id);
  card.appendChild(createVisual(item));

  const body = document.createElement('div');
  body.className = 'catalog-card__body';
  const category = document.createElement('span');
  category.className = 'category';
  category.textContent = item.category || 'ללא קטגוריה';
  const title = document.createElement('h3');
  title.textContent = item.product_name || '';
  const sku = document.createElement('p');
  sku.append('מק״ט: ');
  const code = document.createElement('b');
  code.textContent = item.sku || '-';
  sku.appendChild(code);
  const source = document.createElement('small');
  source.textContent = 'המידע והמחיר מגיעים מהמקור';
  body.append(category, title, sku, source);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'catalog-card__button';
  button.textContent = 'הצג מחיר';
  button.addEventListener('click', () => activateProduct(item));
  card.append(body, button);
  return card;
}

function getExistingIds(grid) {
  const ids = new Set();
  grid.querySelectorAll('.catalog-card').forEach(card => {
    if (card.dataset.productId) ids.add(card.dataset.productId);
  });
  return ids;
}

function ensureStatus(grid) {
  let wrapper = grid.parentElement?.querySelector('.catalog-stream-status');
  if (wrapper) return wrapper;
  wrapper = document.createElement('div');
  wrapper.className = 'catalog-stream-status';
  wrapper.innerHTML = '<span class="catalog-stream-spinner" aria-hidden="true"></span><strong></strong><button type="button">נסה שוב</button>';
  wrapper.querySelector('button').addEventListener('click', () => loadMore(grid, true));
  grid.insertAdjacentElement('afterend', wrapper);
  return wrapper;
}

function setStatus(grid, mode, text) {
  const status = ensureStatus(grid);
  status.dataset.mode = mode;
  status.querySelector('strong').textContent = text;
  status.querySelector('button').hidden = mode !== 'error';
}

async function fetchPage(term, from) {
  const to = from + PAGE_SIZE - 1;
  return supabase
    .from('products')
    .select('id,product_name,sku,category,image_url,brand,model,merchant_id,attributes')
    .eq('active', true)
    .or([
      `product_name.ilike.%${term}%`,
      `brand.ilike.%${term}%`,
      `model.ilike.%${term}%`,
      `sku.ilike.%${term}%`,
      `category.ilike.%${term}%`
    ].join(','))
    .order('product_name', { ascending: true })
    .range(from, to);
}

async function loadMore(grid, retry = false) {
  if (!configured || loading || exhausted || !grid?.isConnected) return;
  const term = currentQuery();
  if (!term || term !== activeQuery) return;
  loading = true;
  const requestGeneration = generation;
  setStatus(grid, 'loading', retry ? 'מנסה שוב...' : 'טוען מוצרים נוספים...');
  try {
    const { data, error } = await fetchPage(term, offset);
    if (error) throw error;
    if (requestGeneration !== generation || term !== currentQuery()) return;
    const rows = data || [];
    const existing = getExistingIds(grid);
    const fragment = document.createDocumentFragment();
    let added = 0;
    for (const item of rows) {
      if (existing.has(String(item.id))) continue;
      fragment.appendChild(createCard(item));
      existing.add(String(item.id));
      added += 1;
    }
    grid.appendChild(fragment);
    offset += PAGE_SIZE;
    exhausted = rows.length < PAGE_SIZE;
    setStatus(
      grid,
      exhausted ? 'done' : 'ready',
      exhausted ? 'הגעת לסוף התוצאות' : `נוספו ${added} מוצרים. גלול להמשך`
    );
  } catch (error) {
    console.error('BENEFY infinite catalog failed:', error);
    setStatus(grid, 'error', `טעינת מוצרים נוספים נכשלה: ${error.message}`);
  } finally {
    loading = false;
  }
}

function attach(grid) {
  const term = currentQuery();
  if (!term) return;
  if (term !== activeQuery) {
    generation += 1;
    activeQuery = term;
    offset = INITIAL_APP_LIMIT;
    exhausted = false;
    loading = false;
  }
  const status = ensureStatus(grid);
  setStatus(grid, exhausted ? 'done' : 'ready', exhausted ? 'הגעת לסוף התוצאות' : 'גלול להמשך תוצאות');
  observer?.disconnect();
  observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) loadMore(grid);
  }, { rootMargin: '700px 0px' });
  observer.observe(status);
}

function scan() {
  const grid = document.querySelector('.catalog-grid');
  if (grid) attach(grid);
}

export function initCatalogInfiniteScroll() {
  scan();
  const mutationObserver = new MutationObserver(scan);
  mutationObserver.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('benefy:reset-search', () => {
    generation += 1;
    activeQuery = '';
    offset = INITIAL_APP_LIMIT;
    exhausted = false;
    loading = false;
    observer?.disconnect();
  });
  return () => {
    mutationObserver.disconnect();
    observer?.disconnect();
  };
}
