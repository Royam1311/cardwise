// Makes the BENEFY header logo return to the Search/Home page.
// Uses the existing Search navigation button, so React remains the source of truth.
export function enableLogoHome() {
  let observer;

  function goHome(event) {
    event?.preventDefault();

    const searchButton = [...document.querySelectorAll('.topbar .nav-3d button')]
      .find(button => {
        const text = button.textContent?.trim().toLowerCase() || '';
        return text.includes('חיפוש') || text.includes('search');
      });

    if (searchButton) {
      searchButton.click();
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      return;
    }

    // Safe fallback if the navigation has not rendered yet.
    window.location.assign('/');
  }

  function enhance() {
    const logo = document.querySelector('.topbar > .site-logo');
    if (!logo || logo.dataset.homeEnabled === 'true') return;

    logo.dataset.homeEnabled = 'true';
    logo.setAttribute('role', 'link');
    logo.setAttribute('tabindex', '0');
    logo.setAttribute('aria-label', 'BENEFY Home');
    logo.title = document.documentElement.lang === 'en' ? 'Back to home' : 'חזרה לדף הבית';

    logo.addEventListener('click', goHome);
    logo.addEventListener('keydown', event => {
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
