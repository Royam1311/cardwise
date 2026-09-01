// BENEFY sliding navigation indicator.
// Adds one animated pill behind the active navigation button.
export function enableNavIndicator() {
  let observer;
  let resizeObserver;
  let nav = null;
  let indicator = null;
  let scheduled = false;

  function positionIndicator(animate = true) {
    if (!nav || !indicator) return;
    const active = nav.querySelector('button.active');
    if (!active) {
      indicator.classList.remove('is-visible');
      return;
    }

    const navRect = nav.getBoundingClientRect();
    const buttonRect = active.getBoundingClientRect();
    const x = buttonRect.left - navRect.left + nav.scrollLeft;

    if (!animate) indicator.classList.add('no-transition');
    indicator.style.setProperty('--indicator-x', `${x}px`);
    indicator.style.setProperty('--indicator-width', `${buttonRect.width}px`);
    indicator.style.setProperty('--indicator-height', `${buttonRect.height}px`);
    indicator.style.setProperty('--indicator-y', `${buttonRect.top - navRect.top}px`);
    indicator.classList.add('is-visible');

    if (!animate) {
      requestAnimationFrame(() => indicator.classList.remove('no-transition'));
    }
  }

  function schedulePosition(animate = true) {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      positionIndicator(animate);
    });
  }

  function enhance() {
    const nextNav = document.querySelector('.topbar .nav-3d');
    if (!nextNav) return;

    if (nav !== nextNav) {
      resizeObserver?.disconnect();
      nav = nextNav;
      nav.classList.add('nav-with-indicator');

      indicator = nav.querySelector('.nav-sliding-indicator');
      if (!indicator) {
        indicator = document.createElement('span');
        indicator.className = 'nav-sliding-indicator';
        indicator.setAttribute('aria-hidden', 'true');
        nav.prepend(indicator);
      }

      nav.addEventListener('click', event => {
        if (!event.target.closest('button')) return;
        requestAnimationFrame(() => schedulePosition(true));
      });

      nav.addEventListener('scroll', () => schedulePosition(false), { passive: true });
      resizeObserver = new ResizeObserver(() => schedulePosition(false));
      resizeObserver.observe(nav);
      nav.querySelectorAll('button').forEach(button => resizeObserver.observe(button));
      positionIndicator(false);
    }
  }

  enhance();
  observer = new MutationObserver(() => {
    enhance();
    schedulePosition(true);
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });

  window.addEventListener('resize', () => schedulePosition(false), { passive: true });

  return () => {
    observer?.disconnect();
    resizeObserver?.disconnect();
  };
}
