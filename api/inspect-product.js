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

    return res.status(200).json({
      ok: response.ok,
      httpStatus: response.status,
      finalUrl: response.url,
      htmlBytes: html.length,
      preview: html.substring(0, 1000)
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
}
