function decodeHtml(value) {
  if (!value) return value;
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/g, '/');
}

function text(value) {
  if (value === null || value === undefined) return null;
  const result = decodeHtml(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return result || null;
}

function getMeta(html, names) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, 'i')
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) return text(match[1]);
    }
  }
  return null;
}

function collectProducts(node, output) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) collectProducts(item, output);
    return;
  }
  if (typeof node !== 'object') return;
  const rawType = node['@type'];
  const types = Array.isArray(rawType) ? rawType : [rawType];
  if (types.some(item => String(item || '').toLowerCase() === 'product')) {
    output.push(node);
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') collectProducts(value, output);
  }
}

function readJsonLd(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const products = [];
  let validBlocks = 0;
  for (const block of blocks) {
    const raw = decodeHtml(block[1].trim());
    try {
      const parsed = JSON.parse(raw);
      validBlocks += 1;
      collectProducts(parsed, products);
    } catch (_) {}
  }
  return { totalBlocks: blocks.length, validBlocks, products };
}

function firstOffer(product) {
  if (!product || !product.offers) return {};
  if (Array.isArray(product.offers)) return product.offers[0] || {};
  return product.offers;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'GET only' });
  }

  const target = String(req.query.url || '');
  if (!target) {
    return res.status(400).json({ ok: false, error: 'Missing url parameter' });
  }

  let url;
  try {
    url = new URL(target);
  } catch (_) {
    return res.status(400).json({ ok: false, error: 'Invalid URL' });
  }

  const allowedHosts = new Set(['www.ivory.co.il', 'ivory.co.il']);
  if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname)) {
    return res.status(400).json({ ok: false, error: 'Only approved Ivory HTTPS pages are allowed' });
  }

  try {
    const response = await fetch(url.toString(), {
      redirect: 'follow',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; CardWiseProductVerifier/1.0)'
      }
    });

    const html = await response.text();
    const jsonLd = readJsonLd(html);
    const product = jsonLd.products[0] || {};
    const offer = firstOffer(product);
    const imageValue = Array.isArray(product.image)
      ? product.image[0]
      : typeof product.image === 'object'
        ? product.image.url
        : product.image;

    const result = {
      name: text(product.name) || getMeta(html, ['og:title', 'twitter:title']),
      sku: text(product.sku || product.mpn || product.productID) || String(url.searchParams.get('id') || '') || null,
      brand: text(typeof product.brand === 'object' ? product.brand.name : product.brand),
      price: text(offer.price || offer.lowPrice) || getMeta(html, ['product:price:amount', 'og:price:amount']),
      currency: text(offer.priceCurrency) || getMeta(html, ['product:price:currency', 'og:price:currency']),
      availability: text(offer.availability),
      image: text(imageValue) || getMeta(html, ['og:image', 'twitter:image']),
      productUrl: response.url
    };

    return res.status(200).json({
      ok: response.ok,
      httpStatus: response.status,
      htmlBytes: Buffer.byteLength(html),
      jsonLdBlocks: jsonLd.totalBlocks,
      validJsonLdBlocks: jsonLd.validBlocks,
      productObjectsFound: jsonLd.products.length,
      product: result,
      note: 'Read-only diagnostic. Nothing was written to Supabase.'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: String(error && error.message ? error.message : error)
    });
  }
}
