// Converts the existing header user block into an icon-triggered profile popover.
// Presentation-only enhancement. Existing logout behavior is preserved.
export function enableProfilePopover() {
  let observer;
  let closeHandlers = [];

  function enhance() {
    const user = document.querySelector('.topbar .user');
    if (!user || user.dataset.profileEnhanced === 'true') return;

    user.dataset.profileEnhanced = 'true';

    const email = Array.from(user.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent.trim())
      .filter(Boolean)
      .join(' ');

    const originalLogout = user.querySelector('button');
    const originalIcon = user.querySelector('svg');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'profile-menu__trigger';
    trigger.setAttribute('aria-label', email || 'Profile');
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = originalIcon
      ? originalIcon.outerHTML
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

    const popover = document.createElement('div');
    popover.className = 'profile-menu__popover';
    popover.setAttribute('role', 'menu');
    popover.hidden = true;

    const identity = document.createElement('div');
    identity.className = 'profile-menu__identity';
    identity.innerHTML = `<span class="profile-menu__avatar">${trigger.innerHTML}</span><span class="profile-menu__email"></span>`;
    identity.querySelector('.profile-menu__email').textContent = email || 'BENEFY';

    const logout = document.createElement('button');
    logout.type = 'button';
    logout.className = 'profile-menu__logout';
    logout.setAttribute('role', 'menuitem');
    logout.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Logout</span>';

    popover.append(identity, logout);
    user.replaceChildren(trigger, popover);
    user.classList.add('profile-menu');

    function setOpen(open) {
      popover.hidden = !open;
      user.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', String(open));
    }

    trigger.addEventListener('click', event => {
      event.stopPropagation();
      setOpen(popover.hidden);
    });

    logout.addEventListener('click', () => {
      setOpen(false);
      originalLogout?.click();
    });

    const outside = event => {
      if (!user.contains(event.target)) setOpen(false);
    };
    const escape = event => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', outside);
    document.addEventListener('keydown', escape);
    closeHandlers.push(() => document.removeEventListener('click', outside));
    closeHandlers.push(() => document.removeEventListener('keydown', escape));
  }

  enhance();
  observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer?.disconnect();
    closeHandlers.forEach(close => close());
    closeHandlers = [];
  };
}
