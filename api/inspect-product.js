// CardWise product inspector - read-only proof of concept.
// It fetches one public product page and returns only structured product fields.

function clean(value) {
  if (value === null || value === undefined) return null;
  return String(value).replace(/\s+/g, ' ').trim() || null;
}

function htmlDecode(value) {
  if (!value) return value;
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/g, '/');
}

function meta(html, keys) {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, 'i')
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) return clean(htmlDecode(match[1]));
    }
  }
  return null;
}

function findProducts(node, output = []) {
  if (!node) return output;
  if (Array.isArray(node)) {
    node.forEach(item => findProducts(item, output));
    return output;
  }
  if (typeof node !== 'object') return output;
  const type = node['@type'];
  const types = Array.isArray(type) ? type : [type];
  if (types.some(t => String(t || '').toLowerCase() === 'product')) output.push(node);
  if (node['@graph']) findProducts(node['@graph'], output);
  Object.values(node).forEach(value => {
    if (value && typeof value === 'object' && value !== node['@graph']) findProducts(value, output);
  });
  return output;
}

function offerFrom(product) {
  const offers = Array.isArray(product?.offers) ? product.offers : product?.offers ? [product.offers] : [];
  return offers.find(Boolean) || {};
}

function parseJsonLd(html) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const parsed = [];
  for (const script of scripts) {
    const raw = htmlDecode(script[1].trim());
    try { parsed.push(JSON.parse(raw)); } catch (_) {}
  }
  const products = [];
  parsed.forEach(item => findProducts(item, products));
  return { scriptCount: scripts.length, validScriptCount: parsed.length, products };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ ok:false, error:'GET only' });
  const target = String(req.query.url || '');
  let url;
  try { url = new URL(target); } catch (_) { return res.status(400).json({ ok:false, error:'Invalid url parameter' }); }
  const allowedHosts = new Set(['www.shekem-electric.co.il', 'shekem-electric.co.il']);
  if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname)) {
    return res.status(400).json({ ok:false, error:'Only public Shekem Electric HTTPS pages are allowed' });
  }
  try {
    const response = await fetch(url.toString(), {
      redirect:'follow',
      headers:{
        'Accept':'text/html,application/xhtml+xml',
        'User-Agent':'CardWise-MVP/1.0 product-price verification'
      }
    });
    const html = await response.text();
    const ld = parseJsonLd(html);
    const p = ld.products[0] || {};
    const offer = offerFrom(p);
    const image = Array.isArray(p.image) ? p.image[0] : (typeof p.image === 'object' ? p.image?.url : p.image);
    const result = {
      name: clean(p.name) || meta(html,['og:title','twitter:title']),
      sku: clean(p.sku || p.mpn || p.productID),
      brand: clean(typeof p.brand === 'object' ? p.brand?.name : p.brand),
      price: clean(offer.price || offer.lowPrice || meta(html,['product:price:amount','og:price:amount'])),
      currency: clean(offer.priceCurrency || meta(html,['product:price:currency','og:price:currency'])),
      availability: clean(offer.availability),
      image: clean(image) || meta(html,['og:image','twitter:image']),
      canonicalUrl: clean(offer.url || p.url) || url.toString()
    };
    const foundFields = Object.entries(result).filter(([,v]) => v !== null).map(([k]) => k);
    return res.status(200).json({
      ok: response.ok,
      httpStatus: response.status,
      finalUrl: response.url,
      htmlBytes: Buffer.byteLength(html),
      jsonLdScripts: ld.scriptCount,
      validJsonLdScripts: ld.validScriptCount,
      productObjectsFound: ld.products.length,
      foundFields,
      product: result,
      note: 'Read-only diagnostic. Nothing was written to Supabase.'
    });
  } catch (error) {
    return res.status(500).json({ ok:false, error:String(error?.message || error) });
  }
}
