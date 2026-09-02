// BENEFY logo home behavior v4.
// Requests a React-owned reset and never removes React DOM nodes directly.
export function enableLogoHome() {
  let observer;

  function findSearchButton() {
    return [...document.querySelectorAll('.topbar .nav-3d button')].find(button => {
      const text = button.textContent?.trim().toLowerCase() || '';
      return text.includes('חיפוש') || text.includes('search');
    });
  }

  function goHome(event) {
    event?.preventDefault();
    window.dispatchEvent(new CustomEvent('benefy:reset-search'));
    findSearchButton()?.click();
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      requestAnimationFrame(() => document.querySelector('.hero-premium input')?.focus());
    });
  }

  function enhance() {
    const logoElement = document.querySelector('.topbar > .site-logo');
    if (!logoElement || logoElement.dataset.homeEnabled === 'react-safe-search') return;
    logoElement.dataset.homeEnabled = 'react-safe-search';
    logoElement.setAttribute('role', 'link');
    logoElement.setAttribute('tabindex', '0');
    logoElement.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Clear search and open home' : 'נקה את החיפוש וחזור לדף הבית');
    logoElement.title = document.documentElement.lang === 'en' ? 'Clear search and return home' : 'נקה חיפוש וחזור לדף הבית';
    logoElement.addEventListener('click', goHome);
    logoElement.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        goHome(event);
      }
    });
  }

  enhance();
  observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer?.disconnect();
}
