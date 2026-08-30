// Smooth compact-header behavior with hysteresis to prevent abrupt toggling.
export function enableCompactHeader() {
  let ticking = false;
  let compact = false;

  const ENTER_COMPACT_AT = 150;
  const EXIT_COMPACT_AT = 55;

  function update() {
    const header = document.querySelector('.topbar');
    if (!header) {
      ticking = false;
      return;
    }

    const shouldCompact = compact
      ? window.scrollY > EXIT_COMPACT_AT
      : window.scrollY > ENTER_COMPACT_AT;

    if (shouldCompact !== compact) {
      compact = shouldCompact;
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
