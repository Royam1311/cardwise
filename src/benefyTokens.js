// Adds the BENEFY token indicator beside the logo.
// The count is read from localStorage key "benefy-token-balance".
// Default is 0 until a real balance source is connected.
export function enableBenefyTokens() {
  let observer;

  function getBalance() {
    try {
      const raw = localStorage.getItem('benefy-token-balance');
      const value = Number(raw ?? 0);
      return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
    } catch {
      return 0;
    }
  }

  function enhance() {
    const header = document.querySelector('.topbar');
    const logo = header?.querySelector(':scope > .site-logo');
    if (!header || !logo || header.querySelector('.benefy-token-badge')) return;

    const cluster = document.createElement('div');
    cluster.className = 'brand-cluster';
    logo.before(cluster);
    cluster.appendChild(logo);

    const badge = document.createElement('div');
    badge.className = 'benefy-token-badge';
    badge.setAttribute('aria-label', `Benefy's tokens: ${getBalance()}`);
    badge.innerHTML = `
      <span class="benefy-token-badge__icon" aria-hidden="true">
        <i></i><i></i><i></i>
      </span>
      <span class="benefy-token-badge__content">
        <span class="benefy-token-badge__label">Benefy's</span>
        <strong class="benefy-token-badge__count">${getBalance()}</strong>
      </span>
    `;
    cluster.appendChild(badge);
  }

  function updateBalance(event) {
    const next = Number(event?.detail?.balance);
    if (!Number.isFinite(next) || next < 0) return;
    const balance = Math.floor(next);
    try { localStorage.setItem('benefy-token-balance', String(balance)); } catch {}
    const count = document.querySelector('.benefy-token-badge__count');
    const badge = document.querySelector('.benefy-token-badge');
    if (count) count.textContent = String(balance);
    if (badge) badge.setAttribute('aria-label', `Benefy's tokens: ${balance}`);
  }

  enhance();
  observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('benefy:token-balance', updateBalance);

  return () => {
    observer?.disconnect();
    window.removeEventListener('benefy:token-balance', updateBalance);
  };
}
