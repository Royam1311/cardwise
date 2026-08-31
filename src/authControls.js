// Adds language and theme controls to the authentication gateway.
// Uses the same localStorage keys already used by App.jsx.
export function enableAuthControls() {
  let observer;

  function enhance() {
    const auth = document.querySelector('.auth');
    if (!auth || auth.querySelector('.auth-gateway-controls')) return;

    const language = localStorage.getItem('benefy-language') || 'he';
    const theme = localStorage.getItem('benefy-theme') || 'light';
    const controls = document.createElement('div');
    controls.className = 'auth-gateway-controls';

    const languageButton = document.createElement('button');
    languageButton.type = 'button';
    languageButton.className = 'auth-gateway-control auth-gateway-control--language';
    languageButton.setAttribute('aria-label', language === 'he' ? 'Switch to English' : 'מעבר לעברית');
    languageButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
      <span>${language === 'he' ? 'EN' : 'עברית'}</span>
    `;

    const themeButton = document.createElement('button');
    themeButton.type = 'button';
    themeButton.className = 'auth-gateway-control auth-gateway-control--theme';
    themeButton.setAttribute('aria-label', theme === 'light' ? 'Dark mode' : 'Light mode');
    themeButton.innerHTML = theme === 'light'
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.5A8 8 0 0 1 8.5 4 8.2 8.2 0 1 0 20 15.5Z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

    languageButton.addEventListener('click', () => {
      localStorage.setItem('benefy-language', language === 'he' ? 'en' : 'he');
      window.location.reload();
    });

    themeButton.addEventListener('click', () => {
      localStorage.setItem('benefy-theme', theme === 'light' ? 'dark' : 'light');
      window.location.reload();
    });

    controls.append(languageButton, themeButton);
    auth.appendChild(controls);
  }

  enhance();
  observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => observer?.disconnect();
}
