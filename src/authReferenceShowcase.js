import './benefy-auth-reference.css';

let observer;

const cards = [
  ['max','MAX','M','#25282d','#07090b'],
  ['club','בהצדעה','ב','#a94f60','#6f2637'],
  ['ashmoret','אשמורת','א','#3198b2','#006075'],
  ['haver','חבר','ח','#3b8c68','#0d4934'],
  ['htz','הייטקזון','H','#6967e8','#38278c'],
  ['isracard','ישראכרט','I','#f1d16e','#c48d18']
];

function createDecor(auth) {
  if (auth.querySelector('.benefy-auth-decor')) return;
  const decor = document.createElement('div');
  decor.className = 'benefy-auth-decor';
  decor.setAttribute('aria-hidden', 'true');
  for (const [key, brand, mark, c1, c2] of cards) {
    const card = document.createElement('div');
    card.className = `benefy-auth-card benefy-auth-card--${key}`;
    card.style.setProperty('--c1', c1);
    card.style.setProperty('--c2', c2);
    card.innerHTML = `<span class="benefy-auth-card__brand"></span><span class="benefy-auth-card__mark"></span><span class="benefy-auth-card__chip"></span><span class="benefy-auth-card__caption">הטבה לחברי המועדון</span><span class="benefy-auth-card__footer">BENEFITS ••••</span>`;
    card.querySelector('.benefy-auth-card__brand').textContent = brand;
    card.querySelector('.benefy-auth-card__mark').textContent = mark;
    decor.appendChild(card);
  }
  for (const value of ['15%','18%','9%','25%','12%','28%']) {
    const percent = document.createElement('span');
    percent.className = 'benefy-auth-percent';
    percent.textContent = value;
    decor.appendChild(percent);
  }
  auth.prepend(decor);

  const controls = document.createElement('div');
  controls.className = 'benefy-auth-controls';
  controls.innerHTML = '<span>◔</span><span>EN</span><span>◎</span>';
  auth.appendChild(controls);
}

function scan() {
  const auth = document.querySelector('.auth');
  if (auth) createDecor(auth);
}

export function initAuthReferenceShowcase() {
  scan();
  observer?.disconnect();
  observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer?.disconnect();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthReferenceShowcase, { once: true });
} else {
  initAuthReferenceShowcase();
}
