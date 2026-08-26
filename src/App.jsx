import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, CreditCard, LogOut, Plus, Trash2, ShieldCheck,
  Sparkles, User, Tag, Settings, Store, Package, Percent,
  X, Save, RefreshCw
} from 'lucide-react';
import { supabase, configured } from './supabase';

const FALLBACK_CARDS = [
  ['visa', 'Visa רגיל'], ['tav', 'תו הזהב'], ['htz', 'הייטקזון'],
  ['max', 'MAX'], ['isracard', 'ישראכרט'], ['haver', 'חבר'],
  ['behatsdaa', 'בהצדעה']
];

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
    if (!configured) {
      setMsg('חסרים משתני חיבור ל-Supabase.');
      return;
    }
    setBusy(true);
    const { error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    setMsg(error ? error.message : mode === 'login' ? 'התחברת בהצלחה' : 'נשלח אליך אימייל לאישור.');
  }

  return (
    <main className="auth">
      <section className="brand-panel">
        <div className="logo"><CreditCard /> BENEFY</div>
        <h1>המחיר שמתאים דווקא לך</h1>
        <p>השוואת מחירים, משלוחים והטבות לפי הכרטיסים והמועדונים שלך.</p>
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
        <button className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'אין לך חשבון? הרשמה' : 'כבר נרשמת? כניסה'}
        </button>
        <button className="demo" onClick={onDemo}>כניסה לגרסת הדגמה</button>
      </section>
    </main>
  );
}

function Modal({ title, onClose, children }) {
  return <div className="modal-bg" onMouseDown={onClose}><div className="modal" onMouseDown={e => e.stopPropagation()}><button className="close" onClick={onClose}><X /></button><h2>{title}</h2>{children}</div></div>;
}

function Field({ label, ...props }) {
  return <label className="field">{label}<input {...props} /></label>;
}

function Admin() {
  const [section, setSection] = useState('products');
  const [items, setItems] = useState([]);
  const [stores, setStores] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const config = {
    products: { title: 'מוצרים', icon: Package, table: 'products' },
    stores: { title: 'חנויות', icon: Store, table: 'stores' },
    benefits: { title: 'הטבות', icon: Percent, table: 'benefit_rules' }
  };

  async function load() {
    setMsg('');
    let query = supabase.from(config[section].table).select('*');
    if (section !== 'benefits') query = query.order(section === 'products' ? 'product_name' : 'store_name');
    const { data, error } = await query;
    if (error) setMsg(error.message);
    setItems(data || []);
    const [{ data: storeData }, { data: cardData }] = await Promise.all([
      supabase.from('stores').select('id,store_name').eq('active', true),
      supabase.from('card_programs').select('id,display_name').eq('active', true)
    ]);
    setStores(storeData || []);
    setPrograms(cardData || []);
  }

  useEffect(() => { load(); }, [section]);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setMsg('');
    let payload = {};
    if (section === 'products') payload = { product_name: form.product_name, sku: form.sku || null, category: form.category || null, active: true };
    if (section === 'stores') payload = { store_name: form.store_name, slug: form.slug, website: form.website || null, active: true };
    if (section === 'benefits') payload = { card_program_id: form.card_program_id, store_id: form.store_id || null, category: form.category || null, benefit_type: form.benefit_type, benefit_value: Number(form.benefit_value), terms: form.terms || null, active: true };
    const { error } = await supabase.from(config[section].table).insert(payload);
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setOpen(false);
    setForm({});
    load();
  }

  async function remove(id) {
    if (!window.confirm('למחוק את הרשומה?')) return;
    const { error } = await supabase.from(config[section].table).delete().eq('id', id);
    if (error) setMsg(error.message); else load();
  }

  const SectionIcon = config[section].icon;
  return (
    <section className="page admin">
      <div className="page-title"><div><h1>פאנל ניהול</h1><p>ניהול הנתונים של BENEFY.</p></div><Settings /></div>
      <div className="admin-tabs">
        {Object.entries(config).map(([key, value]) => { const Icon = value.icon; return <button key={key} className={section === key ? 'active' : ''} onClick={() => setSection(key)}><Icon />{value.title}</button>; })}
      </div>
      <div className="admin-toolbar"><h2><SectionIcon />{config[section].title}</h2><div><button className="secondary" onClick={load}><RefreshCw />רענון</button><button className="primary" onClick={() => { setForm({ benefit_type: 'percent' }); setOpen(true); }}><Plus />הוספה</button></div></div>
      {msg && <div className="notice">{msg}</div>}
      <div className="table-wrap"><table><thead><tr>
        {section === 'products' && <><th>שם</th><th>מק״ט</th><th>קטגוריה</th></>}
        {section === 'stores' && <><th>חנות</th><th>מזהה</th><th>אתר</th></>}
        {section === 'benefits' && <><th>מועדון</th><th>חנות</th><th>סוג</th><th>ערך</th></>}
        <th></th>
      </tr></thead><tbody>
        {items.map(item => <tr key={item.id}>
          {section === 'products' && <><td>{item.product_name}</td><td>{item.sku || '-'}</td><td>{item.category || '-'}</td></>}
          {section === 'stores' && <><td>{item.store_name}</td><td>{item.slug}</td><td>{item.website || '-'}</td></>}
          {section === 'benefits' && <><td>{programs.find(x => x.id === item.card_program_id)?.display_name || '-'}</td><td>{stores.find(x => x.id === item.store_id)?.store_name || item.category || '-'}</td><td>{item.benefit_type}</td><td>{item.benefit_type === 'percent' ? `${item.benefit_value}%` : money(item.benefit_value)}</td></>}
          <td><button className="danger" onClick={() => remove(item.id)}><Trash2 /></button></td>
        </tr>)}
        {!items.length && <tr><td className="empty" colSpan="6">אין עדיין רשומות.</td></tr>}
      </tbody></table></div>
      {open && <Modal title="הוספת רשומה" onClose={() => setOpen(false)}><form className="admin-form" onSubmit={save}>
        {section === 'products' && <><Field label="שם מוצר *" required value={form.product_name || ''} onChange={e => setForm({ ...form, product_name: e.target.value })} /><Field label="מק״ט" value={form.sku || ''} onChange={e => setForm({ ...form, sku: e.target.value })} /><Field label="קטגוריה" value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} /></>}
        {section === 'stores' && <><Field label="שם חנות *" required value={form.store_name || ''} onChange={e => setForm({ ...form, store_name: e.target.value })} /><Field label="מזהה באנגלית *" required value={form.slug || ''} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s/g, '-') })} /><Field label="כתובת אתר" type="url" value={form.website || ''} onChange={e => setForm({ ...form, website: e.target.value })} /></>}
        {section === 'benefits' && <><label className="field">כרטיס או מועדון<select required value={form.card_program_id || ''} onChange={e => setForm({ ...form, card_program_id: e.target.value })}><option value="">בחר</option>{programs.map(x => <option key={x.id} value={x.id}>{x.display_name}</option>)}</select></label><label className="field">חנות<select value={form.store_id || ''} onChange={e => setForm({ ...form, store_id: e.target.value })}><option value="">בחר</option>{stores.map(x => <option key={x.id} value={x.id}>{x.store_name}</option>)}</select></label><Field label="קטגוריה, אם אין חנות" value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })} /><label className="field">סוג הטבה<select value={form.benefit_type || 'percent'} onChange={e => setForm({ ...form, benefit_type: e.target.value })}><option value="percent">אחוז הנחה</option><option value="fixed">הנחה קבועה</option><option value="cashback">Cashback</option><option value="special_price">מחיר מיוחד</option></select></label><Field label="ערך *" required type="number" min="0" step="0.01" value={form.benefit_value || ''} onChange={e => setForm({ ...form, benefit_value: e.target.value })} /><Field label="תנאים" value={form.terms || ''} onChange={e => setForm({ ...form, terms: e.target.value })} /></>}
        <button className="primary" disabled={busy}><Save />{busy ? 'שומר...' : 'שמור'}</button>
      </form></Modal>}
    </section>
  );
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
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
    if (demo) { setCards(current => current.includes(code) ? current.filter(x => x !== code) : [...current, code]); return; }
    if (cards.includes(code)) {
      await supabase.from('cards').delete().eq('user_id', session.user.id).eq('card_code', code);
    } else {
      const program = cardCatalog.find(x => x[0] === code);
      await supabase.from('cards').insert({
        user_id: session.user.id,
        card_code: code,
        card_type: code,
        card_name: program?.[1] || code,
        active: true
      });
    }
    loadUser();
  }

  async function searchProducts(event) {
    event?.preventDefault();
    const term = query.trim();
    setHasSearched(true);
    setSearchError('');
    setProduct(null);
    setOffers([]);
    if (!term) { setSearchError('יש להזין שם מוצר או מק״ט.'); return; }
    if (!configured || demo) { setSearchError('החיפוש האמיתי זמין לאחר התחברות ל-Supabase.'); return; }

    setSearching(true);
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id,product_name,sku,category')
      .eq('active', true)
      .or(`product_name.ilike.%${term}%,sku.ilike.%${term}%,category.ilike.%${term}%`)
      .limit(1);

    if (productError) { setSearching(false); setSearchError(productError.message); return; }
    if (!products?.length) { setSearching(false); setSearchError('לא נמצא מוצר מתאים.'); return; }

    const foundProduct = products[0];
    setProduct(foundProduct);

    const { data: priceRows, error: priceError } = await supabase
      .from('prices')
      .select('id,store_id,price,shipping,updated_at')
      .eq('product_id', foundProduct.id)
      .eq('active', true);

    if (priceError) { setSearching(false); setSearchError(priceError.message); return; }
    const storeIds = [...new Set((priceRows || []).map(x => x.store_id).filter(Boolean))];
    let storeRows = [];
    if (storeIds.length) {
      const { data } = await supabase.from('stores').select('id,store_name,website').in('id', storeIds);
      storeRows = data || [];
    }

    let benefitRows = [];
    if (storeIds.length && cards.length) {
      const { data, error } = await supabase
        .from('benefit_rules')
        .select('id,program_code,store_id,benefit_type,discount_value,discount_unit,max_discount_cap,min_purchase,stackable,notes,active,last_verified,title,description,start_date,end_date,source_url,coupon_code,registration_required,loaded_card_required,online_only,new_customers_only,terms')
        .in('program_code', cards)
        .in('store_id', storeIds)
        .eq('active', true);
      if (error) setSearchError(`המחירים נטענו, אך ההטבות לא נטענו: ${error.message}`);
      benefitRows = data || [];
    }

    const now = Date.now();
    const isActiveRule = rule => {
      const startsOk = !rule.start_date || new Date(rule.start_date).getTime() <= now;
      const endsOk = !rule.end_date || new Date(rule.end_date).getTime() >= now;
      return startsOk && endsOk;
    };
    const calculateRule = (price, rule) => {
      const value = Number(rule.discount_value || 0);
      const minimum = Number(rule.min_purchase || 0);
      if (!value || price < minimum) return null;
      if (rule.benefit_type === 'special_price') {
        const saving = Math.max(0, price - value);
        return { saving, checkoutPrice: value, effectivePrice: value };
      }
      let saving = rule.discount_unit === 'percent' ? price * value / 100 : value;
      const cap = Number(rule.max_discount_cap || 0);
      if (cap > 0) saving = Math.min(saving, cap);
      saving = Math.max(0, Math.min(saving, price));
      const deferred = ['cashback', 'loaded_card', 'voucher'].includes(rule.benefit_type);
      return {
        saving,
        checkoutPrice: deferred ? price : price - saving,
        effectivePrice: price - saving
      };
    };

    const combined = (priceRows || []).map(row => {
      const store = storeRows.find(x => x.id === row.store_id);
      const shipping = Number(row.shipping || 0);
      const price = Number(row.price || 0);
      const candidates = benefitRows
        .filter(rule => rule.store_id === row.store_id && isActiveRule(rule))
        .map(rule => ({ rule, calculation: calculateRule(price, rule) }))
        .filter(item => item.calculation)
        .sort((a, b) => a.calculation.effectivePrice - b.calculation.effectivePrice);
      const best = candidates[0] || null;
      const checkoutPrice = best ? best.calculation.checkoutPrice : price;
      const effectivePrice = best ? best.calculation.effectivePrice : price;
      const programName = best ? (cardCatalog.find(x => x[0] === best.rule.program_code)?.[1] || best.rule.program_code) : null;
      return {
        id: row.id,
        store: store?.store_name || 'חנות',
        website: store?.website || null,
        price,
        shipping,
        final: checkoutPrice,
        effective: effectivePrice,
        total: effectivePrice + shipping,
        saving: best?.calculation.saving || 0,
        benefit: best?.rule || null,
        programName,
        note: best ? `${programName}: ${best.rule.title || 'הטבה פעילה'}` : 'מחיר בסיס, ללא הטבה פעילה',
        updatedAt: row.updated_at
      };
    }).sort((a, b) => a.total - b.total);

    setOffers(combined);
    if (!combined.length) setSearchError('המוצר נמצא, אך עדיין אין עבורו מחירים פעילים.');
    setSearching(false);
  }

  if (loading) return <div className="center">טוען...</div>;
  if (!session && !demo) return <Auth onDemo={() => setDemo(true)} />;
  const email = session?.user?.email || 'משתמש הדגמה';

  return <div dir="rtl">
    <header>
      <div className="logo dark"><CreditCard />BENEFY</div>
      <nav>
        <button className={tab === 'search' ? 'active' : ''} onClick={() => setTab('search')}><Search />חיפוש</button>
        <button className={tab === 'cards' ? 'active' : ''} onClick={() => setTab('cards')}><CreditCard />הכרטיסים שלי</button>
        {isAdmin && <button className={tab === 'admin' ? 'active' : ''} onClick={() => setTab('admin')}><Settings />ניהול</button>}
      </nav>
      <div className="user"><User />{email}<button onClick={() => session ? supabase.auth.signOut() : setDemo(false)}><LogOut /></button></div>
    </header>

    {demo && <div className="demo-banner">מצב הדגמה: חיפוש Supabase אינו פעיל.</div>}

    {tab === 'admin' ? <Admin /> : tab === 'cards' ?
      <section className="page">
        <div className="page-title"><div><h1>הכרטיסים והמועדונים שלי</h1><p>בחר רק את סוגי הכרטיסים. אין להזין מספר כרטיס.</p></div><CreditCard /></div>
        <div className="card-grid">{cardCatalog.map(([code, name]) => <button key={code} onClick={() => toggleCard(code)} className={'credit-card ' + (cards.includes(code) ? 'selected' : '')}><span>{name}</span><small>{cards.includes(code) ? 'נוסף לחשבון' : 'לחץ להוספה'}</small>{cards.includes(code) ? <Trash2 /> : <Plus />}</button>)}</div>
      </section> :
      <>
        <section className="hero">
          <span><Sparkles />השוואת המחיר האישי שלך</span>
          <h1>מוצאים את העסקה שבאמת<br />הכי משתלמת עבורך</h1>
          <form onSubmit={searchProducts}>
            <Search />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="לדוגמה: iPhone, IVIPH17PORESIM או טלפונים" />
            <button type="submit" className="primary" disabled={searching}>{searching ? 'מחפש...' : 'השווה מחירים'}</button>
          </form>
        </section>

        <section className="page results">
          {searchError && <div className="warning" style={{ gridColumn: '1 / -1' }}>{searchError}</div>}
          {!hasSearched && <div className="warning" style={{ gridColumn: '1 / -1' }}>הזן שם מוצר או מק״ט ולחץ על השווה מחירים.</div>}
          {product && <>
            <aside>
              <div className="product-icon">📱</div>
              <span className="category">{product.category || 'ללא קטגוריה'}</span>
              <h2>{product.product_name}</h2>
              <p>מק״ט: {product.sku || '-'}</p>
              <div className="summary"><Tag />הכרטיסים הפעילים: {cards.length}</div>
            </aside>
            <main>
              <h2>המחירים שנמצאו</h2>
              {offers.map((offer, index) => <article className={index === 0 ? 'best' : ''} key={offer.id}>
                {index === 0 && <b className="best-label">המחיר הנמוך ביותר שנמצא</b>}
                <div><h3>{offer.store}</h3><small><ShieldCheck />מקור מחיר במסד הנתונים</small></div>
                <div>
                  {offer.saving > 0 && <del>{money(offer.price)}</del>}
                  <strong>{money(offer.effective)}</strong>
                  <span>{offer.note}</span>
                  {offer.saving > 0 && <p className="saving-line">חיסכון: <b>{money(offer.saving)}</b>{offer.final !== offer.effective ? ` | מחיר בקופה: ${money(offer.final)}` : ''}</p>}
                  {offer.benefit?.notes?.includes('TEST') && <p className="test-label">הטבת בדיקה בלבד, אינה הצעה מסחרית מאומתת</p>}
                  <p>משלוח: {offer.shipping ? money(offer.shipping) : 'חינם'} | סה״כ אפקטיבי: <b>{money(offer.total)}</b></p>
                </div>
                {offer.website ? <button onClick={() => window.open(offer.website, '_blank', 'noopener,noreferrer')}>לחנות</button> : <button disabled>אין קישור</button>}
              </article>)}
            </main>
          </>}
        </section>
      </>}
  </div>;
}
