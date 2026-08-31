// Enhances the existing React-managed user area with a profile popover.
// The original React logout button remains connected so its onClick handler
// continues to work for both Supabase sessions and demo mode.
export function enableProfilePopover() {
  let observer;
  let activeCleanup = null;

  function enhance() {
    const user = document.querySelector('.topbar .user');

    if (!user || user.dataset.profileEnhanced === 'true') return;

    const originalLogout = user.querySelector('button');
    if (!originalLogout) return;

    user.dataset.profileEnhanced = 'true';

    const email = Array.from(user.childNodes)
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent.trim())
      .filter(Boolean)
      .join(' ') || 'BENEFY';

    const originalUserIcon = user.querySelector(':scope > svg');
    const userIconMarkup = originalUserIcon
      ? originalUserIcon.outerHTML
      : '<span aria-hidden="true">&#128100;</span>';

    Array.from(user.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) node.textContent = '';
    });

    // Keep React-managed elements connected, but force them to be visually
    // hidden. The !important flag prevents global SVG/button CSS rules from
    // making the original inactive user icon visible beside the new trigger.
    if (originalUserIcon) {
      originalUserIcon.hidden = true;
      originalUserIcon.setAttribute('aria-hidden', 'true');
      originalUserIcon.style.setProperty('display', 'none', 'important');
    }

    originalLogout.hidden = true;
    originalLogout.tabIndex = -1;
    originalLogout.setAttribute('aria-hidden', 'true');
    originalLogout.style.setProperty('display', 'none', 'important');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'profile-menu__trigger';
    trigger.setAttribute('aria-label', email);
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = userIconMarkup;

    const popover = document.createElement('div');
    popover.className = 'profile-menu__popover';
    popover.setAttribute('role', 'menu');
    popover.hidden = true;

    const emailOption = document.createElement('div');
    emailOption.className = 'profile-menu__option profile-menu__email-option';
    emailOption.setAttribute('role', 'menuitem');

    const emailIcon = document.createElement('span');
    emailIcon.className = 'profile-menu__option-icon';
    emailIcon.setAttribute('aria-hidden', 'true');
    emailIcon.innerHTML = userIconMarkup;

    const emailText = document.createElement('span');
    emailText.className = 'profile-menu__email';
    emailText.textContent = email;

    emailOption.append(emailIcon, emailText);

    const logoutOption = document.createElement('button');
    logoutOption.type = 'button';
    logoutOption.className = 'profile-menu__option profile-menu__logout';
    logoutOption.setAttribute('role', 'menuitem');

    const logoutIcon = document.createElement('span');
    logoutIcon.className = 'profile-menu__option-icon';
    logoutIcon.setAttribute('aria-hidden', 'true');
    logoutIcon.textContent = '\u21AA';

    const logoutText = document.createElement('span');
    logoutText.textContent = document.documentElement.lang === 'en' ? 'Log out' : 'התנתק';

    logoutOption.append(logoutIcon, logoutText);
    popover.append(emailOption, logoutOption);
    user.append(trigger, popover);
    user.classList.add('profile-menu');

    function setOpen(open) {
      popover.hidden = !open;
      user.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', String(open));
    }

    function onTriggerClick(event) {
      event.stopPropagation();
      setOpen(popover.hidden);
    }

    function onLogoutClick(event) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      originalLogout.click();
    }

    function onOutsideClick(event) {
      if (!user.contains(event.target)) setOpen(false);
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.focus();
      }
    }

    trigger.addEventListener('click', onTriggerClick);
    logoutOption.addEventListener('click', onLogoutClick);
    document.addEventListener('click', onOutsideClick);
    document.addEventListener('keydown', onKeyDown);

    activeCleanup = () => {
      trigger.removeEventListener('click', onTriggerClick);
      logoutOption.removeEventListener('click', onLogoutClick);
      document.removeEventListener('click', onOutsideClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }

  enhance();

  observer = new MutationObserver(() => {
    const enhancedUser = document.querySelector('.topbar .user[data-profile-enhanced="true"]');
    if (!enhancedUser) {
      activeCleanup?.();
      activeCleanup = null;
      enhance();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer?.disconnect();
    activeCleanup?.();
    activeCleanup = null;
  };
}
