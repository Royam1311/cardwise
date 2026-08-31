// BENEFY authentication showcase v7.
// Decorative only. No authentication, Supabase, pricing, or business logic changes.
export function enableAuthShowcase() {
  let observer;

  const cards = [
    { className: 'showcase-card--max', brand: 'MAX', detail: 'הטבה מותאמת', mark: 'M' },
    { className: 'showcase-card--haver', brand: 'חבר', detail: 'מחיר אישי', mark: 'ח' },
    { className: 'showcase-card--htz', brand: 'הייטקזון', detail: 'מועדון הטבות', mark: 'H' },
    { className: 'showcase-card--isracard', brand: 'ישראכרט', detail: 'הטבה חכמה', mark: 'I' },
    { className: 'showcase-card--ashmoret', brand: 'אשמורת', detail: 'הטבות לחברי המועדון', mark: 'א' },
    { className: 'showcase-card--behatsdaa', brand: 'בהצדעה', detail: 'הטבות לחברי המועדון', mark: 'ב' }
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
      item.className = `auth-showcase__card auth-showcase__card--credit ${card.className}`;
      item.innerHTML = `
        <span class="auth-showcase__credit-top">
          <strong>${card.brand}</strong>
          <span class="auth-showcase__mark">${card.mark}</span>
        </span>
        <span class="auth-showcase__credit-middle">
          ${chipMarkup()}
          <span class="auth-showcase__contactless">)))</span>
        </span>
        <span class="auth-showcase__credit-bottom">
          <small>${card.detail}</small>
          <b>•••• BENEFITS</b>
        </span>
      `;
      showcase.appendChild(item);
    });

    auth.append(saleCloud, showcase);
  }

  enhance();
  observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => observer?.disconnect();
}
