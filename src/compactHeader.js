// BENEFY smooth header shell.
// The floating capsule appears only after meaningful downward scrolling.
export function enableCompactHeader() {
  let ticking = false;
  let compact = false;

  // Hysteresis prevents flickering around the activation point.
  const ENTER_COMPACT_AT = 170;
  const EXIT_COMPACT_AT = 55;

  function update() {
    const header = document.querySelector('.topbar');
    if (!header) {
      ticking = false;
      return;
    }

    const nextCompact = compact
      ? window.scrollY > EXIT_COMPACT_AT
      : window.scrollY > ENTER_COMPACT_AT;

    if (nextCompact !== compact) {
      compact = nextCompact;
      header.classList.toggle('is-compact', compact);
    }

    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}
