const FAST_SIMON_URL = 'https://api.fastsimon.com/full_text_search';
const DEFAULT_TERMS = ['samsung'];
const MERCHANT_ID = 'shekem-electric';

function getSupabaseUrl() { const v = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL; if (!v) throw new Error('Missing VITE_SUPABASE_URL'); return v.replace(/\/$/, ''); }
function getServerKey() { const v = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY; if (!v) throw new Error('Missing Supabase server key'); return v; }
function requiredEnv(name) { const v = process.env[name]; if (!v) throw new Error(`Missing environment variable: ${name}`); return v; }
function isEnabled(name) { return ['1','true','yes','on'].includes(String(process.env[name] || '').toLowerCase()); }
function numberOrNull(v) { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null; }
function clean(v) { return String(v || '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9\u0590-\u05ff]+/g,' ').replace(/\s+/g,' ').trim(); }
function termsFromEnvironment() { const v=String(process.env.SHEKEM_SYNC_TERMS||'').split(',').map(x=>x.trim()).filter(Boolean); return v.length?[...new Set(v)]:DEFAULT_TERMS; }
function readAttribute(raw,names){ for(const e of Array.isArray(raw)?raw:[]){ if(!Array.isArray(e)||!names.includes(e[0])) continue; const vals=Array.isArray(e[1])?e[1].flat(Infinity):[e[1]]; const f=vals.find(v=>v!==null&&v!==undefined&&v!==''); if(f!==undefined)return String(f);} return null; }
function masterKey(brand, model, name){ return [clean(brand),clean(model),clean(name)].filter(Boolean).join('|'); }

function normalizeProduct(item){
  const price=numberOrNull(item.p), productName=String(item.l||'').trim(), sku=String(item.sku||item.s||'').trim();
  const brand=readAttribute(item.att,['מותג יצרן','מותג','Manufacturer']);
  const model=readAttribute(item.att,['שם דגם','דגם','Model']);
  const productType=readAttribute(item.att,['סוג מוצר','קטגוריה']);
  return {
    product:{ merchant_id:MERCHANT_ID, merchant_product_id:String(item.id||sku), product_name:productName, sku, brand, model, category:productType||null, category_paths:[], image_url:item.t2||item.t||null, product_url:item.u||null, attributes:{ source:'fast-simon', master_key:masterKey(brand,model,productName) }, active:true, last_synced_at:new Date().toISOString() },
    price:{ price, comparePrice:numberOrNull(item.compare_at_price||item.compare_price), productUrl:item.u||null }
  };
}

async function db(path,{method='GET',body,prefer}={}){ const key=getServerKey(); const r=await fetch(`${getSupabaseUrl()}/rest/v1/${path}`,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:prefer||'return=representation'},...(body===undefined?{}:{body:JSON.stringify(body)})}); const t=await r.text(); if(!r.ok)throw new Error(`Supabase ${r.status}: ${t}`); return t?JSON.parse(t):[]; }
async function findOrCreateStore(){ const x=await db(`stores?store_code=eq.${MERCHANT_ID}&select=id,store_code&limit=1`); if(x[0])return x[0]; return (await db('stores',{method:'POST',body:{store_code:MERCHANT_ID,store_name:'שקם אלקטריק',website:'https://www.shekem-electric.co.il/',active:true}}))[0]; }
async function saveProduct(product){ const q=`products?merchant_id=eq.${MERCHANT_ID}&merchant_product_id=eq.${encodeURIComponent(product.merchant_product_id)}&select=id&limit=1`; const x=await db(q); if(x[0]) return (await db(`products?id=eq.${x[0].id}`,{method:'PATCH',body:product}))[0]||{...x[0],...product}; return (await db('products',{method:'POST',body:product}))[0]; }
async function savePrice(productId,storeId,p){ if(p.price===null)return; const x=await db(`prices?product_id=eq.${productId}&store_id=eq.${storeId}&select=id&limit=1`); const row={product_id:productId,store_id:storeId,price:p.price,compare_price:p.comparePrice,currency:'ILS',shipping:0,product_url:p.productUrl,active:true,updated_at:new Date().toISOString()}; if(x[0]) await db(`prices?id=eq.${x[0].id}`,{method:'PATCH',body:row,prefer:'return=minimal'}); else await db('prices',{method:'POST',body:row,prefer:'return=minimal'}); }
async function fetchPage(term,page,perPage){ const uuid=requiredEnv('SHEKEM_FAST_SIMON_UUID'); const p=new URLSearchParams({request_source:'v-next',src:'v-next',UUID:uuid,uuid,store_id:process.env.SHEKEM_FAST_SIMON_STORE_ID||'2',cdn_cache_key:requiredEnv('SHEKEM_FAST_SIMON_CDN_CACHE_KEY'),api_type:'json',facets_required:page===1?'1':'0',products_per_page:String(perPage),narrow:'[]',q:term,page_num:String(page),sort_by:'relevency',with_product_attributes:'true'}); const r=await fetch(`${FAST_SIMON_URL}?${p}`,{headers:{Accept:'application/json'}}); if(!r.ok)throw new Error(`Fast Simon ${r.status}`); return r.json(); }
function authorized(req){const e=process.env.CATALOG_SYNC_SECRET||process.env.CRON_SECRET;return !!e&&(req.headers.authorization===`Bearer ${e}`||req.query?.secret===e);}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store'); if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed'}); if(!authorized(req))return res.status(401).json({error:'Unauthorized'}); if(!isEnabled('SHEKEM_SYNC_ENABLED'))return res.status(503).json({error:'Shekem synchronization is disabled'});
  const terms=termsFromEnvironment(),perPage=Math.max(1,Math.min(Number(process.env.SHEKEM_PRODUCTS_PER_PAGE||15),50)),maxPages=Math.max(1,Math.min(Number(process.env.SHEKEM_MAX_PAGES_PER_TERM||3),50)),delay=Math.max(500,Number(process.env.SHEKEM_REQUEST_DELAY_MS||1200)); const seen=new Set(); let pagesRequested=0,productsReceived=0,productsSaved=0,productsFailed=0;
  try{ const store=await findOrCreateStore(); for(const term of terms){let totalPages=1;for(let page=1;page<=Math.min(totalPages,maxPages);page++){const payload=await fetchPage(term,page,perPage);pagesRequested++;totalPages=Math.max(1,Number(payload.total_p||1));const items=Array.isArray(payload.items)?payload.items:[];productsReceived+=items.length;for(const item of items){const n=normalizeProduct(item),sku=n.product.sku;if(!sku||!n.product.product_name||seen.has(sku))continue;seen.add(sku);try{const p=await saveProduct(n.product);await savePrice(p.id,store.id,n.price);productsSaved++;}catch(e){productsFailed++;console.error(`Failed SKU ${sku}:`,e.message);}}if(page<Math.min(totalPages,maxPages))await new Promise(r=>setTimeout(r,delay));}}
    return res.status(200).json({success:true,pagesRequested,productsReceived,productsSaved,productsFailed,uniqueSkus:seen.size,completedAt:new Date().toISOString()});
  }catch(error){return res.status(500).json({success:false,error:error.message,pagesRequested,productsReceived,productsSaved,productsFailed});}
}
