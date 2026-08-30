import React, { useEffect, useState } from 'react';
import {
  Search, CreditCard, LogOut, Plus, Trash2, ShieldCheck, Sparkles,
  User, Tag, Settings, Store, Package, Percent, Check, Wifi,
  ExternalLink, ImageOff, RefreshCw, Languages, Moon, Sun
} from 'lucide-react';
import { supabase, configured } from './supabase';
import { translations } from './translations';

const FALLBACK_CARDS = [
  ['visa', 'Visa רגיל'], ['tav', 'תו הזהב'], ['htz', 'הייטקזון'],
  ['max', 'MAX'], ['isracard', 'ישראכרט'], ['haver', 'חבר'], ['behatsdaa', 'בהצדעה']
];
const CARD_META = {
  visa: ['VISA', 'PERSONAL CREDIT', 'visa', 'V'], max: ['MAX', 'PREMIUM CREDIT', 'max', 'M'],
  haver: ['חבר', 'CONSUMER CLUB', 'haver', 'ח'], isracard: ['ישראכרט', 'PERSONAL CREDIT', 'isracard', 'י'],
  htz: ['הייטקזון', 'TECH BENEFITS', 'htz', 'H'], tav: ['תו הזהב', 'GIFT BENEFITS', 'tav', 'ת'],
  behatsdaa: ['בהצדעה', 'CONSUMER CLUB', 'behatsdaa', 'ב']
};
const money = (value, language) => new Intl.NumberFormat(language === 'he' ? 'he-IL' : 'en-US', {
  style: 'currency', currency: 'ILS', maximumFractionDigits: 0
}).format(Number(value || 0));
const readPreference = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };

function Auth({ onDemo, t }) {
  const [mode, setMode] = useState('login'); const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setMsg('');
    if (!configured) return setMsg(t.missingConfig);
    setBusy(true);
    const { error } = mode === 'login' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
    setBusy(false); setMsg(error ? error.message : mode === 'login' ? t.signedIn : t.confirmation);
  }
  return <main className="auth"><section className="brand-panel"><div className="logo"><CreditCard /> BENEFY</div><h1>{t.loginTitle}</h1><p>{t.loginText}</p><div className="feature"><ShieldCheck /> {t.privacy}</div></section><section className="auth-card"><h2>{mode === 'login' ? t.signIn : t.createAccount}</h2><form onSubmit={submit}><label>{t.email}<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label><label>{t.password}<input type="password" minLength="6" value={password} onChange={e => setPassword(e.target.value)} required /></label><button className="primary" disabled={busy}>{busy ? t.loading : mode === 'login' ? t.login : t.register}</button></form>{msg && <div className="notice">{msg}</div>}<button className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? t.noAccount : t.haveAccount}</button><button className="demo" onClick={onDemo}>{t.demo}</button></section></main>;
}
function WalletCard({ code, name, selected, onToggle, t }) {
  const [label, subtitle, theme, monogram] = CARD_META[code] || [name, 'BENEFIT PROGRAM', 'default', name?.[0] || '?'];
  return <button type="button" className={`wallet-card wallet-card--${theme} ${selected ? 'is-selected' : ''}`} onClick={onToggle}><span className="wallet-card__shine" /><span className="wallet-card__top"><span className="wallet-card__brand"><span className="wallet-card__monogram">{monogram}</span><span><strong>{label}</strong><small>{subtitle}</small></span></span><span className={`wallet-card__status ${selected ? 'is-active' : ''}`}>{selected ? <><Check /> {t.active}</> : t.available}</span></span><span className="wallet-card__middle"><span className="wallet-card__chip"><i /><i /><i /><i /></span><Wifi /></span><span className="wallet-card__bottom"><span><small>BENEFY WALLET</small><strong>•••• BENEFITS</strong></span><span className="wallet-card__action">{selected ? <Trash2 /> : <Plus />}{selected ? t.remove : t.add}</span></span></button>;
}
function ProductVisual({ image, name, t }) {
  const [failed, setFailed] = useState(false);
  if (!image || failed) return <div className="product-visual product-visual--empty"><ImageOff /><span>{t.imagePending}</span></div>;
  return <div className="product-visual"><img src={image} alt={name} onError={() => setFailed(true)} loading="eager" /></div>;
}
function Admin({ t }) {
  const [counts, setCounts] = useState({ products: 0, stores: 0, benefits: 0 }); const [busy, setBusy] = useState(false);
  async function load() { setBusy(true); const [p, s, b] = await Promise.all([supabase.from('products').select('*', { count: 'exact', head: true }), supabase.from('stores').select('*', { count: 'exact', head: true }), supabase.from('benefit_rules').select('*', { count: 'exact', head: true })]); setCounts({ products: p.count || 0, stores: s.count || 0, benefits: b.count || 0 }); setBusy(false); }
  useEffect(() => { load(); }, []);
  const items = [[Package, t.products, counts.products], [Store, t.stores, counts.stores], [Percent, t.benefits, counts.benefits]];
  return <section className="page admin-overview"><div className="page-title"><div><h1>{t.adminTitle}</h1><p>{t.adminText}</p></div><button className="secondary" onClick={load}><RefreshCw className={busy ? 'spin' : ''} />{t.refresh}</button></div><div className="admin-cards">{items.map(([Icon, label, count]) => <article key={label}><Icon /><span>{label}</span><strong>{count}</strong></article>)}</div></section>;
}

export default function App() {
  const [session, setSession] = useState(null); const [demo, setDemo] = useState(false); const [cards, setCards] = useState([]);
  const [cardCatalog, setCardCatalog] = useState(FALLBACK_CARDS); const [query, setQuery] = useState(''); const [tab, setTab] = useState('search');
  const [loading, setLoading] = useState(true); const [isAdmin, setIsAdmin] = useState(false); const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(''); const [product, setProduct] = useState(null); const [offers, setOffers] = useState([]); const [hasSearched, setHasSearched] = useState(false);
  const [language, setLanguage] = useState(() => readPreference('benefy-language', 'he'));
  const [theme, setTheme] = useState(() => readPreference('benefy-theme', 'light'));
  const t = translations[language] || translations.he;

  useEffect(() => { document.documentElement.lang = language; document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr'; document.documentElement.dataset.theme = theme; try { localStorage.setItem('benefy-language', language); localStorage.setItem('benefy-theme', theme); } catch {} }, [language, theme]);
  useEffect(() => { if (!configured) { setLoading(false); return; } supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); }); const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next)); return () => subscription.unsubscribe(); }, []);
  useEffect(() => { if (session) { loadUser(); loadCatalog(); } else if (demo) setCards(['visa', 'tav', 'htz']); }, [session, demo]);
  async function loadUser() { const [{ data: cardData }, { data: profileData }] = await Promise.all([supabase.from('cards').select('card_code,card_type').eq('active', true).order('created_at'), supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle()]); setCards((cardData || []).map(x => x.card_code || x.card_type).filter(Boolean)); setIsAdmin(profileData?.role === 'admin'); }
  async function loadCatalog() { const { data } = await supabase.from('card_programs').select('code,display_name').eq('active', true).order('display_name'); if (data?.length) setCardCatalog(data.map(x => [x.code, x.display_name])); }
  async function toggleCard(code) { if (demo) return setCards(current => current.includes(code) ? current.filter(x => x !== code) : [...current, code]); if (cards.includes(code)) await supabase.from('cards').delete().eq('user_id', session.user.id).eq('card_code', code); else { const program = cardCatalog.find(x => x[0] === code); await supabase.from('cards').insert({ user_id: session.user.id, card_code: code, card_type: code, card_name: program?.[1] || code, active: true }); } loadUser(); }
  async function inspectOfferImage(productUrl) { if (!productUrl) return null; try { const response = await fetch(`/api/inspect-product?url=${encodeURIComponent(productUrl)}`); if (!response.ok) return null; const data = await response.json(); return data?.product?.image || null; } catch { return null; } }
  async function searchProducts(event) {
    event?.preventDefault(); const term = query.trim(); setHasSearched(true); setSearchError(''); setProduct(null); setOffers([]);
    if (!term) return setSearchError(t.emptySearch); if (!configured || demo) return setSearchError(t.liveOnly); setSearching(true);
    const { data: found, error: pError } = await supabase.from('products').select('id,product_name,sku,category,image_url').eq('active', true).or(`product_name.ilike.%${term}%,sku.ilike.%${term}%,category.ilike.%${term}%`).limit(1);
    if (pError || !found?.length) { setSearching(false); return setSearchError(pError?.message || t.notFound); }
    const foundProduct = found[0]; const { data: priceRows, error: priceError } = await supabase.from('prices').select('id,store_id,price,shipping,updated_at,product_url').eq('product_id', foundProduct.id).eq('active', true);
    if (priceError) { setSearching(false); return setSearchError(priceError.message); }
    const storeIds = [...new Set((priceRows || []).map(x => x.store_id).filter(Boolean))];
    const storeResponse = storeIds.length ? await supabase.from('stores').select('id,store_name,website').in('id', storeIds) : { data: [] };
    const storeRows = storeResponse.data || []; let benefitRows = [];
    if (storeIds.length && cards.length) { const { data } = await supabase.from('benefit_rules').select('*').in('program_code', cards).in('store_id', storeIds).eq('active', true); benefitRows = data || []; }
    const imageFromSource = foundProduct.image_url || await inspectOfferImage(priceRows?.[0]?.product_url); setProduct({ ...foundProduct, image_url: imageFromSource });
    const now = Date.now(); const activeRule = rule => (!rule.start_date || new Date(rule.start_date).getTime() <= now) && (!rule.end_date || new Date(rule.end_date).getTime() >= now);
    const calc = (price, rule) => { const value = Number(rule.discount_value || 0); if (!value || price < Number(rule.min_purchase || 0)) return null; if (rule.benefit_type === 'special_price') return { saving: Math.max(0, price - value), checkout: value, effective: value }; let saving = rule.discount_unit === 'percent' ? price * value / 100 : value; const cap = Number(rule.max_discount_cap || 0); if (cap > 0) saving = Math.min(saving, cap); saving = Math.max(0, Math.min(saving, price)); const deferred = ['cashback', 'loaded_card', 'voucher'].includes(rule.benefit_type); return { saving, checkout: deferred ? price : price - saving, effective: price - saving }; };
    const combined = (priceRows || []).map(row => { const store = storeRows.find(x => x.id === row.store_id); const price = Number(row.price || 0); const shipping = Number(row.shipping || 0); const best = benefitRows.filter(r => r.store_id === row.store_id && activeRule(r)).map(rule => ({ rule, result: calc(price, rule) })).filter(x => x.result).sort((a, b) => a.result.effective - b.result.effective)[0]; const effective = best?.result.effective ?? price; const programName = best ? (cardCatalog.find(x => x[0] === best.rule.program_code)?.[1] || best.rule.program_code) : null; return { id: row.id, store: store?.store_name || t.stores, website: row.product_url || store?.website || null, price, shipping, effective, checkout: best?.result.checkout ?? price, total: effective + shipping, saving: best?.result.saving || 0, benefit: best?.rule || null, note: best ? `${programName}: ${best.rule.title || t.activeBenefit}` : t.basePrice }; }).sort((a, b) => a.total - b.total);
    setOffers(combined); if (!combined.length) setSearchError(t.noPrices); setSearching(false);
  }

  if (loading) return <div className="center">{t.loading}</div>;
  if (!session && !demo) return <Auth onDemo={() => setDemo(true)} t={t} />;
  const email = session?.user?.email || t.demoUser;
  const tabs = [[Search, 'search', t.search], [CreditCard, 'cards', t.wallet], ...(isAdmin ? [[Settings, 'admin', t.admin]] : [])];
  return <div dir={language === 'he' ? 'rtl' : 'ltr'}><header className="topbar"><div className="logo dark">BENEFY <CreditCard /></div><nav className="nav-3d">{tabs.map(([Icon, key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}><span className="nav-icon"><Icon /></span><span>{label}</span></button>)}</nav><div className="header-actions"><button className="header-control" onClick={() => setLanguage(language === 'he' ? 'en' : 'he')}><Languages /><span>{t.languageButton}</span></button><button className="header-control theme-control" title={theme === 'light' ? t.themeDark : t.themeLight} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon /> : <Sun />}</button><div className="user"><User />{email}<button title={t.logout} onClick={() => session ? supabase.auth.signOut() : setDemo(false)}><LogOut /></button></div></div></header>
    {tab === 'admin' ? <Admin t={t} /> : tab === 'cards' ? <section className="page wallet-page"><div className="wallet-heading"><div><h1>{t.wallet}</h1><p>{t.walletText}</p></div><div className="wallet-counter"><CreditCard /><strong>{cards.length}</strong> {t.activePrograms}</div></div><div className="wallet-grid">{cardCatalog.map(([code, name]) => <WalletCard key={code} code={code} name={name} selected={cards.includes(code)} onToggle={() => toggleCard(code)} t={t} />)}</div></section> : <><section className="hero hero-premium"><span><Sparkles />{t.heroBadge}</span><h1>{t.heroLine1}<br />{t.heroLine2}</h1><form onSubmit={searchProducts}><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t.placeholder} /><button type="submit" className="primary search-3d" disabled={searching}>{searching ? t.searching : t.compare}</button></form></section><section className="page results results-premium">{searchError && <div className="warning full-row">{searchError}</div>}{!hasSearched && <div className="welcome-card full-row"><Sparkles /><div><strong>{t.startTitle}</strong><span>{t.startText}</span></div></div>}{product && <><aside className="product-card"><ProductVisual image={product.image_url} name={product.product_name} t={t} /><span className="category">{product.category || t.noCategory}</span><h2>{product.product_name}</h2><p>{t.sku}: {product.sku || '-'}</p><div className="summary"><Tag />{t.activeCards}: {cards.length}</div></aside><main><h2>{t.foundPrices}</h2>{offers.map((offer, index) => <article className={`offer-card ${index === 0 ? 'best' : ''}`} key={offer.id}>{index === 0 && <b className="best-label">{t.best}</b>}<div className="store-block"><div className="store-orb">{offer.store.slice(0, 1)}</div><div><h3>{offer.store}</h3><small><ShieldCheck />{t.source}</small></div></div><div className="price-block">{offer.saving > 0 && <del>{money(offer.price, language)}</del>}<strong>{money(offer.effective, language)}</strong><span>{offer.note}</span>{offer.saving > 0 && <p className="saving-line">{t.saving}: <b>{money(offer.saving, language)}</b>{offer.checkout !== offer.effective ? ` | ${t.checkout}: ${money(offer.checkout, language)}` : ''}</p>}{offer.benefit?.notes?.includes('TEST') && <p className="test-label">{t.testBenefit}</p>}<p>{t.shipping}: {offer.shipping ? money(offer.shipping, language) : t.free} | {t.total}: <b>{money(offer.total, language)}</b></p></div>{offer.website ? <button className="store-button" onClick={() => window.open(offer.website, '_blank', 'noopener,noreferrer')}>{t.storeButton} <ExternalLink /></button> : <button disabled>{t.noLink}</button>}</article>)}</main></>}</section></>}
  </div>;
}
