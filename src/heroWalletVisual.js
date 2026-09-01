// BENEFY hero wallet visual v2.
// Presentation only. No wallet data, pricing, authentication, or Supabase logic changes.
export function enableHeroWalletVisual() {
  let observer;

  function enhance() {
    const panel = document.querySelector('.hero-benefits-card');
    if (!panel || panel.dataset.walletVisual === 'v2') return;

    panel.dataset.walletVisual = 'v2';
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
          <div class="hero-wallet-pocket__slot"></div>
          <div class="hero-wallet-pocket__brand">
            <strong>BENEFY</strong>
            <small>PERSONAL WALLET</small>
          </div>
        </div>
      </div>
    `;
  }

  enhance();
  observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer?.disconnect();
}
