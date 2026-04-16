import { localPhotos } from '../lib/photoIndex.js';

const POKEMON_API = 'https://api.pokemontcg.io/v2';
const API_KEY = process.env.POKEMON_API_KEY || '';

const headers = API_KEY ? { 'X-Api-Key': API_KEY } : {};

// Cache simple en mémoire
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

export async function searchPokemon(req, res) {
  const { q = 'charizard', rarity = '', page = 1, pageSize = 20 } = req.query;
  const cacheKey = `poke_${q}_${rarity}_${page}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json({ ...cached, source: 'cache' });

  try {
    let query = `name:${q}*`;
    if (rarity) query += ` rarity:"${rarity}"`;

    const url = `${POKEMON_API}/cards?q=${encodeURIComponent(query)}&pageSize=${pageSize}&page=${page}&orderBy=-set.releaseDate`;
    const response = await fetch(url, { headers });

    if (!response.ok) throw new Error(`API Pokémon: HTTP ${response.status}`);
    const data = await response.json();

    const result = {
      cards: (data.data || []).map(formatPokemonCard),
      total: data.totalCount || 0,
      page: data.page || 1,
      pageSize: data.pageSize || 20,
      source: 'api.pokemontcg.io'
    };

    setCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('Pokémon API error:', err.message);
    res.status(500).json({ error: err.message, cards: [] });
  }
}

export async function getPokemonSets(req, res) {
  const cacheKey = 'poke_sets';
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const response = await fetch(`${POKEMON_API}/sets?orderBy=-releaseDate&pageSize=100`, { headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    const result = {
      sets: (data.data || []).map(s => ({
        id: s.id,
        name: s.name,
        series: s.series,
        total: s.total,
        releaseDate: s.releaseDate,
        logo: s.images?.logo || '',
        symbol: s.images?.symbol || '',
        universe: 'pokemon'
      })),
      source: 'api.pokemontcg.io'
    };

    setCache(cacheKey, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message, sets: [] });
  }
}

function formatPokemonCard(c) {
  const cmPrices = c.cardmarket?.prices || {};
  const tcgPrices = c.tcgplayer?.prices?.holofoil ||
                    c.tcgplayer?.prices?.['1stEditionHolofoil'] ||
                    c.tcgplayer?.prices?.normal || {};
  return {
    id: c.id,
    name: c.name,
    set: c.set?.name || '—',
    setId: c.set?.id || '',
    number: c.number || '—',
    rarity: c.rarity || '—',
    types: c.types || [],
    supertype: c.supertype || '',
    subtypes: c.subtypes || [],
    hp: c.hp || '',
    imageSmall: c.images?.small || '',
    imageLarge: c.images?.large || '',
    localImage: localPhotos.has(c.id) ? `/photos/${localPhotos.get(c.id)}` : '',
    prices: {
      cardmarket: {
        avg: cmPrices.averageSellPrice || 0,
        low: cmPrices.lowPrice || 0,
        trend: cmPrices.trendPrice || 0,
        avg7: cmPrices.avg7DayAverage || 0,
        avg30: cmPrices.avg30DayAverage || 0,
      },
      tcgplayer: {
        market: tcgPrices.market || 0,
        mid: tcgPrices.mid || 0,
        low: tcgPrices.low || 0,
      }
    },
    universe: 'pokemon',
    tcgplayerUrl: c.tcgplayer?.url || ''
  };
}
