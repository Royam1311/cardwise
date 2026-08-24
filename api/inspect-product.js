export default async function handler(req, res) {
  const target = req.query.url;

  if (!target) {
    return res.status(400).json({
      ok: false,
      error: 'Missing url parameter'
    });
  }

  try {
    const response = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const html = await response.text();

    const priceMatches = html.match(/price|Price|PRICE/gi) || [];

    return res.status(200).json({
      ok: response.ok,
      httpStatus: response.status,
      htmlBytes: html.length,
      priceOccurrences: priceMatches.length,
      containsProduct: html.includes('Product'),
      containsJsonLd: html.includes('application/ld+json'),
      containsOffer: html.includes('Offer'),
      containsPriceWord: html.includes('price')
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
}
