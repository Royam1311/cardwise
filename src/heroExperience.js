// BENEFY premium homepage hero experience.
// Presentation only. The deal and benefit-card content is clearly marked as an example.
export function enableHeroExperience() {
  let observer;

  const copy = {
    he: {
      metric1Title: '🎯 מחירים מותאמים אישית', metric1Text: 'לכל משתמש',
      metric2Title: '50+', metric2Text: 'חנויות מובילות',
      metric3Title: '25+', metric3Text: 'מועדוני הטבות',
      benefitsTitle: 'ההטבות שלך', active: '4 הטבות פעילות',
      benefitsNote: 'BENEFY מחשב עבורך את המחיר האמיתי לאחר כל ההטבות.',
      dealTitle: 'נמצאה עסקה', product: 'iPhone 17 Pro', store: 'KSP',
      original: '₪4,899', after: 'לאחר הטבת חבר', price: '₪4,214',
      savingLabel: 'חיסכון', saving: '₪685', best: 'המחיר הטוב ביותר נמצא עבורך', example: 'דוגמה',
      chips: ['חבר 7%', 'MAX BACK ₪150', 'הייטקזון 12%', 'אשמורת 8%']
    },
    en: {
      metric1Title: '🎯 Personalized prices', metric1Text: 'For every user',
      metric2Title: '50+', metric2Text: 'Leading stores',
      metric3Title: '25+', metric3Text: 'Benefit clubs',
      benefitsTitle: 'Your benefits', active: '4 active benefits',
      benefitsNote: 'BENEFY calculates the real price after all your benefits.',
      dealTitle: 'Deal found', product: 'iPhone 17 Pro', store: 'KSP',
      original: '₪4,899', after: 'After Haver benefit', price: '₪4,214',
      savingLabel: 'Savings', saving: '₪685', best: 'The best price was found for you', example: 'Example',
      chips: ['Haver 7%', 'MAX BACK ₪150', 'HitechZone 12%', 'Ashmoret 8%']
    }
  };

  const language = () => document.documentElement.lang === 'en' ? 'en' : 'he';

  function createExperience(hero) {
    const t = copy[language()];
    const layer = document.createElement('div');
    layer.className = 'hero-experience';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = `
      <div class="hero-experience__chips">
        ${t.chips.map((chip, index) => `<span class="hero-chip hero-chip--${index + 1}">${chip}</span>`).join('')}
      </div>
      <aside class="hero-benefits-card">
        <span class="hero-example-badge">${t.example}</span>
        <header><span class="hero-card-icon">🎁</span><strong>${t.benefitsTitle}</strong></header>
        <ul><li>✓ חבר</li><li>✓ MAX BACK</li><li>✓ הייטקזון</li><li>✓ אשמורת</li></ul>
        <b>${t.active}</b><p>${t.benefitsNote}</p>
      </aside>
      <aside class="hero-deal-card">
        <span class="hero-example-badge">${t.example}</span>
        <header><span class="hero-card-icon">💰</span><strong>${t.dealTitle}</strong></header>
        <h3>${t.product}</h3><span class="hero-deal-store">${t.store}</span>
        <del>${t.original}</del><small>${t.after}</small><strong class="hero-deal-price">${t.price}</strong>
        <div class="hero-saving"><span>${t.savingLabel}</span><b>${t.saving}</b></div>
        <p>✓ ${t.best}</p>
      </aside>
    `;

    const metrics = document.createElement('div');
    metrics.className = 'hero-metrics';
    metrics.innerHTML = `
      <article><strong>${t.metric1Title}</strong><span>${t.metric1Text}</span></article>
      <article><strong>${t.metric2Title}</strong><span>${t.metric2Text}</span></article>
      <article><strong>${t.metric3Title}</strong><span>${t.metric3Text}</span></article>
    `;

    hero.append(layer, metrics);
  }

  function enhance() {
    const hero = document.querySelector('.hero-premium');
    if (!hero || hero.querySelector('.hero-experience')) return;
    hero.classList.add('hero-premium--experience');
    createExperience(hero);
  }

  enhance();
  observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer?.disconnect();
}
