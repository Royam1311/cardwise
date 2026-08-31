// Adds Favorites and Search History to the existing BENEFY navigation.
// Data is stored locally per browser until a Supabase table is connected.
export function enableNavFeatures() {
  const FAVORITES_KEY = 'benefy-favorites';
  const HISTORY_KEY = 'benefy-search-history';
  let observer;
  let enhancedNav = null;
  let activeFeature = null;
  let previousActiveButton = null;

  const read = key => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
  };

  const write = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch {}
  };

  const language = () => document.documentElement.lang === 'en' ? 'en' : 'he';

  const labels = () => language() === 'en' ? {
    favorites: 'Favorites', history: 'History', favoritesTitle: 'My Favorites',
    historyTitle: 'Search History', emptyFavorites: 'Products you save will appear here.',
    emptyHistory: 'Your recent searches will appear here.', clear: 'Clear history',
    remove: 'Remove', searchAgain: 'Search again', save: 'Save to favorites', saved: 'Saved'
  } : {
    favorites: 'מועדפים', history: 'היסטוריה', favoritesTitle: 'המועדפים שלי',
    historyTitle: 'היסטוריית חיפושים', emptyFavorites: 'מוצרים שתשמור יופיעו כאן.',
    emptyHistory: 'החיפושים האחרונים שלך יופיעו כאן.', clear: 'נקה היסטוריה',
    remove: 'הסר', searchAgain: 'חפש שוב', save: 'שמור במועדפים', saved: 'נשמר'
  };

  const heartSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5 1.1-1.1a5.5 5.5 0 0 0 0-7.8Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const historySvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M3 3v5h5M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function button(key, text, svg) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = `nav-feature-button nav-feature-button--${key}`;
    element.dataset.feature = key;
    element.innerHTML = `<span class="nav-icon">${svg}</span><span>${text}</span>`;
    element.addEventListener('click', () => showFeature(key, element));
    return element;
  }

  function hideApplicationSections() {
    document.querySelectorAll('body > #root .hero-premium, body > #root .results-premium, body > #root .page').forEach(section => {
      if (!section.classList.contains('feature-page')) section.dataset.featureHidden = 'true';
    });
  }

  function restoreApplicationSections() {
    document.querySelectorAll('[data-feature-hidden="true"]').forEach(section => delete section.dataset.featureHidden);
    document.querySelector('.feature-page')?.remove();
    activeFeature = null;
  }

  function setActive(buttonElement) {
    enhancedNav?.querySelectorAll('button').forEach(item => item.classList.remove('active'));
    buttonElement?.classList.add('active');
  }

  function showFeature(key, buttonElement) {
    activeFeature = key;
    if (!previousActiveButton) previousActiveButton = enhancedNav?.querySelector('button.active:not(.nav-feature-button)');
    hideApplicationSections();
    setActive(buttonElement);
    renderFeaturePage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function returnToApplication() {
    restoreApplicationSections();
    setActive(previousActiveButton || enhancedNav?.querySelector('button'));
    previousActiveButton = null;
  }

  function renderFeaturePage() {
    document.querySelector('.feature-page')?.remove();
    const l = labels();
    const page = document.createElement('section');
    page.className = `page feature-page feature-page--${activeFeature}`;

    if (activeFeature === 'favorites') {
      const items = read(FAVORITES_KEY);
      page.innerHTML = `<div class="feature-page__heading"><div><span class="feature-page__eyebrow">${heartSvg}${l.favorites}</span><h1>${l.favoritesTitle}</h1></div></div><div class="feature-grid"></div>`;
      const grid = page.querySelector('.feature-grid');
      if (!items.length) grid.innerHTML = `<div class="feature-empty">${heartSvg}<strong>${l.emptyFavorites}</strong></div>`;
      items.forEach(item => {
        const card = document.createElement('article');
        card.className = 'feature-item';
        card.innerHTML = `${item.image ? `<img src="${item.image}" alt="">` : `<span class="feature-item__fallback">${heartSvg}</span>`}<div><h2></h2><p></p></div><button type="button">${l.remove}</button>`;
        card.querySelector('h2').textContent = item.name;
        card.querySelector('p').textContent = item.category || '';
        card.querySelector('button').addEventListener('click', () => {
          write(FAVORITES_KEY, read(FAVORITES_KEY).filter(saved => saved.id !== item.id));
          renderFeaturePage();
          syncFavoriteButton();
        });
        grid.appendChild(card);
      });
    } else {
      const items = read(HISTORY_KEY);
      page.innerHTML = `<div class="feature-page__heading"><div><span class="feature-page__eyebrow">${historySvg}${l.history}</span><h1>${l.historyTitle}</h1></div>${items.length ? `<button class="feature-clear" type="button">${l.clear}</button>` : ''}</div><div class="history-list"></div>`;
      const list = page.querySelector('.history-list');
      if (!items.length) list.innerHTML = `<div class="feature-empty">${historySvg}<strong>${l.emptyHistory}</strong></div>`;
      items.forEach(item => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'history-item';
        row.innerHTML = `${historySvg}<span><strong></strong><small></small></span><b>${l.searchAgain}</b>`;
        row.querySelector('strong').textContent = item.query;
        row.querySelector('small').textContent = new Date(item.time).toLocaleString(language() === 'he' ? 'he-IL' : 'en-US');
        row.addEventListener('click', () => {
          const searchInput = document.querySelector('.hero-premium input');
          returnToApplication();
          if (searchInput) {
            const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
            setter.call(searchInput, item.query);
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.closest('form')?.requestSubmit();
          }
        });
        list.appendChild(row);
      });
      page.querySelector('.feature-clear')?.addEventListener('click', () => {
        write(HISTORY_KEY, []);
        renderFeaturePage();
      });
    }

    document.querySelector('.topbar')?.insertAdjacentElement('afterend', page);
  }

  function enhanceNavigation() {
    const nav = document.querySelector('.topbar .nav-3d');
    if (!nav || nav.dataset.featuresEnhanced === 'true') return;
    nav.dataset.featuresEnhanced = 'true';
    enhancedNav = nav;
    const l = labels();
    nav.append(button('favorites', l.favorites, heartSvg), button('history', l.history, historySvg));
    nav.querySelectorAll('button:not(.nav-feature-button)').forEach(item => item.addEventListener('click', returnToApplication));
  }

  function captureSearch() {
    const form = document.querySelector('.hero-premium form');
    if (!form || form.dataset.historyEnhanced === 'true') return;
    form.dataset.historyEnhanced = 'true';
    form.addEventListener('submit', () => {
      const query = form.querySelector('input')?.value.trim();
      if (!query) return;
      const history = read(HISTORY_KEY).filter(item => item.query.toLowerCase() !== query.toLowerCase());
      history.unshift({ query, time: Date.now() });
      write(HISTORY_KEY, history.slice(0, 20));
    });
  }

  function currentProduct() {
    const card = document.querySelector('.product-card');
    if (!card) return null;
    const name = card.querySelector('h2')?.textContent.trim();
    if (!name) return null;
    return {
      id: name.toLowerCase(), name,
      category: card.querySelector('.category')?.textContent.trim() || '',
      image: card.querySelector('img')?.src || ''
    };
  }

  function syncFavoriteButton() {
    const saveButton = document.querySelector('.product-favorite-button');
    const product = currentProduct();
    if (!saveButton || !product) return;
    const saved = read(FAVORITES_KEY).some(item => item.id === product.id);
    saveButton.classList.toggle('is-saved', saved);
    saveButton.setAttribute('aria-label', saved ? labels().saved : labels().save);
  }

  function enhanceProduct() {
    const card = document.querySelector('.product-card');
    if (!card || card.querySelector('.product-favorite-button')) return;
    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'product-favorite-button';
    saveButton.innerHTML = heartSvg;
    saveButton.addEventListener('click', () => {
      const product = currentProduct();
      if (!product) return;
      const items = read(FAVORITES_KEY);
      const exists = items.some(item => item.id === product.id);
      write(FAVORITES_KEY, exists ? items.filter(item => item.id !== product.id) : [product, ...items]);
      syncFavoriteButton();
    });
    card.prepend(saveButton);
    syncFavoriteButton();
  }

  function enhance() {
    enhanceNavigation();
    captureSearch();
    enhanceProduct();
  }

  enhance();
  observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer?.disconnect();
}
