import React, { useEffect, useState } from 'react';
import {
  Search, CreditCard, LogOut, Plus, Trash2, ShieldCheck, Sparkles,
  User, Tag, Settings, Store, Package, Percent, Check, Wifi,
  ExternalLink, ImageOff, RefreshCw
} from 'lucide-react';
import { supabase, configured } from './supabase';

const FALLBACK_CARDS = [
  ['visa', 'Visa רגיל'], ['tav', 'תו הזהב'], ['htz', 'הייטקזון'],
  ['max', 'MAX'], ['isracard', 'ישראכרט'], ['haver', 'חבר'],
  ['behatsdaa', 'בהצדעה']
];

const CARD_META = {
  visa: ['VISA', 'PERSONAL CREDIT', 'visa', 'V'],
  max: ['MAX', 'PREMIUM CREDIT', 'max', 'M'],
  haver: ['חבר', 'CONSUMER CLUB', 'haver', 'ח'],
  isracard: ['ישראכרט', 'PERSONAL CREDIT', 'isracard', 'י'],
  htz: ['הייטקזון', 'TECH BENEFITS', 'htz', 'H'],
  tav: ['תו הזהב', 'GIFT BENEFITS', 'tav', 'ת'],
  behatsdaa: ['בהצדעה', 'CONSUMER CLUB', 'behatsdaa', 'ב']
};

const money = value => new Intl.NumberFormat('he-IL', {
  style: 'currency', currency: 'ILS', maximumFractionDigits: 0
}).format(Number(value || 0));

function Auth({ onDemo }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setMsg('');
    if (!configured) return setMsg('חסרים משתני חיבור ל-Supabase.');
    setBusy(true);
    const { error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    setMsg(error ? error.message : mode === 'login' ? 'התחברת בהצלחה' : 'נשלח אליך אימייל לאישור.');
  }

  return <main className="auth">
    <section className="brand-panel">
      <div className="logo"><CreditCard /> BENEFY</div>
      <h1>המחיר שמתאים דווקא לך</h1>
      <p>השוואת מחירים והטבות לפי הכרטיסים והמועדונים שלך.</p>
      <div className="feature"><ShieldCheck /> אין צורך להזין מספר כרטיס או CVV</div>
    </section>
    <section className="auth-card">
      <h2>{mode === 'login' ? 'כניסה לחשבון' : 'יצירת חשבון'}</h2>
      <form onSubmit={submit}>
        <label>אימייל<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
        <label>סיסמה<input type="password" minLength="6" value={password} onChange={e => setPassword(e.target.value)} required /></label>
        <button className="primary" disabled={busy}>{busy ? 'טוען...' : mode === 'login' ? 'כניסה' : 'הרשמה'}</button>
      </form>
      {msg && <div className="notice">{msg}</div>}
      <button className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'אין לך חשבון? הרשמה' : 'כבר נרשמת? כניסה'}</button>
      <button className="demo" onClick={onDemo}>כניסה לגרסת הדגמה</button>
    </section>
  </main>;
}

function WalletCard({ code, name, selected, onToggle }) {
  const [label, subtitle, theme, monogram] = CARD_META[code] || [name, 'BENEFIT PROGRAM', 'default', name?.[0] || '?'];
  return <button type="button" className={`wallet-card wallet-card--${theme} ${selected ? 'is-selected' : ''}`} onClick={onToggle}>
    <span className="wallet-card__shine" />
    <span className="wallet-card__top">
      <span className="wallet-card__brand"><span className="wallet-card__monogram">{monogram}</span><span><strong>{label}</strong><small>{subtitle}</small></span></span>
      <span className={`wallet-card__status ${selected ? 'is-active' : ''}`}>{selected ? <><Check /> פעיל</> : 'זמין'}</span>
    </span>
    <span className="wallet-card__middle"><span className="wallet-card__chip"><i /><i /><i /><i /></span><Wifi /></span>
    <span className="wallet-card__bottom"><span><small>BENEFY WALLET</small><strong>•••• BENEFITS</strong></span><span className="wallet-card__action">{selected ? <Trash2 /> : <Plus />}{selected ? 'הסר' : 'הוסף'}</span></span>
  </button>;
}

function ProductVisual({ image, name }) {
  const [failed, setFailed] = useState(false);
  if (!image || failed) return <div className="product-visual product-visual--empty"><ImageOff /><span>תמונה תתווסף מהמקור</span></div>;
  return <div className="product-visual"><img src={image} alt={name} onError={() => setFailed(true)} loading="eager" /></div>;
}

function Admin() {
  const [counts, setCounts] = useState({ products: 0, stores: 0, benefits: 0 });
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    const [p, s, b] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('stores').select('*', { count: 'exact', head: true }),
      supabase.from('benefit_rules').select('*', { count: 'exact', head: true })
    ]);
    setCounts({ products: p.count || 0, stores: s.count || 0, benefits: b.count || 0 });
    setBusy(false);
  }
  useEffect(() => { load(); }, []);
  const items = [
    [Package, 'מוצרים', counts.products], [Store, 'חנויות', counts.stores], [Percent, 'הטבות', counts.benefits]
  ];
  return <section className="page admin-overview">
    <div className="page-title"><div><h1>פאנל ניהול</h1><p>תצוגת מצב של BENEFY.</p></div><button className="secondary" onClick={load}><RefreshCw className={busy ? 'spin' : ''} />רענון</button></div>
    <div className="admin-cards">{items.map(([Icon, label, count]) => <article key={label}><Icon /><span>{label}</span><strong>{count}</strong></article>)}</div>
  </section>;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [demo, setDemo] = useState(false);
  const [cards, setCards] = useState([]);
  const [cardCatalog, setCardCatalog] = useState(FALLBACK_CARDS);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('search');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [product, setProduct] = useState(null);
  const [offers, setOffers] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) { loadUser(); loadCatalog(); }
    else if (demo) setCards(['visa', 'tav', 'htz']);
  }, [session, demo]);

  async function loadUser() {
    const [{ data: cardData }, { data: profileData }] = await Promise.all([
      supabase.from('cards').select('card_code,card_type').eq('active', true).order('created_at'),
      supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
    ]);
    setCards((cardData || []).map(x => x.card_code || x.card_type).filter(Boolean));
    setIsAdmin(profileData?.role === 'admin');
  }

  async function loadCatalog() {
    const { data } = await supabase.from('card_programs').select('code,display_name').eq('active', true).order('display_name');
    if (data?.length) setCardCatalog(data.map(x => [x.code, x.display_name]));
  }

  async function toggleCard(code) {
    if (demo) return setCards(current => current.includes(code) ? current.filter(x => x !== code) : [...current, code]);
    if (cards.includes(code)) await supabase.from('cards').delete().eq('user_id', session.user.id).eq('card_code', code);
    else {
      const program = cardCatalog.find(x => x[0] === code);
      await supabase.from('cards').insert({ user_id: session.user.id, card_code: code, card_type: code, card_name: program?.[1] || code, active: true });
    }
    loadUser();
  }

  async function inspectOfferImage(productUrl) {
    if (!productUrl) return null;
    try {
      const response = await fetch(`/api/inspect-product?url=${encodeURIComponent(productUrl)}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data?.product?.image || null;
    } catch { return null; }
  }

  async function searchProducts(event) {
    event?.preventDefault();
    const term = query.trim();
    setHasSearched(true); setSearchError(''); setProduct(null); setOffers([]);
    if (!term) return setSearchError('יש להזין שם מוצר או מק״ט.');
    if (!configured || demo) return setSearchError('החיפוש האמיתי זמין לאחר התחברות ל-Supabase.');
    setSearching(true);

    const { data: found, error: pError } = await supabase.from('products').select('id,product_name,sku,category,image_url').eq('active', true).or(`product_name.ilike.%${term}%,sku.ilike.%${term}%,category.ilike.%${term}%`).limit(1);
    if (pError || !found?.length) { setSearching(false); return setSearchError(pError?.message || 'לא נמצא מוצר מתאים.'); }

    const foundProduct = found[0];
    const { data: priceRows, error: priceError } = await supabase.from('prices').select('id,store_id,price,shipping,updated_at,product_url').eq('product_id', foundProduct.id).eq('active', true);
    if (priceError) { setSearching(false); return setSearchError(priceError.message); }

    const storeIds = [...new Set((priceRows || []).map(x => x.store_id).filter(Boolean))];
    const { data: storeRows } = storeIds.length ? await supabase.from('stores').select('id,store_name,website').in('id', storeIds) : { data: [] };
    let benefitRows = [];
    if (storeIds.length && cards.length) {
      const { data } = await supabase.from('benefit_rules').select('*').in('program_code', cards).in('store_id', storeIds).eq('active', true);
      benefitRows = data || [];
    }

    const imageFromSource = foundProduct.image_url || await inspectOfferImage(priceRows?.[0]?.product_url);
    setProduct({ ...foundProduct, image_url: imageFromSource });
    const now = Date.now();
    const activeRule = rule => (!rule.start_date || new Date(rule.start_date).getTime() <= now) && (!rule.end_date || new Date(rule.end_date).getTime() >= now);
    const calc = (price, rule) => {
      const value = Number(rule.discount_value || 0);
      if (!value || price < Number(rule.min_purchase || 0)) return null;
      if (rule.benefit_type === 'special_price') return { saving: Math.max(0, price - value), checkout: value, effective: value };
      let saving = rule.discount_unit === 'percent' ? price * value / 100 : value;
      const cap = Number(rule.max_discount_cap || 0); if (cap > 0) saving = Math.min(saving, cap);
      saving = Math.max(0, Math.min(saving, price));
      const deferred = ['cashback', 'loaded_card', 'voucher'].includes(rule.benefit_type);
      return { saving, checkout: deferred ? price : price - saving, effective: price - saving };
    };

    const combined = (priceRows || []).map(row => {
      const store = (storeRows || []).find(x => x.id === row.store_id);
      const price = Number(row.price || 0); const shipping = Number(row.shipping || 0);
      const best = benefitRows.filter(r => r.store_id === row.store_id && activeRule(r)).map(rule => ({ rule, result: calc(price, rule) })).filter(x => x.result).sort((a, b) => a.result.effective - b.result.effective)[0];
      const effective = best?.result.effective ?? price;
      const programName = best ? (cardCatalog.find(x => x[0] === best.rule.program_code)?.[1] || best.rule.program_code) : null;
      return {
        id: row.id, store: store?.store_name || 'חנות', website: row.product_url || store?.website || null,
        image: imageFromSource, price, shipping, effective, checkout: best?.result.checkout ?? price,
        total: effective + shipping, saving: best?.result.saving || 0, benefit: best?.rule || null,
        note: best ? `${programName}: ${best.rule.title || 'הטבה פעילה'}` : 'מחיר בסיס, ללא הטבה פעילה'
      };
    }).sort((a, b) => a.total - b.total);
    setOffers(combined);
    if (!combined.length) setSearchError('המוצר נמצא, אך עדיין אין עבורו מחירים פעילים.');
    setSearching(false);
  }

  if (loading) return <div className="center">טוען...</div>;
  if (!session && !demo) return <Auth onDemo={() => setDemo(true)} />;
  const email = session?.user?.email || 'משתמש הדגמה';
  const tabs = [[Search, 'search', 'חיפוש'], [CreditCard, 'cards', 'הארנק שלי'], ...(isAdmin ? [[Settings, 'admin', 'ניהול']] : [])];

  return <div dir="rtl">
    <header className="topbar">
      <div className="logo dark">BENEFY <CreditCard /></div>
      <nav className="nav-3d">{tabs.map(([Icon, key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}><span className="nav-icon"><Icon /></span><span>{label}</span></button>)}</nav>
      <div className="user"><User />{email}<button onClick={() => session ? supabase.auth.signOut() : setDemo(false)}><LogOut /></button></div>
    </header>

    {tab === 'admin' ? <Admin /> : tab === 'cards' ?
      <section className="page wallet-page">
        <div className="wallet-heading"><div><h1>הארנק שלי</h1><p>בחר את הכרטיסים והמועדונים שלך. BENEFY יחשב את המחיר האישי.</p></div><div className="wallet-counter"><CreditCard /><strong>{cards.length}</strong> תוכניות פעילות</div></div>
        <div className="wallet-grid">{cardCatalog.map(([code, name]) => <WalletCard key={code} code={code} name={name} selected={cards.includes(code)} onToggle={() => toggleCard(code)} />)}</div>
      </section> : <>
        <section className="hero hero-premium"><span><Sparkles />השוואת המחיר האישי שלך</span><h1>מוצאים את העסקה שבאמת<br />הכי משתלמת עבורך</h1><form onSubmit={searchProducts}><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="לדוגמה: iPhone, IVIPH17PORESIM או טלפונים" /><button type="submit" className="primary search-3d" disabled={searching}>{searching ? 'מחפש...' : 'השווה מחירים'}</button></form></section>
        <section className="page results results-premium">
          {searchError && <div className="warning full-row">{searchError}</div>}
          {!hasSearched && <div className="welcome-card full-row"><Sparkles /><div><strong>המחיר האישי מתחיל כאן</strong><span>חפש מוצר וקבל מחיר לאחר ההטבות שכבר יש לך.</span></div></div>}
          {product && <>
            <aside className="product-card"><ProductVisual image={product.image_url} name={product.product_name} /><span className="category">{product.category || 'ללא קטגוריה'}</span><h2>{product.product_name}</h2><p>מק״ט: {product.sku || '-'}</p><div className="summary"><Tag />הכרטיסים הפעילים: {cards.length}</div></aside>
            <main><h2>המחירים שמצאנו</h2>{offers.map((offer, index) => <article className={`offer-card ${index === 0 ? 'best' : ''}`} key={offer.id}>{index === 0 && <b className="best-label">הבחירה המשתלמת ביותר</b>}<div className="store-block"><div className="store-orb">{offer.store.slice(0, 1)}</div><div><h3>{offer.store}</h3><small><ShieldCheck />מקור מחיר במסד הנתונים</small></div></div><div className="price-block">{offer.saving > 0 && <del>{money(offer.price)}</del>}<strong>{money(offer.effective)}</strong><span>{offer.note}</span>{offer.saving > 0 && <p className="saving-line">חיסכון: <b>{money(offer.saving)}</b>{offer.checkout !== offer.effective ? ` | מחיר בקופה: ${money(offer.checkout)}` : ''}</p>}{offer.benefit?.notes?.includes('TEST') && <p className="test-label">הטבת בדיקה בלבד, אינה הצעה מסחרית מאומתת</p>}<p>משלוח: {offer.shipping ? money(offer.shipping) : 'חינם'} | סה״כ אפקטיבי: <b>{money(offer.total)}</b></p></div>{offer.website ? <button className="store-button" onClick={() => window.open(offer.website, '_blank', 'noopener,noreferrer')}>לחנות <ExternalLink /></button> : <button disabled>אין קישור</button>}</article>)}</main>
          </>}
        </section>
      </>}
  </div>;
}
