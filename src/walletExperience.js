// BENEFY Wallet Experience v3
// Selected cards only in the wallet, with an instant full-card picker interaction.
export function enableWalletExperience() {
  let observer;
  let intervalId;
  let refreshTimer;
  let pickerBusy = false;

  const getLabels = () => document.documentElement.lang === 'en' ? {
    add: 'Add cards', helper: 'Choose the cards and benefit clubs you use.',
    title: 'Add cards to your wallet', subtitle: 'Tap anywhere on a card to add or remove it instantly.',
    close: 'Close', selected: 'In wallet', available: 'Add', updating: 'Updating'
  } : {
    add: 'הוסף כרטיסים', helper: 'בחר את הכרטיסים ומועדוני ההטבות שבהם אתה משתמש.',
    title: 'הוספת כרטיסים לארנק', subtitle: 'לחץ בכל מקום על הכרטיס כדי להוסיף או להסיר אותו מיד.',
    close: 'סגור', selected: 'בארנק', available: 'הוסף', updating: 'מעדכן'
  };

  const getGrid = () => document.querySelector('.wallet-grid');
  const getCards = () => [...(getGrid()?.querySelectorAll(':scope > .wallet-card') || [])];
  const isSelected = card => card.classList.contains('is-selected');

  function makeAddTile() {
    const labels = getLabels();
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'wallet-add-card';
    tile.innerHTML = `
      <span class="wallet-add-card__art" aria-hidden="true"><span class="wallet-add-card__plus">+</span><i></i><i></i></span>
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

  function updatePickerCardVisual(card, selected, busy = false) {
    const labels = getLabels();
    card.classList.toggle('is-selected', selected);
    card.classList.toggle('is-updating', busy);
    card.setAttribute('aria-pressed', String(selected));
    const state = card.querySelector('.wallet-picker-card__state');
    if (state) state.innerHTML = busy
      ? `<span class="wallet-picker-card__spinner"></span>${labels.updating}`
      : selected
        ? `<span class="wallet-picker-card__check">✓</span>${labels.selected}`
        : `<span class="wallet-picker-card__plus">+</span>${labels.available}`;
  }

  function makePickerCard(sourceCard) {
    const data = cardData(sourceCard);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `wallet-picker-card ${data.themeClass}`;
    card.innerHTML = `
      <span class="wallet-picker-card__top"><span><strong></strong><small></small></span><b class="wallet-picker-card__state"></b></span>
      <span class="wallet-picker-card__middle"><span class="wallet-picker-card__chip"><i></i><i></i><i></i><i></i></span><em>)))</em></span>
      <span class="wallet-picker-card__bottom">BENEFY WALLET •••• BENEFITS</span>
      <span class="wallet-picker-card__flash" aria-hidden="true"></span>
    `;
    card.querySelector('strong').textContent = data.name;
    card.querySelector('small').textContent = data.subtitle;
    updatePickerCardVisual(card, data.selected);

    card.addEventListener('click', async () => {
      if (pickerBusy || card.classList.contains('is-updating')) return;
      pickerBusy = true;
      const nextSelected = !card.classList.contains('is-selected');

      // Immediate optimistic feedback on the full-card click.
      updatePickerCardVisual(card, nextSelected, true);
      card.classList.add('just-changed');
      window.setTimeout(() => card.classList.remove('just-changed'), 420);

      // Reuse the original React/Supabase action.
      sourceCard.click();

      // Reconcile with the real application state after the async update.
      window.setTimeout(() => {
        applyWalletView();
        const actualSelected = isSelected(sourceCard);
        updatePickerCardVisual(card, actualSelected, false);
        pickerBusy = false;
      }, 800);
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
      <section class="wallet-picker__panel" role="dialog" aria-modal="true" aria-labelledby="wallet-picker-title">
        <header><div><span>BENEFY WALLET</span><h2 id="wallet-picker-title">${labels.title}</h2><p>${labels.subtitle}</p></div><button class="wallet-picker__close" type="button" aria-label="${labels.close}">×</button></header>
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

    let tile = grid.querySelector(':scope > .wallet-add-card');
    if (!tile) {
      tile = makeAddTile();
      grid.appendChild(tile);
    }
    grid.dataset.empty = cards.some(isSelected) ? 'false' : 'true';
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
