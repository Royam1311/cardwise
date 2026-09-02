// BENEFY hero statistics visual.
// Replaces the right-side example deal card with a premium ecosystem statistics panel.
export function enableHeroStatsVisual() {
  let observer;

  const translations = {
    he: {
      eyebrow: 'BENEFY NETWORK',
      title: 'העולם שלך, מחובר למחיר אחד',
      storesValue: '50+',
      storesLabel: 'חנויות מובילות',
      clubsValue: '25+',
      clubsLabel: 'מועדוני הטבות',
      personalValue: '100%',
      personalLabel: 'מחיר מותאם אישית',
      note: 'המערכת מחברת בין המחירים וההטבות שלך כדי למצוא את המחיר הרלוונטי עבורך.'
    },
    en: {
      eyebrow: 'BENEFY NETWORK',
      title: 'Your benefits, connected to one price',
      storesValue: '50+',
      storesLabel: 'Leading stores',
      clubsValue: '25+',
      clubsLabel: 'Benefit clubs',
      personalValue: '100%',
      personalLabel: 'Personalized pricing',
      note: 'BENEFY connects prices with your benefits to find the most relevant personal price.'
    }
  };

  const language = () => document.documentElement.lang === 'en' ? 'en' : 'he';

  function enhance() {
    const panel = document.querySelector('.hero-deal-card');
    if (!panel || panel.dataset.statsVisual === 'true') return;

    const copy = translations[language()];
    panel.dataset.statsVisual = 'true';
    panel.classList.add('hero-stats-card');
    panel.innerHTML = `
      <span class="hero-stats-card__eyebrow">${copy.eyebrow}</span>
      <h3>${copy.title}</h3>
      <div class="hero-stats-card__grid">
        <article class="hero-stat hero-stat--stores">
          <span class="hero-stat__icon" aria-hidden="true">▦</span>
          <strong>${copy.storesValue}</strong>
          <small>${copy.storesLabel}</small>
        </article>
        <article class="hero-stat hero-stat--clubs">
          <span class="hero-stat__icon" aria-hidden="true">◇</span>
          <strong>${copy.clubsValue}</strong>
          <small>${copy.clubsLabel}</small>
        </article>
        <article class="hero-stat hero-stat--personal">
          <span class="hero-stat__icon" aria-hidden="true">◎</span>
          <strong>${copy.personalValue}</strong>
          <small>${copy.personalLabel}</small>
        </article>
      </div>
      <div class="hero-stats-card__flow" aria-hidden="true">
        <i></i><i></i><i></i><span></span>
      </div>
      <p>${copy.note}</p>
    `;
  }

  enhance();
  observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer?.disconnect();
}
