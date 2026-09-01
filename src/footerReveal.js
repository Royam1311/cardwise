// Reveals the BENEFY footer only when the user scrolls it into view.
export function enableFooterReveal() {
  let mutationObserver;
  let intersectionObserver;
  let observedFooter = null;

  function observeFooter() {
    const footer = document.querySelector('.benefy-footer');
    if (!footer || footer === observedFooter) return;

    intersectionObserver?.disconnect();
    observedFooter = footer;
    footer.classList.add('footer-reveal-ready');

    intersectionObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          entry.target.classList.toggle('is-visible', entry.isIntersecting);
        });
      },
      {
        root: null,
        threshold: 0.12,
        rootMargin: '0px 0px -5% 0px'
      }
    );

    intersectionObserver.observe(footer);
  }

  observeFooter();
  mutationObserver = new MutationObserver(observeFooter);
  mutationObserver.observe(document.body, { childList: true, subtree: true });

  return () => {
    mutationObserver?.disconnect();
    intersectionObserver?.disconnect();
  };
}
