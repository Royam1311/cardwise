import fetch from 'node-fetch';

export default async function handler(req, res) {
  // הגדרת כותרות Response עבור CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const targetUrl = new URL(url);
    // אימות שהקישור מגיע ממתחם מוכר של חבר
    if (!targetUrl.hostname.includes('hvr.co.il')) {
      return res.status(400).json({ error: 'Only hvr.co.il URLs are supported' });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to fetch HVR page. Status: ${response.status}`,
      });
    }

    const html = await response.text();

    // חילוץ בסיסי של אחוזי הנחה מתוך ה-HTML
    const percentMatch = html.match(/(\d+(?:\.\d+)?)\s*%\s*הנחה/i) || html.match(/הנחה\s*של\s*(\d+(?:\.\d+)?)\s*%/i);
    const discountValue = percentMatch ? parseFloat(percentMatch[1]) : 0;

    // זיהוי שם החנות לפי מילות מפתח נפוצות
    let detectedStore = 'Unknown';
    if (html.includes('שקם אלקטריק')) detectedStore = 'Shekem Electric';
    else if (html.includes('אייבורי') || html.includes('Ivory')) detectedStore = 'Ivory';
    else if (html.includes('KSP') || html.includes('קיי אס פי')) detectedStore = 'KSP';
    else if (html.includes('אלם') || html.includes('א.ל.ם')) detectedStore = 'A.L.M';

    return res.status(200).json({
      success: true,
      program_code: 'haver',
      detected_store: detectedStore,
      discount_value: discountValue,
      discount_unit: 'percent',
      benefit_type: 'credit_card',
      source_url: url,
      raw_title: html.match(/<title>(.*?)<\/title>/i)?.[1] || 'הטבת חבר',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
