// BENEFY premium footer.
// Appears only on the Search page and uses the existing light/dark logo assets.
export function enableSiteFooter() {
  let observer;

  const INSTAGRAM_URL = 'https://www.instagram.com/benefy.il?igsi=MTc4bXluZ2NscGVw';
  const CONTACT_EMAIL = 'benefymail@gmail.com';

  const content = {
    he: {
      about: 'אודות', terms: 'תנאי שימוש', contact: 'צור קשר',
      tagline: 'המחיר האישי שלך, בכל קנייה.', rights: 'כל הזכויות שמורות.',
      aboutTitle: 'אודות BENEFY',
      aboutBody: 'BENEFY עוזרת להשוות את המחיר האישי לאחר הטבות, כרטיסים ומועדוני צרכנות, במקום אחד ברור ונוח.',
      termsTitle: 'תנאי שימוש',
      termsBody: 'המידע באתר מיועד להשוואה כללית. מחירים, מלאי והטבות עשויים להשתנות, והמחיר הקובע הוא המחיר המוצג באתר החנות בעת הרכישה.',
      close: 'סגור', instagram: 'Instagram'
    },
    en: {
      about: 'About', terms: 'Terms of Use', contact: 'Contact',
      tagline: 'Your personal price, every purchase.', rights: 'All rights reserved.',
      aboutTitle: 'About BENEFY',
      aboutBody: 'BENEFY helps compare your personal price after cards, benefits and consumer clubs, in one clear and convenient place.',
      termsTitle: 'Terms of Use',
      termsBody: 'Information on the site is provided for general comparison. Prices, availability and benefits may change. The binding price is the price displayed by the retailer at checkout.',
      close: 'Close', instagram: 'Instagram'
    }
  };

  const instagramIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.4" cy="6.7" r="1" fill="currentColor"/></svg>';
  const mailIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function language() {
    return document.documentElement.lang === 'en' ? 'en' : 'he';
  }

  function closeModal() {
    const modal = document.querySelector('.legal-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    window.setTimeout(() => modal.remove(), 200);
  }

  function openModal(type) {
    closeModal();
    const copy = content[language()];
    const modal = document.createElement('div');
    modal.className = 'legal-modal';
    modal.innerHTML = `
      <button class="legal-modal__backdrop" type="button" aria-label="${copy.close}"></button>
      <section class="legal-modal__panel" role="dialog" aria-modal="true">
        <button class="legal-modal__close" type="button" aria-label="${copy.close}">×</button>
        <span class="legal-modal__eyebrow">BENEFY</span>
        <h2>${type === 'about' ? copy.aboutTitle : copy.termsTitle}</h2>
        <p>${type === 'about' ? copy.aboutBody : copy.termsBody}</p>
      </section>
    `;
    modal.querySelector('.legal-modal__backdrop').addEventListener('click', closeModal);
    modal.querySelector('.legal-modal__close').addEventListener('click', closeModal);
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('is-open'));
  }

  function createFooter() {
    const copy = content[language()];
    const year = new Date().getFullYear();
    const footer = document.createElement('footer');
    footer.className = 'benefy-footer';
    footer.innerHTML = `
      <div class="benefy-footer__separator"><span></span></div>
      <div class="benefy-footer__content">
        <div class="benefy-footer__brand">
          <div class="benefy-footer__logos" aria-label="BENEFY">
            <img class="benefy-footer__logo benefy-footer__logo--light" src="/benefy-logo-black.png" alt="BENEFY">
            <img class="benefy-footer__logo benefy-footer__logo--dark" src="/benefy-logo-white.png" alt="" aria-hidden="true">
          </div>
          <p>${copy.tagline}</p>
        </div>
        <nav class="benefy-footer__nav" aria-label="Footer">
          <button type="button" data-footer-modal="about">${copy.about}</button>
          <button type="button" data-footer-modal="terms">${copy.terms}</button>
          <a href="mailto:${CONTACT_EMAIL}">${copy.contact}</a>
        </nav>
        <div class="benefy-footer__contact">
          <a class="benefy-footer__email" href="mailto:${CONTACT_EMAIL}">${mailIcon}<span>${CONTACT_EMAIL}</span></a>
          <a class="benefy-footer__social" href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer" aria-label="${copy.instagram}">${instagramIcon}</a>
        </div>
      </div>
      <div class="benefy-footer__bottom"><span>© ${year} BENEFY</span><span>${copy.rights}</span></div>
    `;
    footer.querySelector('[data-footer-modal="about"]').addEventListener('click', () => openModal('about'));
    footer.querySelector('[data-footer-modal="terms"]').addEventListener('click', () => openModal('terms'));
    return footer;
  }

  function sync() {
    const root = document.querySelector('#root > div');
    const hero = root?.querySelector('.hero-premium');
    const results = root?.querySelector('.results-premium');
    const existing = root?.querySelector(':scope > .benefy-footer');
    const searchVisible = hero && results && hero.dataset.featureHidden !== 'true' && results.dataset.featureHidden !== 'true';

    if (!searchVisible) {
      existing?.remove();
      return;
    }

    if (!existing) root.appendChild(createFooter());
  }

  sync();
  observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-feature-hidden', 'class', 'lang'] });

  return () => {
    observer?.disconnect();
    document.querySelector('.benefy-footer')?.remove();
    closeModal();
  };
}
