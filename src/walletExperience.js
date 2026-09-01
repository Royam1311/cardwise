// BENEFY Wallet Experience v2
// Reliable selected-only wallet using the existing App.jsx card buttons as the data/action source.
export function enableWalletExperience() {
  let observer;
  let intervalId;
  let refreshTimer;

  const getLabels = () => document.documentElement.lang === 'en' ? {
    add: 'Add cards', helper: 'Choose the cards and benefit clubs you use.',
    title: 'Add cards to your wallet', subtitle: 'Tap a card to add or remove it.',
    close: 'Close', selected: 'In wallet', available: 'Add'
  } : {
    add: 'הוסף כרטיסים', helper: 'בחר את הכרטיסים ומועדוני ההטבות שבהם אתה משתמש.',
    title: 'הוספת כרטיסים לארנק', subtitle: 'לחץ על כרטיס כדי להוסיף או להסיר אותו.',
    close: 'סגור', selected: 'בארנק', available: 'הוסף'
  };

  const getGrid = () => document.querySelector('.wallet-grid');
  const getCards = () => [...(getGrid()?.querySelectorAll('.wallet-card') || [])];
  const isSelected = card => card.classList.contains('is-selected');

  function makeAddTile() {
    const labels = getLabels();
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'wallet-add-card';
    tile.innerHTML = `
      <span class="wallet-add-card__art" aria-hidden="true">
        <span class="wallet-add-card__plus">+</span>
        <i></i><i></i>
      </span>
      <span class="wallet-add-card__copy"><strong>${labels.add}</strong><small>${labels.helper}</small></span>
    `;
    tile.addEventListener('click', openPicker);
    return tile;
  }

  function cardData(card) {
    return {
      name: card.querySelector('.wallet-card__brand strong')?.textContent?.trim() || '',
      subtitle: card.querySelector('.wallet-card__brand small')?.textContent?.trim() || '',
      themeClass: [...card.classList].find(value => value.startsWith('wallet-card--')) || '',
      selected: isSelected(card)
    };
  }

  function makePickerCard(sourceCard) {
    const labels = getLabels();
    const data = cardData(sourceCard);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `wallet-picker-card ${data.themeClass} ${data.selected ? 'is-selected' : ''}`;
    card.innerHTML = `
      <span class="wallet-picker-card__top"><span><strong></strong><small></small></span><b></b></span>
      <span class="wallet-picker-card__middle"><span class="wallet-picker-card__chip"><i></i><i></i><i></i><i></i></span><em>)))</em></span>
      <span class="wallet-picker-card__bottom">BENEFY WALLET •••• BENEFITS</span>
    `;
    card.querySelector('strong').textContent = data.name;
    card.querySelector('small').textContent = data.subtitle;
    card.querySelector('b').textContent = data.selected ? `✓ ${labels.selected}` : `+ ${labels.available}`;
    card.addEventListener('click', () => {
      sourceCard.click();
      window.setTimeout(() => {
        applyWalletView();
        renderPickerCards();
      }, 650);
    });
    return card;
  }

  function renderPickerCards() {
    const pickerGrid = document.querySelector('.wallet-picker__grid');
    if (!pickerGrid) return;
    pickerGrid.replaceChildren(...getCards().map(makePickerCard));
  }

  function closePicker() {
    const picker = document.querySelector('.wallet-picker');
    if (!picker) return;
    picker.classList.remove('is-open');
    window.setTimeout(() => picker.remove(), 220);
  }

  function openPicker() {
    document.querySelector('.wallet-picker')?.remove();
    const labels = getLabels();
    const picker = document.createElement('div');
    picker.className = 'wallet-picker';
    picker.innerHTML = `
      <button class="wallet-picker__backdrop" type="button" aria-label="${labels.close}"></button>
      <section class="wallet-picker__panel" role="dialog" aria-modal="true">
        <header><div><span>BENEFY WALLET</span><h2>${labels.title}</h2><p>${labels.subtitle}</p></div><button class="wallet-picker__close" type="button" aria-label="${labels.close}">×</button></header>
        <div class="wallet-picker__grid"></div>
      </section>
    `;
    picker.querySelector('.wallet-picker__backdrop').addEventListener('click', closePicker);
    picker.querySelector('.wallet-picker__close').addEventListener('click', closePicker);
    document.body.appendChild(picker);
    renderPickerCards();
    requestAnimationFrame(() => picker.classList.add('is-open'));
  }

  function applyWalletView() {
    const grid = getGrid();
    if (!grid) return;
    const cards = getCards();
    if (!cards.length) return;

    grid.dataset.selectedOnly = 'true';
    cards.forEach(card => card.dataset.owned = isSelected(card) ? 'true' : 'false');

    let tile = grid.querySelector('.wallet-add-card');
    if (!tile) {
      tile = makeAddTile();
      grid.appendChild(tile);
    }

    const selectedCount = cards.filter(isSelected).length;
    grid.dataset.empty = selectedCount === 0 ? 'true' : 'false';
  }

  function schedule() {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(applyWalletView, 30);
  }

  applyWalletView();
  observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  intervalId = window.setInterval(applyWalletView, 500);

  return () => {
    observer?.disconnect();
    window.clearInterval(intervalId);
    window.clearTimeout(refreshTimer);
    document.querySelector('.wallet-picker')?.remove();
  };
}
