// Replaces the left-side demo benefits panel with a tilted wallet visual.
// Presentation only. No card data, pricing, authentication, or Supabase logic changes.
export function enableHeroWalletVisual() {
  let observer;

  function enhance() {
    const panel = document.querySelector('.hero-benefits-card');
    if (!panel || panel.dataset.walletVisual === 'true') return;

    panel.dataset.walletVisual = 'true';
    panel.classList.add('hero-wallet-visual');
    panel.innerHTML = `
      <div class="hero-wallet-stack" aria-hidden="true">
        <article class="hero-wallet-card hero-wallet-card--htz">
          <span><strong>הייטקזון</strong><b>H</b></span>
          <small>TECH BENEFITS</small>
        </article>
        <article class="hero-wallet-card hero-wallet-card--haver">
          <span><strong>חבר</strong><b>ח</b></span>
          <small>CONSUMER CLUB</small>
        </article>
        <article class="hero-wallet-card hero-wallet-card--max">
          <span><strong>MAX</strong><b>M</b></span>
          <small>PREMIUM CREDIT</small>
        </article>
        <div class="hero-wallet-pocket">
          <span class="hero-wallet-pocket__shine"></span>
          <div class="hero-wallet-pocket__brand">
            <i>B</i>
            <span><strong>BENEFY</strong><small>PERSONAL WALLET</small></span>
          </div>
          <div class="hero-wallet-pocket__slot"></div>
        </div>
      </div>
    `;
  }

  enhance();
  observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer?.disconnect();
}
