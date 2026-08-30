// Adds a compact class to the existing floating header while scrolling.
// This file changes presentation only. It does not touch application state or content.
export function enableCompactHeader() {
  let ticking = false;

  const update = () => {
    const header = document.querySelector('.topbar');
    if (header) header.classList.toggle('is-compact', window.scrollY > 90);
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  };

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}
