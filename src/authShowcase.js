// BENEFY authentication showcase v4.
// Decorative only. No authentication, Supabase, pricing, or business logic changes.
export function enableAuthShowcase() {
  let observer;

  const cards = [
    { className: 'showcase-card--max', brand: 'MAX', detail: 'הטבה מותאמת', mark: 'M', type: 'credit' },
    { className: 'showcase-card--haver', brand: 'חבר', detail: 'מחיר אישי', mark: 'ח', type: 'credit' },
    { className: 'showcase-card--htz', brand: 'הייטקזון', detail: 'מועדון הטבות', mark: 'H', type: 'credit' },
    { className: 'showcase-card--isracard', brand: 'ישראכרט', detail: 'הטבה חכמה', mark: 'I', type: 'credit' },
    { className: 'showcase-card--discount', brand: '12%', detail: 'דוגמת הנחה', mark: '%', type: 'offer' },
    { className: 'showcase-card--cashback', brand: 'Cashback', detail: 'דוגמת החזר עד 10%', mark: '↙', type: 'offer' },
    { className: 'showcase-card--benefys', brand: "Benefy's", detail: 'הטבות במקום אחד', mark: 'B', type: 'offer' },
    { className: 'showcase-card--best', brand: 'המחיר שלך', detail: 'אחרי כל ההטבות', mark: '✓', type: 'offer' }
  ];

  const percentages = ['8%', '10%', '12%', '15%', '18%', '20%', '25%', '30%', '7%', '22%', '14%', '9%', '16%', '11%', '28%', '5%', '17%', '24%'];

  function chipMarkup() {
    return '<span class="auth-showcase__chip" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
  }

  function enhance() {
    const auth = document.querySelector('.auth');
    if (!auth || auth.querySelector('.auth-showcase')) return;

    const saleCloud = document.createElement('div');
    saleCloud.className = 'auth-sale-cloud';
    saleCloud.setAttribute('aria-hidden', 'true');
    percentages.forEach((value, index) => {
      const item = document.createElement('span');
      item.className = `auth-sale-cloud__item auth-sale-cloud__item--${index + 1}`;
      item.textContent = value;
      saleCloud.appendChild(item);
    });

    const showcase = document.createElement('div');
    showcase.className = 'auth-showcase';
    showcase.setAttribute('aria-hidden', 'true');

    cards.forEach(card => {
      const item = document.createElement('div');
      item.className = `auth-showcase__card ${card.className} auth-showcase__card--${card.type}`;
      if (card.type === 'credit') {
        item.innerHTML = `
          <span class="auth-showcase__credit-top"><strong>${card.brand}</strong><span class="auth-showcase__mark">${card.mark}</span></span>
          <span class="auth-showcase__credit-middle">${chipMarkup()}<span class="auth-showcase__contactless">)))</span></span>
          <span class="auth-showcase__credit-bottom"><small>${card.detail}</small><b>•••• BENEFITS</b></span>
        `;
      } else {
        item.innerHTML = `
          <span class="auth-showcase__offer-icon">${card.mark}</span>
          <span class="auth-showcase__offer-copy"><strong>${card.brand}</strong><small>${card.detail}</small></span>
          <span class="auth-showcase__example">דוגמה</span>
        `;
      }
      showcase.appendChild(item);
    });

    auth.append(saleCloud, showcase);
  }

  enhance();
  observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer?.disconnect();
}
