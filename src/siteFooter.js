// BENEFY premium footer v3.
// Visible only on the Search page. Facebook and LinkedIn remain disabled until URLs are provided.
export function enableSiteFooter() {
  let observer;
  const INSTAGRAM_URL = 'https://www.instagram.com/benefy.il?igsi=MTc4bXluZ2NscGVw';
  const CONTACT_EMAIL = 'benefymail@gmail.com';

  const translations = {
    he: {
      company: 'חברה', legal: 'משפטי', support: 'תמיכה', about: 'אודות',
      terms: 'תנאי שימוש', privacy: 'פרטיות', contact: 'צור קשר',
      rights: 'כל הזכויות שמורות.', comingSoon: 'בקרוב', close: 'סגור',
      aboutTitle: 'אודות BENEFY',
      aboutBody: 'BENEFY מרכזת במקום אחד את הכרטיסים, מועדוני ההטבות והמחירים, כדי לעזור למצוא את המחיר האישי והרלוונטי לכל קנייה.',
      termsTitle: 'תנאי שימוש',
      termsBody: 'השימוש באתר כפוף לתנאים המוצגים כאן. מחירים, מלאי והטבות עשויים להשתנות, והמחיר הקובע הוא המחיר המוצג באתר החנות בעת הרכישה.',
      privacyTitle: 'מדיניות פרטיות',
      privacyBody: 'BENEFY שומרת רק את בחירות ההטבות והכרטיסים הנדרשות להתאמת המחיר. BENEFY אינה שומרת מספרי כרטיס, CVV או פרטי תשלום רגישים.'
    },
    en: {
      company: 'Company', legal: 'Legal', support: 'Support', about: 'About',
      terms: 'Terms of Use', privacy: 'Privacy', contact: 'Contact',
      rights: 'All rights reserved.', comingSoon: 'Coming soon', close: 'Close',
      aboutTitle: 'About BENEFY',
      aboutBody: 'BENEFY brings cards, benefit clubs and prices together to help users find a relevant personal price for every purchase.',
      termsTitle: 'Terms of Use',
      termsBody: 'Use of the site is subject to these terms. Prices, availability and benefits may change, and the binding price is the retailer price shown at checkout.',
      privacyTitle: 'Privacy Policy',
      privacyBody: 'BENEFY stores only benefit and card-program selections required for personalized pricing. BENEFY does not store card numbers, CVV codes or sensitive payment details.'
    }
  };

  const icons = {
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4.3c-.5-.1-2.2-.3-4.1-.3C9 4 7 6.1 7 10v2H4v4h3v8h4v-8h3.1l.9-4h-4v-1.6C11 8.8 11.4 8 14 8Z" fill="currentColor"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="9" width="4" height="12" rx="1" fill="currentColor"/><circle cx="5" cy="5" r="2" fill="currentColor"/><path d="M10 9h4v1.7c1-1.4 2.4-2.2 4.2-2.2 3.2 0 4.8 2.1 4.8 6.1V21h-4v-5.7c0-2-.7-3.1-2.2-3.1-1.8 0-2.8 1.2-2.8 3.6V21h-4V9Z" fill="currentColor"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  const language = () => document.documentElement.lang === 'en' ? 'en' : 'he';

  function closeModal() {
    const modal = document.querySelector('.legal-modal');
    if (!modal) return;
    modal.classList.remove('is-open');
    window.setTimeout(() => modal.remove(), 200);
  }

  function openModal(type) {
    closeModal();
    const copy = translations[language()];
    const modal = document.createElement('div');
    modal.className = 'legal-modal';
    modal.innerHTML = `<button class="legal-modal__backdrop" type="button" aria-label="${copy.close}"></button><section class="legal-modal__panel" role="dialog" aria-modal="true"><button class="legal-modal__close" type="button" aria-label="${copy.close}">×</button><span class="legal-modal__eyebrow">BENEFY</span><h2>${copy[`${type}Title`]}</h2><p>${copy[`${type}Body`]}</p></section>`;
    modal.querySelector('.legal-modal__backdrop').addEventListener('click', closeModal);
    modal.querySelector('.legal-modal__close').addEventListener('click', closeModal);
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('is-open'));
  }

  function modalButton(label, type) {
    return `<button type="button" data-footer-modal="${type}">${label}</button>`;
  }

  function createFooter() {
    const lang = language();
    const copy = translations[lang];
    const year = new Date().getFullYear();
    const footer = document.createElement('footer');
    footer.className = `benefy-footer benefy-footer--${lang}`;
    footer.dir = lang === 'he' ? 'rtl' : 'ltr';
    footer.innerHTML = `
      <div class="benefy-footer__separator"><span></span></div>
      <div class="benefy-footer__main">
        <div class="benefy-footer__columns">
          <section><h3>${copy.company}</h3>${modalButton(copy.about, 'about')}</section>
          <section><h3>${copy.legal}</h3>${modalButton(copy.terms, 'terms')}${modalButton(copy.privacy, 'privacy')}</section>
          <section><h3>${copy.support}</h3><a href="mailto:${CONTACT_EMAIL}">${copy.contact}</a></section>
        </div>
        <div class="benefy-footer__social-side">
          <div class="benefy-footer__logos" aria-label="BENEFY">
            <img class="benefy-footer__logo benefy-footer__logo--light" src="/benefy-logo-black.png" alt="BENEFY">
            <img class="benefy-footer__logo benefy-footer__logo--dark" src="/benefy-logo-white.png" alt="" aria-hidden="true">
          </div>
          <div class="benefy-footer__socials">
            <a href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer" aria-label="Instagram">${icons.instagram}</a>
            <button type="button" disabled title="${copy.comingSoon}" aria-label="Facebook - ${copy.comingSoon}">${icons.facebook}</button>
            <button type="button" disabled title="${copy.comingSoon}" aria-label="LinkedIn - ${copy.comingSoon}">${icons.linkedin}</button>
            <a href="mailto:${CONTACT_EMAIL}" aria-label="Email">${icons.mail}</a>
          </div>
        </div>
      </div>
      <div class="benefy-footer__bottom"><span>© ${year} BENEFY. ${copy.rights}</span><span class="benefy-footer__status"><i></i> BENEFY Online</span></div>
    `;
    footer.querySelectorAll('[data-footer-modal]').forEach(button => button.addEventListener('click', () => openModal(button.dataset.footerModal)));
    return footer;
  }

  function sync() {
    const root = document.querySelector('#root > div');
    const hero = root?.querySelector('.hero-premium');
    const results = root?.querySelector('.results-premium');
    const existing = root?.querySelector(':scope > .benefy-footer');
    const searchVisible = hero && results && hero.dataset.featureHidden !== 'true' && results.dataset.featureHidden !== 'true';
    if (!searchVisible) return existing?.remove();
    if (!existing) root.appendChild(createFooter());
  }

  sync();
  observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-feature-hidden', 'class', 'lang'] });
  return () => { observer?.disconnect(); document.querySelector('.benefy-footer')?.remove(); closeModal(); };
}
