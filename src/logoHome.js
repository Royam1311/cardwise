// BENEFY logo home behavior v2.
// A logo click performs a true clean return to the homepage by reloading the root URL.
// The existing authenticated session, language and theme remain preserved by Supabase/localStorage.
export function enableLogoHome() {
  let observer;

  function goToFreshHome(event) {
    event?.preventDefault();

    // A full navigation resets temporary React state such as:
    // query, search results, search errors, selected tab and opened feature pages.
    const homeUrl = new URL('/', window.location.origin);
    window.location.assign(homeUrl.href);
  }

  function enhance() {
    const logo = document.querySelector('.topbar > .site-logo');
    if (!logo || logo.dataset.homeEnabled === 'fresh-home') return;

    logo.dataset.homeEnabled = 'fresh-home';
    logo.setAttribute('role', 'link');
    logo.setAttribute('tabindex', '0');
    logo.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Open BENEFY home page' : 'פתיחת דף הבית של BENEFY');
    logo.title = document.documentElement.lang === 'en' ? 'Back to BENEFY home' : 'חזרה לדף הבית';

    logo.addEventListener('click', goToFreshHome);
    logo.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        goToFreshHome(event);
      }
    });
  }

  enhance();
  observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => observer?.disconnect();
}
