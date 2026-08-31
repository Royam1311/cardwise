// Adds decorative BENEFY benefit cards to the authentication gateway.
// Visual enhancement only. No authentication or application logic changes.
export function enableAuthShowcase() {
  let observer;

  const cards = [
    { className: 'showcase-card--max', title: 'MAX', subtitle: 'הטבה מותאמת', icon: 'M' },
    { className: 'showcase-card--haver', title: 'חבר', subtitle: 'מחיר אישי', icon: 'ח' },
    { className: 'showcase-card--htz', title: 'הייטקזון', subtitle: 'מועדון הטבות', icon: 'H' },
    { className: 'showcase-card--cashback', title: 'Cashback', subtitle: 'החזר מותאם', icon: '↙' },
    { className: 'showcase-card--discount', title: 'הנחה אישית', subtitle: 'לפי הארנק שלך', icon: '%' },
    { className: 'showcase-card--benefys', title: "Benefy's", subtitle: 'הטבות במקום אחד', icon: 'B' }
  ];

  function enhance() {
    const auth = document.querySelector('.auth');
    if (!auth || auth.querySelector('.auth-showcase')) return;

    const showcase = document.createElement('div');
    showcase.className = 'auth-showcase';
    showcase.setAttribute('aria-hidden', 'true');

    cards.forEach(card => {
      const item = document.createElement('div');
      item.className = `auth-showcase__card ${card.className}`;
      item.innerHTML = `
        <span class="auth-showcase__icon">${card.icon}</span>
        <span class="auth-showcase__copy">
          <strong>${card.title}</strong>
          <small>${card.subtitle}</small>
        </span>
      `;
      showcase.appendChild(item);
    });

    auth.appendChild(showcase);
  }

  enhance();
  observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => observer?.disconnect();
}
