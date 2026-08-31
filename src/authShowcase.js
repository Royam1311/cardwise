// BENEFY authentication showcase v6.
// Decorative only. No authentication, Supabase, pricing, or business logic changes.
export function enableAuthShowcase() {
  let observer;
  let stopped = false;
  const timers = new Set();

  const cards = [
    { className: 'showcase-card--max', brand: 'MAX', detail: 'הטבה מותאמת', mark: 'M', rangeX: 34, rangeY: 42, rotate: 4 },
    { className: 'showcase-card--haver', brand: 'חבר', detail: 'מחיר אישי', mark: 'ח', rangeX: 48, rangeY: 50, rotate: 5 },
    { className: 'showcase-card--htz', brand: 'הייטקזון', detail: 'מועדון הטבות', mark: 'H', rangeX: 42, rangeY: 34, rotate: 4 },
    { className: 'showcase-card--isracard', brand: 'ישראכרט', detail: 'הטבה חכמה', mark: 'I', rangeX: 38, rangeY: 42, rotate: 4 },
    { className: 'showcase-card--ashmoret', brand: 'אשמורת', detail: 'הטבות לחברי המועדון', mark: 'א', rangeX: 54, rangeY: 56, rotate: 6 },
    { className: 'showcase-card--behatsdaa', brand: 'בהצדעה', detail: 'הטבות לחברי המועדון', mark: 'ב', rangeX: 38, rangeY: 46, rotate: 5 }
  ];

  const percentages = ['8%', '10%', '12%', '15%', '18%', '20%', '25%', '30%', '7%', '22%', '14%', '9%', '16%', '11%', '28%', '5%', '17%', '24%'];

  const randomBetween = (min, max) => Math.random() * (max - min) + min;

  function chipMarkup() {
    return '<span class="auth-showcase__chip" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
  }

  function scheduleWander(element, settings) {
    if (stopped || !element.isConnected) return;

    const duration = Math.round(randomBetween(3600, 6800));
    const x = Math.round(randomBetween(-settings.rangeX, settings.rangeX));
    const y = Math.round(randomBetween(-settings.rangeY, settings.rangeY));
    const rotation = randomBetween(-settings.rotate, settings.rotate).toFixed(2);
    const scale = randomBetween(.985, 1.025).toFixed(3);

    element.style.setProperty('--wander-x', `${x}px`);
    element.style.setProperty('--wander-y', `${y}px`);
    element.style.setProperty('--wander-rotate', `${rotation}deg`);
    element.style.setProperty('--wander-scale', scale);
    element.style.setProperty('--wander-duration', `${duration}ms`);

    const timer = window.setTimeout(() => {
      timers.delete(timer);
      scheduleWander(element, settings);
    }, duration + 120);
    timers.add(timer);
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

    cards.forEach((card, index) => {
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

      const initialTimer = window.setTimeout(() => {
        timers.delete(initialTimer);
        scheduleWander(item, card);
      }, 250 + index * 170);
      timers.add(initialTimer);
    });

    auth.append(saleCloud, showcase);
  }

  enhance();
  observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    stopped = true;
    observer?.disconnect();
    timers.forEach(timer => window.clearTimeout(timer));
    timers.clear();
  };
}
