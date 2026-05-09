import { localPhotos } from '../lib/photoIndex.js';
import { CARDS, SETS } from '../lib/localData.js';
import { getPokecardexSets, getPokecardexCards, isPokecardexSetId, getPokecardexMergeMap } from '../lib/pokecardexLocal.js';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Cache prix pré-construit (build via scripts/build-price-cache.js)
const PRICE_CACHE_FILE = join(__dirname, '../../data/price-cache.json');
let priceCache = {};
try {
  if (existsSync(PRICE_CACHE_FILE)) {
    priceCache = JSON.parse(readFileSync(PRICE_CACHE_FILE, 'utf8'));
    console.log(`💰 ${Object.keys(priceCache).length} prix en cache local`);
  }
} catch {}

const POKEMON_API = 'https://api.pokemontcg.io/v2';
const API_KEY = process.env.POKEMON_API_KEY || '';
const TRENDING_DISK_CACHE = join(__dirname, '../../data/trending-cache.json');
const SETS_DISK_CACHE = join(__dirname, '../../data/sets-cache.json');

const headers = API_KEY ? { 'X-Api-Key': API_KEY } : {};

// Cache simple en mémoire
const cache = new Map();
const CACHE_TTL = 1000 * 60 * 30;       // 30 min pour les recherches
const TRENDING_TTL = 1000 * 60 * 60 * 2; // 2h pour les tendances

const TRENDING_NAMES = [
  'charizard','pikachu','mewtwo','umbreon','rayquaza','lugia','eevee','mew','gengar','blastoise',
  'sylveon','espeon','glaceon','giratina','darkrai','dialga','palkia','arceus','snorlax','garchomp',
  'gardevoir','lucario','dragonite','gyarados','alakazam','togekiss','zoroark','raichu','typhlosion','melmetal'
];

function setCache(key, data, ttl = CACHE_TTL) {
  cache.set(key, { data, ts: Date.now(), ttl });
}
function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > (entry.ttl || CACHE_TTL)) { cache.delete(key); return null; }
  return entry.data;
}

// Charge le cache trending depuis le disque au démarrage
try {
  if (existsSync(TRENDING_DISK_CACHE)) {
    const { cards, ts } = JSON.parse(readFileSync(TRENDING_DISK_CACHE, 'utf8'));
    if (Date.now() - ts < TRENDING_TTL) setCache('poke_trending', cards, TRENDING_TTL - (Date.now() - ts));
  }
} catch {}

// Charge le cache sets depuis le disque au démarrage (persiste 7 jours)
const SETS_TTL = 1000 * 60 * 60 * 24 * 7;
try {
  if (existsSync(SETS_DISK_CACHE)) {
    const { result, ts } = JSON.parse(readFileSync(SETS_DISK_CACHE, 'utf8'));
    if (Date.now() - ts < SETS_TTL) {
      setCache('poke_sets', result, SETS_TTL - (Date.now() - ts));
      console.log(`📦 ${result.sets?.length} sets Pokémon chargés depuis le cache disque`);
    }
  }
} catch {}

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
    // Dédoublonne par ID et limite à 24 cartes
    const seen = new Set();
    const cards = results.filter(Boolean).filter(c => {
      if (!c.id || seen.has(c.id)) return false;
      seen.add(c.id); return true;
    }).slice(0, 24);
    setCache(cacheKey, cards, TRENDING_TTL);
    try { writeFileSync(TRENDING_DISK_CACHE, JSON.stringify({ cards, ts: Date.now() })); } catch {}
    res.json({ cards, source: 'api.pokemontcg.io' });
  } catch (err) {
    res.status(500).json({ error: err.message, cards: [] });
  }
}


// Traduit un nom français en nom anglais via PokéAPI GraphQL
async function translateFrName(name) {
  try {
    const body = JSON.stringify({ query: `{pokemon_v2_pokemonspeciesname(where:{language_id:{_eq:5},name:{_ilike:${JSON.stringify(name)}}},limit:1){pokemon_v2_pokemonspecies{name}}}` });
    const r = await fetch('https://beta.pokeapi.co/graphql/v1beta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const d = await r.json();
    return d.data?.pokemon_v2_pokemonspeciesname?.[0]?.pokemon_v2_pokemonspecies?.name || null;
  } catch { return null; }
}

export async function searchPokemon(req, res) {
  const { q = '', rarity = '', page = 1, pageSize = 60, number: cardNumber = '', setId = '', setName = '' } = req.query;
  const cacheKey = `poke_${q}_${rarity}_${page}_${pageSize}_${cardNumber}_${setId}_${setName}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json({ ...cached, source: 'cache' });

  try {
    // Cartes Pokecardex scrapées (setId commence par "pcx_")
    if (setId && isPokecardexSetId(setId)) {
      const pcx = getPokecardexCards(setId);
      if (pcx) return res.json({ cards: pcx, total: pcx.length, page: 1, pageSize: pcx.length, source: 'Pokecardex' });
    }

    // N'utilise les données locales que si des cartes locales existent réellement pour ce set
    const localCards = setId ? CARDS.filter(c => c.setId === setId && c.universe === 'pokemon') : [];
    if (localCards.length > 0) {
      const localSet = SETS.find(s => s.id === setId && s.universe === 'pokemon') || { cards: localCards.length };
      return res.json({ cards: localCards.map(c => ({
        id: c.id, name: c.name, set: c.set, setId: c.setId, number: c.number,
        setTotal: localSet.cards, rarity: c.rarity, types: [], supertype: 'Energy',
        subtypes: ['Basic'], hp: '', imageSmall: c.imageSmall || '', imageLarge: c.imageLarge || '', localImage: '',
        prices: c.prices, universe: 'pokemon', tcgplayerUrl: ''
      })), total: localCards.length, page: 1, pageSize: localCards.length, source: 'CardScout local' });
    }

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

      // Aucun résultat → essaie de traduire le nom français en anglais
      if (cards.length === 0 && q) {
        const enName = await translateFrName(q);
        if (enName && enName.toLowerCase() !== q.toLowerCase()) {
          const trParts = [`name:${enName}*`];
          if (rarity) trParts.push(`rarity:"${rarity}"`);
          const trUrl = `${POKEMON_API}/cards?q=${encodeURIComponent(trParts.join(' '))}&pageSize=${Math.min(Number(pageSize),250)}&page=${page}&orderBy=-set.releaseDate`;
          const trResponse = await fetch(trUrl, { headers });
          if (trResponse.ok) {
            const trData = await trResponse.json();
            cards = (trData.data || []).map(formatPokemonCard);
            total = trData.totalCount || 0;
            cards.sort((a, b) => Number(hasPrice(b)) - Number(hasPrice(a)));
          }
        }
      }
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

function mergePokecardex(result) {
  const pcxStandalone = getPokecardexSets();
  const mergeMap = getPokecardexMergeMap();
  let sets = result.sets || [];

  // Fusion dans les sets existants : ajoute mergedIds + augmente total
  if (mergeMap.size) {
    sets = sets.map(s => {
      const children = mergeMap.get(s.id);
      if (!children) return s;
      const addedTotal = children.reduce((a, c) => a + (c.count || 0), 0);
      const addedIds = children.map(c => c.setId);
      return {
        ...s,
        total: (s.total || 0) + addedTotal,
        mergedIds: [...(s.mergedIds || [s.id]), ...addedIds]
      };
    });
  }

  // Ajoute les séries pokecardex non fusionnées
  if (pcxStandalone.length) {
    const existing = new Set(sets.map(s => s.id));
    const extras = pcxStandalone.filter(s => !existing.has(s.id));
    sets = [...sets, ...extras];
  }

  // Mapping manuel pour les sets dont les noms FR/EN diffèrent trop pour le matching
  // automatique (genre Pokécardex traduit "FireRed & LeafGreen" en "Rouge Feu & Vert Feuille")
  const MANUAL_DEDUP = new Set(['ex6']); // ex6 → pcx_RFVF
  sets = sets.filter(s => !MANUAL_DEDUP.has(s.id));

  // Dédup par nom : si un set pcx_ FR (zone fr) a le même nom (FR ou EN) qu'un set
  // natif, on masque le natif. Pokécardex devient la source de vérité pour le FR.
  // On retire les préfixes de bloc "EX :", "DP :", "Diamant & Perle :", "HS—", etc.
  // car Pokécardex préfixe ses noms de série alors que pokemontcg.io ne le fait pas.
  const stripPrefix = s => (s || '')
    .replace(/^(ex|dp|hs|swsh|sm|xy|bw|sv|pl|me)\s*[:\-—–]\s*/i, '')
    .replace(/^(diamant\s*&?\s*perle|diamond\s*&?\s*pearl|heartgold\s*&?\s*soulsilver|heartgold\s+soulsilver|black\s*&?\s*white|noir\s*(et|&)?\s*blanc|sword\s*&?\s*shield|[ée]p[eé]e\s*(et|&)?\s*bouclier|sun\s*&?\s*moon|soleil\s*(et|&)?\s*lune|scarlet\s*&?\s*violet|[eé]carlate\s*(et|&)?\s*violet|mega\s*-?\s*evolution|m[eé]ga\s*-?\s*[eé]volution|platine|platinum)\s*[:\-—–]\s*/i, '')
    .replace(/\s+(base set|set)$/i, '')  // "Expedition Base Set" → "Expedition" / "Base Set" → "Base"
    .trim();
  const norm = s => stripPrefix(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[:\-—–'&]/g, ' ').replace(/\b(and|et)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ').trim()
    .replace(/s$/, '');  // tolérance pluriel/singulier final
  const pcxFrNames = new Set();
  for (const s of sets) {
    if (s.id?.startsWith('pcx_') && !s.id.startsWith('pcx_jp_') && !s.id.startsWith('pcx_chn_')) {
      if (s.name) pcxFrNames.add(norm(s.name));
      if (s.nameEN) pcxFrNames.add(norm(s.nameEN));
    }
  }
  if (pcxFrNames.size) {
    sets = sets.filter(s => s.id?.startsWith('pcx_') || !pcxFrNames.has(norm(s.name)));
  }

  return { ...result, sets };
}

export async function getPokemonSets(req, res) {
  res.set('Cache-Control', 'no-store');
  const cacheKey = 'poke_sets';
  const cached = getCache(cacheKey);
  if (cached) return res.json(mergePokecardex(cached));

  try {
    const response = await fetch(`${POKEMON_API}/sets?orderBy=releaseDate&pageSize=250`, { headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    // Sous-sets à fusionner dans leur set parent (enfant → parent)
    const MERGE_INTO = {
      'swsh9tg':     'swsh9',      // Brilliant Stars TG (30) → 186+30 = 216
      'swsh10tg':    'swsh10',     // Astral Radiance TG (30) → 216+30 = 246
      'swsh11tg':    'swsh11',     // Lost Origin TG (30) → 217+30 = 247
      'swsh12tg':    'swsh12',     // Silver Tempest TG (30) → 215+30 = 245
      'swsh12pt5gg': 'swsh12pt5',  // Crown Zenith Galarian Gallery (70) → 160+70 = 230
      'swsh45sv':    'swsh45',     // Shining Fates Shiny Vault (122) → 73+122 = 195
      'sma':         'sm115',      // Hidden Fates Shiny Vault (94) → 69+94 = 163
      'cel25c':      'cel25',      // Celebrations Classic Collection (25) → 25+25 = 50
    };
    const childIds = new Set(Object.keys(MERGE_INTO));
    const mergeMap = {};
    for (const [childId, parentId] of Object.entries(MERGE_INTO)) {
      if (!mergeMap[parentId]) mergeMap[parentId] = [];
      mergeMap[parentId].push(childId);
    }

    // Sets à masquer — vérifiés via API pokemontcg.io
    const HIDE_SETS = new Set([
      // Promo Scarlet & Violet (masqué de la collection Scarlet & Violet)
      'svp',
      // Demande utilisateur : enlever Promo Sword & Shield de la collection Sword & Shield
      'swshp',
      // Demande utilisateur : enlever Promo Sun & Moon + Detective Pikachu de Sun & Moon
      'smp', 'det1',
      // Demande utilisateur : enlever Promo XY de la collection XY
      'xyp',
      // Demande utilisateur : enlever Promo Black & White de la collection Black & White
      'bwp',
      // Promos historiques (trop anciens / non suivis par les collectionneurs modernes)
      'basep', 'np', 'dpp', 'hsp',
      // POP Series (inserts tournois Organized Play, pas en vente publique)
      'pop1','pop2','pop3','pop4','pop5','pop6','pop7','pop8','pop9',
      // McDonald's Happy Meal promos
      'mcd11','mcd12','mcd14','mcd15','mcd16','mcd17','mcd18','mcd19','mcd21','mcd22',
      // Trainer Kits (decks pédagogiques 30 cartes, non boostés)
      'tk1a','tk1b','tk2a','tk2b',
      // Mini-sets non-standard / hors collection
      'sve',    // 8 cartes énergie uniquement
      'fut20',  // Pokémon Futsal (UEFA, hors TCG)
      'bp',     // Best of Game (tournois only)
      'ru1',    // Pokémon Rumble (lié jeu vidéo)
      'si1',    // Southern Islands (exclusif japonais)
      'xy0',    // Kalos Starter Set (deck starter, pas de numérotation)
      // Legendary Collection (données API incomplètes)
      'base6',
    ]);

    // Corrections de noms des sets promos majeurs
    const NAME_FIXES = {
      'bwp':   'Promo Black & White',
      'xyp':   'Promo XY',
      'smp':   'Promo Sun & Moon',
      'swshp': 'Promo Sword & Shield',
      'svp':   'Promo Scarlet & Violet',
    };

    const allApiSets = data.data || [];

    const apiSets = allApiSets
      .filter(s =>
        !HIDE_SETS.has(s.id) &&
        !childIds.has(s.id) &&
        !/jumbo/i.test(s.name) &&
        !/jumbo/i.test(s.series || '') &&
        !/mcd\d/i.test(s.id)  // filet de sécurité pour tout set McDonald's non listé
      )
      .map(s => {
        const children = mergeMap[s.id] || [];
        // Max(total, printedTotal) : corrige les anomalies API où printedTotal > total
        // (ex: swshp=307 officiel, svp=215 officiel — confirmé Bulbapedia)
        const baseCount = Math.max(s.total || 0, s.printedTotal || 0);
        const total = baseCount + children.reduce((sum, cid) => {
          const child = allApiSets.find(x => x.id === cid);
          return sum + (child ? Math.max(child.total || 0, child.printedTotal || 0) : 0);
        }, 0);
        return {
          id: s.id,
          name: NAME_FIXES[s.id] || s.name,
          series: s.series,
          total,
          releaseDate: s.releaseDate,
          logo: s.id === 'me1' ? 'https://images.pokemontcg.io/me1/182.png' : (s.images?.logo || ''),
          symbol: s.images?.symbol || '',
          coverImage: `https://images.pokemontcg.io/${s.id}/1_hires.png`,
          universe: 'pokemon',
          ...(children.length ? { mergedIds: [s.id, ...children] } : {})
        };
      });

    const localSets = SETS
      .filter(s => s.universe === 'pokemon' && s.series && s.id !== 'emeg')
      .map(s => ({
        id: s.id,
        name: s.name,
        series: s.series,
        total: s.cards,
        releaseDate: s.date,
        logo: s.logo || '',
        symbol: '',
        universe: 'pokemon',
        local: true
      }));

    const pcxSets = getPokecardexSets();

    const result = {
      sets: [...apiSets, ...localSets, ...pcxSets],
      source: 'api.pokemontcg.io'
    };

    setCache(cacheKey, result, SETS_TTL);
    try { writeFileSync(SETS_DISK_CACHE, JSON.stringify({ result, ts: Date.now() })); } catch {}
    res.json(mergePokecardex(result));
  } catch (err) {
    // 1. Cache disque (même expiré)
    try {
      if (existsSync(SETS_DISK_CACHE)) {
        const { result } = JSON.parse(readFileSync(SETS_DISK_CACHE, 'utf8'));
        if (result?.sets?.length) return res.json(mergePokecardex({ ...result, source: 'cache-disque' }));
      }
    } catch {}
    // 2. Fallback : sets locaux uniquement
    const localSets = SETS
      .filter(s => s.universe === 'pokemon' && s.series && s.id !== 'emeg')
      .map(s => ({ id: s.id, name: s.name, series: s.series, total: s.cards, releaseDate: s.date, logo: s.logo || '', symbol: '', universe: 'pokemon', local: true }));
    if (localSets.length) return res.json(mergePokecardex({ sets: localSets, source: 'local' }));
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

  const cmAvg = cmPrices.averageSellPrice || cmPrices.trendPrice
    || cmPrices.avg1 || cmPrices.avg7 || cmPrices.avg30
    || cmPrices.reverseHoloAvg1 || cmPrices.reverseHoloAvg7 || cmPrices.reverseHoloAvg30
    || cmPrices.reverseHoloTrend || cmPrices.reverseHoloSell
    || cmPrices.lowPriceExPlus || cmPrices.lowPrice
    || cmPrices.reverseHoloLow || cmPrices.germanProLow
    || cmPrices.suggestedPrice || 0;
  const tcgMarket = tcgBest.market || tcgBest.mid || tcgBest.low || 0;
  // Fallback : cache prix pré-construit
  const cachedPrice = (!cmAvg && !tcgMarket) ? (priceCache[c.id] || 0) : 0;

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
        avg: cmAvg || cachedPrice,
        low: cmPrices.lowPrice || 0,
        trend: cmPrices.trendPrice || 0,
        avg7: cmPrices.avg7 || 0,
        avg30: cmPrices.avg30 || 0,
        reverseHolo: cmPrices.reverseHoloAvg1 || cmPrices.reverseHoloAvg7 || cmPrices.reverseHoloAvg30 || cmPrices.reverseHoloTrend || cmPrices.reverseHoloSell || cmPrices.reverseHoloLow || 0,
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
