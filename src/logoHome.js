// BENEFY logo home behavior v3.
// Clears the current search state and returns to a fresh Search tab without reloading the site.
export function enableLogoHome() {
  let observer;

  function findSearchButton() {
    return [...document.querySelectorAll('.topbar .nav-3d button')].find(button => {
      const text = button.textContent?.trim().toLowerCase() || '';
      return text.includes('חיפוש') || text.includes('search');
    });
  }

  function clearReactInput(input) {
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (setter) setter.call(input, '');
    else input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function clearSearchView() {
    const input = document.querySelector('.hero-premium input');
    clearReactInput(input);

    // Clear the currently rendered temporary search UI without touching saved data.
    document.querySelectorAll(
      '.results-premium .warning, .results-premium .product-card, .results-premium > main, .results-premium .welcome-card'
    ).forEach(element => element.remove());

    // Restore the initial homepage prompt state through a fresh in-app render signal.
    window.dispatchEvent(new CustomEvent('benefy:reset-search'));
  }

  function goToFreshSearch(event) {
    event?.preventDefault();

    const searchButton = findSearchButton();
    searchButton?.click();

    window.requestAnimationFrame(() => {
      clearSearchView();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function enhance() {
    const logo = document.querySelector('.topbar > .site-logo');
    if (!logo || logo.dataset.homeEnabled === 'fresh-search') return;

    logo.dataset.homeEnabled = 'fresh-search';
    logo.setAttribute('role', 'link');
    logo.setAttribute('tabindex', '0');
    logo.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Clear search and open home' : 'נקה את החיפוש וחזור לדף הבית');
    logo.title = document.documentElement.lang === 'en' ? 'Clear search and return home' : 'נקה חיפוש וחזור לדף הבית';

    logo.addEventListener('click', goToFreshSearch);
    logo.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        goToFreshSearch(event);
      }
    });
  }

  enhance();
  observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => observer?.disconnect();
}
