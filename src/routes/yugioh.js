const YGO_API = 'https://db.ygoprodeck.com/api/v7';

const cache = new Map();
const CACHE_TTL = 1000 * 60 * 30;

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) { cache.set(key, { data, ts: Date.now() }); }

export async function searchYGO(req, res) {
  const { q = 'Blue-Eyes', rarity = '', num = 20, offset = 0 } = req.query;
  const cacheKey = `ygo_${q}_${rarity}_${offset}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json({ ...cached, source: 'cache' });

  try {
    let url = `${YGO_API}/cardinfo.php?fname=${encodeURIComponent(q)}&num=${num}&offset=${offset}`;
    if (rarity) url += `&rarity=${encodeURIComponent(rarity)}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`YGO API: HTTP ${response.status}`);
    const data = await response.json();

    if (data.error) throw new Error(data.error);

    const result = {
      cards: (data.data || []).map(formatYGOCard),
      total: data.meta?.total_rows || 0,
      source: 'db.ygoprodeck.com'
    };

    setCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('YGO API error:', err.message);
    res.status(500).json({ error: err.message, cards: [] });
  }
}

export async function getYGOSets(req, res) {
  const cacheKey = 'ygo_sets';
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const response = await fetch(`${YGO_API}/cardsets.php`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    const result = {
      sets: (data || []).slice(0, 100).map(s => ({
        id: s.set_code,
        name: s.set_name,
        total: s.num_of_cards,
        releaseDate: s.tcg_date || '',
        universe: 'yugioh'
      })).filter(s => s.releaseDate),
      source: 'db.ygoprodeck.com'
    };

    setCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message, sets: [] });
  }
}

function formatYGOCard(c) {
  const set = c.card_sets?.[0] || {};
  const img = c.card_images?.[0] || {};
  const price = c.card_prices?.[0] || {};

  return {
    id: String(c.id),
    name: c.name,
    set: set.set_name || '—',
    setId: set.set_code || '',
    number: set.set_code || '—',
    rarity: set.set_rarity || '—',
    type: c.type || '',
    desc: c.desc || '',
    atk: c.atk,
    def: c.def,
    level: c.level,
    attribute: c.attribute || '',
    imageSmall: img.image_url_small || '',
    imageLarge: img.image_url || '',
    prices: {
      cardmarket: {
        avg: parseFloat(set.set_price) || 0,
        low: 0, trend: 0, avg7: 0, avg30: 0
      },
      tcgplayer: {
        market: parseFloat(price.tcgplayer_price) || 0,
        mid: parseFloat(price.tcgplayer_price) || 0,
        low: 0
      }
    },
    universe: 'yugioh'
  };
}
