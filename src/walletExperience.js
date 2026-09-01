// BENEFY Wallet Experience
// Shows only selected cards in the wallet and opens all available cards in a polished picker.
// Existing App.jsx toggle logic and Supabase persistence remain the source of truth.
export function enableWalletExperience() {
  let observer;
  let refreshTimer;

  const isEnglish = () => document.documentElement.lang === 'en';
  const text = () => isEnglish() ? {
    add: 'Add cards', title: 'Add cards to your wallet', subtitle: 'Select the cards and benefit clubs you actually use.',
    close: 'Close', selected: 'In wallet', available: 'Add', empty: 'Your wallet is empty', emptyText: 'Add cards to calculate your personalized price.'
  } : {
    add: 'הוסף כרטיסים', title: 'הוספת כרטיסים לארנק', subtitle: 'בחר את הכרטיסים ומועדוני ההטבות שבהם אתה באמת משתמש.',
    close: 'סגור', selected: 'בארנק', available: 'הוסף', empty: 'הארנק שלך עדיין ריק', emptyText: 'הוסף כרטיסים כדי לחשב את המחיר האישי שלך.'
  };

  function cardInfo(card) {
    return {
      selected: card.classList.contains('is-selected'),
      name: card.querySelector('.wallet-card__brand strong')?.textContent?.trim() || '',
      subtitle: card.querySelector('.wallet-card__brand small')?.textContent?.trim() || '',
      className: [...card.classList].find(name => name.startsWith('wallet-card--')) || 'wallet-card--default'
    };
  }

  function createAddTile() {
    const labels = text();
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'wallet-add-card';
    tile.innerHTML = `
      <span class="wallet-add-card__art" aria-hidden="true">
        <span class="wallet-add-card__plus">+</span>
        <span class="wallet-add-card__line"></span>
        <span class="wallet-add-card__line wallet-add-card__line--short"></span>
      </span>
      <span class="wallet-add-card__copy">
        <strong>${labels.add}</strong>
        <small>${labels.emptyText}</small>
      </span>
    `;
    tile.addEventListener('click', openPicker);
    return tile;
  }

  function buildPickerCard(sourceCard) {
    const labels = text();
    const info = cardInfo(sourceCard);
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `wallet-picker-card ${info.className} ${info.selected ? 'is-selected' : ''}`;
    item.innerHTML = `
      <span class="wallet-picker-card__top">
        <span class="wallet-picker-card__name"><strong></strong><small></small></span>
        <span class="wallet-picker-card__state">${info.selected ? '✓ ' + labels.selected : '+ ' + labels.available}</span>
      </span>
      <span class="wallet-picker-card__chip" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      <span class="wallet-picker-card__bottom">BENEFY WALLET •••• BENEFITS</span>
    `;
    item.querySelector('strong').textContent = info.name;
    item.querySelector('small').textContent = info.subtitle;
    item.addEventListener('click', () => {
      sourceCard.click();
      item.classList.toggle('is-selected');
      const nowSelected = item.classList.contains('is-selected');
      item.querySelector('.wallet-picker-card__state').textContent = nowSelected ? '✓ ' + labels.selected : '+ ' + labels.available;
      window.setTimeout(() => {
        enhance();
        rebuildPicker();
      }, 450);
    });
    return item;
  }

  function rebuildPicker() {
    const modal = document.querySelector('.wallet-picker');
    const originalGrid = document.querySelector('.wallet-grid');
    if (!modal || !originalGrid) return;
    const pickerGrid = modal.querySelector('.wallet-picker__grid');
    pickerGrid.replaceChildren(...[...originalGrid.querySelectorAll(':scope > .wallet-card')].map(buildPickerCard));
  }

  function openPicker() {
    document.querySelector('.wallet-picker')?.remove();
    const labels = text();
    const originalGrid = document.querySelector('.wallet-grid');
    if (!originalGrid) return;

    const modal = document.createElement('div');
    modal.className = 'wallet-picker';
    modal.innerHTML = `
      <div class="wallet-picker__backdrop"></div>
      <section class="wallet-picker__panel" role="dialog" aria-modal="true" aria-labelledby="wallet-picker-title">
        <header class="wallet-picker__header">
          <div><span class="wallet-picker__eyebrow">BENEFY WALLET</span><h2 id="wallet-picker-title">${labels.title}</h2><p>${labels.subtitle}</p></div>
          <button type="button" class="wallet-picker__close" aria-label="${labels.close}">×</button>
        </header>
        <div class="wallet-picker__grid"></div>
      </section>
    `;

    const close = () => {
      modal.classList.add('is-closing');
      window.setTimeout(() => modal.remove(), 220);
    };
    modal.querySelector('.wallet-picker__backdrop').addEventListener('click', close);
    modal.querySelector('.wallet-picker__close').addEventListener('click', close);
    const escape = event => {
      if (event.key === 'Escape') {
        document.removeEventListener('keydown', escape);
        close();
      }
    };
    document.addEventListener('keydown', escape);
    document.body.appendChild(modal);
    rebuildPicker();
    requestAnimationFrame(() => modal.classList.add('is-open'));
  }

  function enhance() {
    const grid = document.querySelector('.wallet-grid');
    if (!grid) return;

    const cards = [...grid.querySelectorAll(':scope > .wallet-card')];
    if (!cards.length) return;
    grid.classList.add('wallet-grid--owned-only');

    cards.forEach(card => {
      const selected = card.classList.contains('is-selected');
      card.classList.toggle('wallet-card--owned', selected);
      card.classList.toggle('wallet-card--catalog-only', !selected);
    });

    let addTile = grid.querySelector(':scope > .wallet-add-card');
    if (!addTile) {
      addTile = createAddTile();
      grid.appendChild(addTile);
    }

    const selectedCount = cards.filter(card => card.classList.contains('is-selected')).length;
    grid.classList.toggle('is-empty-wallet', selectedCount === 0);
  }

  function scheduleEnhance() {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(enhance, 40);
  }

  enhance();
  observer = new MutationObserver(scheduleEnhance);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  return () => {
    observer?.disconnect();
    window.clearTimeout(refreshTimer);
    document.querySelector('.wallet-picker')?.remove();
  };
}
