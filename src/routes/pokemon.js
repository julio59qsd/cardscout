import { localPhotos } from '../lib/photoIndex.js';

const POKEMON_API = 'https://api.pokemontcg.io/v2';
const API_KEY = process.env.POKEMON_API_KEY || '';

const headers = API_KEY ? { 'X-Api-Key': API_KEY } : {};

// Cache simple en mémoire
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 30;       // 30 min pour les recherches
const TRENDING_TTL = 1000 * 60 * 60 * 2; // 2h pour les tendances

const TRENDING_NAMES = ['charizard','pikachu','mewtwo','umbreon','rayquaza','lugia','eevee','mew','gengar','blastoise','sylveon','espeon','glaceon','giratina','darkrai','dialga','palkia','arceus','snorlax','garchomp','gardevoir','lucario','dragonite','gyarados','alakazam','typhlosion','raichu'];

function setCache(key, data, ttl = CACHE_TTL) {
  cache.set(key, { data, ts: Date.now(), ttl });
}
function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > (entry.ttl || CACHE_TTL)) { cache.delete(key); return null; }
  return entry.data;
}

export async function getTrending(req, res) {
  const cacheKey = 'poke_trending';
  const cached = getCache(cacheKey);
  if (cached) return res.json({ cards: cached, source: 'cache' });

  try {
    const results = await Promise.all(
      TRENDING_NAMES.map(q =>
        fetch(`${POKEMON_API}/cards?q=${encodeURIComponent(`name:${q}*`)}&pageSize=6&orderBy=-set.releaseDate`, { headers })
          .then(r => r.ok ? r.json() : { data: [] })
          .then(d => {
            const list = (d.data || []).map(formatPokemonCard);
            return list.find(c => (c.prices?.cardmarket?.avg || c.prices?.cardmarket?.trend || c.prices?.tcgplayer?.market || 0) > 0) || list[0];
          })
          .catch(() => null)
      )
    );
    const cards = results.filter(Boolean);
    setCache(cacheKey, cards, TRENDING_TTL);
    res.json({ cards, source: 'api.pokemontcg.io' });
  } catch (err) {
    res.status(500).json({ error: err.message, cards: [] });
  }
}

const ENERGIE_MEGA = [
  { id:'me-e1', name:'Énergie Feu', set:'Energie Mega Evolution', number:'1', setTotal:'8', rarity:'Energy', supertype:'Energy', universe:'pokemon', emoji:'🔥', prices:{cardmarket:{avg:0.5,low:0.2,trend:0.4}} },
  { id:'me-e2', name:'Énergie Eau', set:'Energie Mega Evolution', number:'2', setTotal:'8', rarity:'Energy', supertype:'Energy', universe:'pokemon', emoji:'💧', prices:{cardmarket:{avg:0.5,low:0.2,trend:0.4}} },
  { id:'me-e3', name:'Énergie Plante', set:'Energie Mega Evolution', number:'3', setTotal:'8', rarity:'Energy', supertype:'Energy', universe:'pokemon', emoji:'🌿', prices:{cardmarket:{avg:0.5,low:0.2,trend:0.4}} },
  { id:'me-e4', name:'Énergie Électrique', set:'Energie Mega Evolution', number:'4', setTotal:'8', rarity:'Energy', supertype:'Energy', universe:'pokemon', emoji:'⚡', prices:{cardmarket:{avg:0.5,low:0.2,trend:0.4}} },
  { id:'me-e5', name:'Énergie Psy', set:'Energie Mega Evolution', number:'5', setTotal:'8', rarity:'Energy', supertype:'Energy', universe:'pokemon', emoji:'🔮', prices:{cardmarket:{avg:0.5,low:0.2,trend:0.4}} },
  { id:'me-e6', name:'Énergie Combat', set:'Energie Mega Evolution', number:'6', setTotal:'8', rarity:'Energy', supertype:'Energy', universe:'pokemon', emoji:'🥊', prices:{cardmarket:{avg:0.5,low:0.2,trend:0.4}} },
  { id:'me-e7', name:'Énergie Obscurité', set:'Energie Mega Evolution', number:'7', setTotal:'8', rarity:'Energy', supertype:'Energy', universe:'pokemon', emoji:'🌑', prices:{cardmarket:{avg:0.5,low:0.2,trend:0.4}} },
  { id:'me-e8', name:'Énergie Métal', set:'Energie Mega Evolution', number:'8', setTotal:'8', rarity:'Energy', supertype:'Energy', universe:'pokemon', emoji:'⚙️', prices:{cardmarket:{avg:0.5,low:0.2,trend:0.4}} },
];

export async function searchPokemon(req, res) {
  const { q = '', rarity = '', page = 1, pageSize = 60, number: cardNumber = '', setId = '', setName = '' } = req.query;
  const cacheKey = `poke_${q}_${rarity}_${page}_${pageSize}_${cardNumber}_${setId}_${setName}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json({ ...cached, source: 'cache' });

  if (setId === 'me-energie') {
    return res.json({ cards: ENERGIE_MEGA, total: ENERGIE_MEGA.length, source: 'local' });
  }

  try {
    const parts = [];
    if (q) parts.push(`name:${q}*`);
    if (cardNumber) parts.push(`number:${cardNumber}`);
    if (rarity) parts.push(`rarity:"${rarity}"`);
    if (setId) parts.push(`set.id:${setId}`);
    if (setName) parts.push(`set.name:"${setName}"`);
    if (!parts.length) parts.push('supertype:pokemon');
    const query = parts.join(' ');

    let cards = [];
    let total = 0;

    if (setId) {
      // Récupère toutes les pages pour avoir la totalité du set
      let currentPage = 1;
      while (true) {
        const url = `${POKEMON_API}/cards?q=${encodeURIComponent(query)}&pageSize=250&page=${currentPage}&orderBy=number`;
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error(`API Pokémon: HTTP ${response.status}`);
        const data = await response.json();
        const batch = (data.data || []).map(formatPokemonCard);
        cards = [...cards, ...batch];
        total = data.totalCount || cards.length;
        if (cards.length >= total || batch.length === 0) break;
        currentPage++;
      }
    } else {
      const url = `${POKEMON_API}/cards?q=${encodeURIComponent(query)}&pageSize=${Math.min(Number(pageSize),250)}&page=${page}&orderBy=-set.releaseDate`;
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`API Pokémon: HTTP ${response.status}`);
      const data = await response.json();
      cards = (data.data || []).map(formatPokemonCard);
      total = data.totalCount || 0;
      const hasPrice = c => (c.prices?.cardmarket?.avg || c.prices?.cardmarket?.trend || c.prices?.tcgplayer?.market || 0) > 0;
      cards.sort((a, b) => Number(hasPrice(b)) - Number(hasPrice(a)));
    }

    const result = {
      cards,
      total,
      page: Number(page),
      pageSize: cards.length,
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

    const CUSTOM_SETS = [
      { id:'me-energie', name:'Energie Mega Evolution', series:'Mega Evolution', total:8, releaseDate:'', logo:'https://images.pokemontcg.io/me1/188.png', symbol:'https://images.pokemontcg.io/me1/symbol.png', universe:'pokemon' },
      { id:'me-promos', name:'Promos Mega Evolution', series:'Mega Evolution', total:53, releaseDate:'', logo:'https://images.pokemontcg.io/me1/187.png', symbol:'https://images.pokemontcg.io/me1/symbol.png', universe:'pokemon' },
    ];

    const result = {
      sets: [
        ...(data.data || []).map(s => ({
          id: s.id,
          name: s.name,
          series: s.series,
          total: s.total,
          releaseDate: s.releaseDate,
          logo: s.images?.logo || '',
          symbol: s.images?.symbol || '',
          universe: 'pokemon'
        })),
        ...CUSTOM_SETS,
      ],
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
  // Prend le premier prix TCGPlayer disponible (holofoil, 1st ed, unlimited, normal)
  const tcgAll = c.tcgplayer?.prices || {};
  // Prend le meilleur prix TCG parmi tous les variants disponibles
  const tcgBest = Object.values(tcgAll).reduce((best, v) => {
    const m = v?.market || v?.mid || 0;
    return m > (best?.market || 0) ? { market: m, mid: v?.mid || 0, low: v?.low || 0 } : best;
  }, {});

  const cmAvg = cmPrices.averageSellPrice || cmPrices.trendPrice || cmPrices.avg1 || cmPrices.lowPrice || 0;
  const tcgMarket = tcgBest.market || tcgBest.mid || 0;

  return {
    id: c.id,
    name: c.name,
    set: c.set?.name || '—',
    setId: c.set?.id || '',
    number: c.number || '—',
    setTotal: c.set?.printedTotal || c.set?.total || '?',
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
        avg: cmAvg,
        low: cmPrices.lowPrice || 0,
        trend: cmPrices.trendPrice || 0,
        avg7: cmPrices.avg7 || 0,
        avg30: cmPrices.avg30 || 0,
      },
      tcgplayer: {
        market: tcgMarket,
        mid: tcgBest.mid || 0,
        low: tcgBest.low || 0,
      }
    },
    universe: 'pokemon',
    tcgplayerUrl: c.tcgplayer?.url || ''
  };
}
