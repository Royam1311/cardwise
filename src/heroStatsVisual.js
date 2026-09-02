// BENEFY hero floating statistics v2.
// Replaces the former large right-side statistics card with three compact floating cards.
export function enableHeroStatsVisual() {
  let observer;

  const translations = {
    he: {
      storesValue: '50+', storesLabel: 'חנויות מובילות',
      clubsValue: '25+', clubsLabel: 'מועדוני הטבות',
      savingsValue: '₪47,630', savingsLabel: 'נחסכו עד כה'
    },
    en: {
      storesValue: '50+', storesLabel: 'Leading stores',
      clubsValue: '25+', clubsLabel: 'Benefit clubs',
      savingsValue: '₪47,630', savingsLabel: 'Saved so far'
    }
  };

  const language = () => document.documentElement.lang === 'en' ? 'en' : 'he';

  function enhance() {
    const panel = document.querySelector('.hero-deal-card');
    if (!panel || panel.dataset.floatingStats === 'true') return;

    const copy = translations[language()];
    panel.dataset.floatingStats = 'true';
    panel.className = 'hero-deal-card hero-floating-stats';
    panel.innerHTML = `
      <article class="hero-floating-stat hero-floating-stat--stores">
        <span class="hero-floating-stat__icon" aria-hidden="true">▦</span>
        <strong>${copy.storesValue}</strong>
        <small>${copy.storesLabel}</small>
      </article>
      <article class="hero-floating-stat hero-floating-stat--clubs">
        <span class="hero-floating-stat__icon" aria-hidden="true">◇</span>
        <strong>${copy.clubsValue}</strong>
        <small>${copy.clubsLabel}</small>
      </article>
      <article class="hero-floating-stat hero-floating-stat--savings">
        <span class="hero-floating-stat__icon" aria-hidden="true">₪</span>
        <strong>${copy.savingsValue}</strong>
        <small>${copy.savingsLabel}</small>
      </article>
    `;
  }

  enhance();
  observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer?.disconnect();
}
