import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_FILE = join(__dirname, '../../data/card-index.json');

let index = { meta: { count: 0 }, cards: {}, byName: {} };
let loaded = false;

// Cartes célèbres absentes de l'API ou nécessitant une correspondance manuelle
const SPECIAL_CARDS = {
  'pikachu illustrator': {
    img: 'https://archives.bulbagarden.net/media/upload/thumb/5/5f/Pok%C3%A9monIllustratorCoroCoropromo.jpg/250px-Pok%C3%A9monIllustratorCoroCoropromo.jpg',
    name: 'Pikachu Illustrator', set: 'CoroCoro Comics Promo 1998', rarity: 'Promo (Unnumbered)'
  },
  // Dialga/Palkia VSTAR = "Origin Forme" dans l'API
  'dialga vstar alt art': {
    img: 'https://images.pokemontcg.io/swsh10/210.png',
    name: 'Origin Forme Dialga VSTAR', set: 'Astral Radiance', rarity: 'Rare Secret'
  },
  'palkia vstar alt art': {
    img: 'https://images.pokemontcg.io/swsh10/208.png',
    name: 'Origin Forme Palkia VSTAR', set: 'Astral Radiance', rarity: 'Rare Secret'
  },
  // Rayquaza ex SIR n'existe pas en SV — meilleure version disponible
  'rayquaza ex sir': {
    img: 'https://images.pokemontcg.io/swsh12tg/TG29.png',
    name: 'Rayquaza VMAX', set: 'Silver Tempest TG', rarity: 'Rare Secret'
  },
  // Mewtwo ex SIR → Team Rocket's Mewtwo ex SIR (sv10)
  'mewtwo ex sir': {
    img: 'https://images.pokemontcg.io/sv10/231.png',
    name: "Team Rocket's Mewtwo ex", set: 'Destined Rivals', rarity: 'Special Illustration Rare'
  },
  // Zygarde SIR = Mega Zygarde ex dans l'API
  'zygarde sir': {
    img: 'https://images.scrydex.com/pokemon/me3-120/small',
    name: 'Mega Zygarde ex', set: 'Prismatic Evolutions', rarity: 'Special Illustration Rare'
  },
  // Lugia V Alt Art
  'lugia v alt art': {
    img: 'https://images.pokemontcg.io/swsh12/186.png',
    name: 'Lugia V', set: 'Silver Tempest', rarity: 'Rare Ultra'
  },
};

// Nuno validation state
const _validated = new Map(); // name.toLowerCase() → { img, name, set, rarity, score, at }
let _validatorRunning = false;
let _validatorProgress = 0;
let _validatorTotal = 0;
let _validatorCycles = 0;

// Variant suffixes that indicate special rarities
const RARITY_HINTS = {
  'sar': 'Special Illustration Rare',
  'sir': 'Special Illustration Rare',
  'alt art': 'Special Illustration Rare',
  'alt': 'Illustration Rare',
  'ir': 'Illustration Rare',
  'hr': 'Hyper Rare',
  'ur': 'Ultra Rare',
  'sr': 'Super Rare',
  'ex': null,        // ex is part of the name, not a rarity suffix
  'vmax': null,
  'vstar': null,
  'v': null,
  'gx': null,
  'promo': 'Promo',
  'full art': 'Rare Ultra',
  'fa': 'Rare Ultra',
  'ra': 'Rare Illustration',
  'ssr': 'Special Super Rare',
};

// Returns { base, rarityHint } — strips trailing rarity-only suffixes
function parseCardName(fullName) {
  // Supprime les suffixes entre parenthèses ex: "(OP)", "(JPN)" avant l'analyse
  const clean = fullName.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const lower = clean.toLowerCase();
  // Try longest suffix match first
  const keys = Object.keys(RARITY_HINTS).sort((a, b) => b.length - a.length);
  for (const suffix of keys) {
    if (lower.endsWith(' ' + suffix)) {
      const hint = RARITY_HINTS[suffix];
      const base = clean.slice(0, clean.length - suffix.length - 1).trim();
      return { base, rarityHint: hint, suffix };
    }
  }
  return { base: clean, rarityHint: null, suffix: null };
}

// Score a candidate card against the search query
function scoreMatch(card, baseName, rarityHint, cardId) {
  const nameLow = card.n.toLowerCase();
  const baseL = baseName.toLowerCase();
  const baseWords = baseL.split(' ');

  let score = 0;

  // Exact base name match
  if (nameLow === baseL) score += 100;
  // Name starts with base
  else if (nameLow.startsWith(baseL)) score += 75;
  // Base starts with name (e.g. "Charizard" matches "Charizard ex")
  else if (baseL.startsWith(nameLow)) score += 60;
  // Word coverage
  else {
    const covered = baseWords.filter(w => nameLow.includes(w)).length;
    score += Math.round((covered / baseWords.length) * 40);
  }

  // Rarity bonus based on query hint
  const rLow = (card.r || '').toLowerCase();
  if (rarityHint) {
    const hintLow = rarityHint.toLowerCase();
    if (rLow === hintLow) score += 50;
    else if (rarityHint === 'Special Illustration Rare') {
      // Alt Art en ère SWSH = Rainbow Rare / Rare Secret / Alternate Art
      if (rLow.includes('rainbow') || rLow.includes('rare secret') || rLow.includes('alternate')) score += 35;
      else if (rLow.includes('illustration')) score += 20;
    }
  }

  // Bonus universel : préférer les variantes premium aux promos/holos basiques
  if (rLow.includes('special illustration') || rLow.includes('hyper rare')) score += 25;
  else if (rLow.includes('rainbow') || rLow.includes('rare secret') || rLow.includes('rare ultra')) score += 18;
  else if (rLow === 'promo') score -= 10;

  // Bonus pour numéros élevés (> 200) → cartes secrètes/spéciales dans ère SWSH
  if (cardId) {
    const num = parseInt((cardId.split('-').pop() || '').replace(/\D/g, '')) || 0;
    if (num > 200) score += 12;
  }

  return score;
}

function loadIndex() {
  if (loaded) return;
  loaded = true;
  if (!existsSync(INDEX_FILE)) {
    console.log('⚠  Nuno absent — lance : node scripts/build-card-index.js');
    return;
  }
  try {
    index = JSON.parse(readFileSync(INDEX_FILE, 'utf8'));
    console.log(`🧠 Nuno chargé — ${index.meta?.count?.toLocaleString() || 0} cartes connues`);
    startNunoValidator();
  } catch (e) {
    console.error('❌ Erreur lecture card-index.json :', e.message);
  }
}

// Validate a single card name → best match
function nunoValidate(fullName) {
  const { base, rarityHint } = parseCardName(fullName);
  const needle = base.toLowerCase();
  const words = needle.split(' ');

  const exactIds = index.byName[needle] || [];
  const firstIds = index.byName[words[0]] || [];
  const twoKey = words.slice(0, 2).join(' ');
  const twoIds = index.byName[twoKey] || [];

  const seen = new Set();
  const candidates = [...exactIds, ...twoIds, ...firstIds].filter(id => {
    if (seen.has(id)) return false;
    seen.add(id); return true;
  });

  if (!candidates.length) return null;

  const scored = candidates.map(id => {
    const c = index.cards[id];
    if (!c) return null;
    const score = scoreMatch(c, base, rarityHint, id);
    return { id, img: c.i, name: c.n, set: c.s, rarity: c.r, score };
  }).filter(Boolean).sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best || best.score < 10) return null;
  return { img: best.img, name: best.name, set: best.set, rarity: best.rarity, score: best.score, at: Date.now() };
}

// Background validator — continuously scans all card names in the index
async function startNunoValidator() {
  if (_validatorRunning) return;
  _validatorRunning = true;

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  console.log('🔍 Nuno démarre la vérification continue des photos…');

  // Pré-charge les cas spéciaux dans le cache validé
  for (const [key, data] of Object.entries(SPECIAL_CARDS)) {
    _validated.set(key, { ...data, at: Date.now() });
  }
  console.log(`   ${Object.keys(SPECIAL_CARDS).length} carte(s) spéciale(s) chargée(s) (hors API)`);

  while (true) {
    const ids = Object.keys(index.cards);
    _validatorTotal = ids.length;
    _validatorProgress = 0;

    if (ids.length === 0) {
      await sleep(10000);
      continue;
    }

    // Build a deduplicated list of card names to validate
    const namesToValidate = new Map(); // normalizedName → fullName
    for (const id of ids) {
      const c = index.cards[id];
      if (!c?.n) continue;
      const key = c.n.toLowerCase();
      if (!namesToValidate.has(key)) namesToValidate.set(key, c.n);
    }

    let checked = 0;
    for (const [key, fullName] of namesToValidate) {
      const result = nunoValidate(fullName);
      if (result) _validated.set(key, result);
      checked++;
      _validatorProgress = checked;

      // Yield every 200 cards to avoid blocking the event loop
      if (checked % 200 === 0) await sleep(0);
    }

    _validatorCycles++;
    console.log(`✅ Nuno — cycle ${_validatorCycles} terminé : ${namesToValidate.size.toLocaleString()} noms vérifiés`);

    // Wait 10 minutes before next cycle
    await sleep(1000 * 60 * 10);
  }
}

// GET /api/cards/img?name=Charizard+ex+SAR
export function getCardImg(req, res) {
  loadIndex();
  const raw = (req.query.name || '').trim();
  if (!raw) return res.json({ img: '', cards: [] });

  const key = raw.toLowerCase();

  // 0. Cartes spéciales codées en dur (hors API)
  const special = SPECIAL_CARDS[key];
  if (special) {
    return res.json({
      img: special.img,
      name: special.name,
      set: special.set,
      cards: [{ img: special.img, name: special.name, set: special.set, rarity: special.rarity }],
      source: 'nuno-special'
    });
  }

  // 1. Check Nuno's validated cache first
  const cached = _validated.get(key);
  if (cached) {
    return res.json({
      img: cached.img,
      name: cached.name,
      set: cached.set,
      cards: [{ img: cached.img, name: cached.name, set: cached.set, rarity: cached.rarity }],
      source: 'nuno-cache'
    });
  }

  // 2. Smart real-time lookup
  const { base, rarityHint } = parseCardName(raw);
  const needle = base.toLowerCase();
  const words = needle.split(' ');

  const exactIds = index.byName[needle] || [];
  const firstIds = index.byName[words[0]] || [];
  const twoKey = words.slice(0, 2).join(' ');
  const twoIds = index.byName[twoKey] || [];

  const seen = new Set();
  const candidates = [...exactIds, ...twoIds, ...firstIds].filter(id => {
    if (seen.has(id)) return false;
    seen.add(id); return true;
  });

  if (!candidates.length) return res.json({ img: '', cards: [] });

  const scored = candidates.map(id => {
    const c = index.cards[id];
    if (!c) return null;
    const score = scoreMatch(c, base, rarityHint, id);
    return { id, img: c.i, name: c.n, set: c.s, rarity: c.r, score };
  }).filter(Boolean).sort((a, b) => b.score - a.score);

  // Store result in validated cache
  const best = scored[0];
  _validated.set(key, { img: best.img, name: best.name, set: best.set, rarity: best.rarity, score: best.score, at: Date.now() });

  res.json({
    img: best?.img || '',
    name: best?.name || '',
    set: best?.set || '',
    cards: scored.slice(0, 6).map(c => ({ img: c.img, name: c.name, set: c.set, rarity: c.rarity })),
    source: 'nuno-live'
  });
}

// Traduction noms français → anglais (Pokémon TCG API utilise l'anglais)
const FR_TO_EN = {
  'dracaufeu':'charizard','salamèche':'charmander','reptincel':'charmeleon',
  'carapuce':'squirtle','carabaffe':'wartortle','tortank':'blastoise',
  'bulbizarre':'bulbasaur','herbizarre':'ivysaur','florizarre':'venusaur',
  'ronflex':'snorlax','rondoudou':'jigglypuff','grodoudou':'wigglytuff',
  'evoli':'eevee','aquali':'vaporeon','pyroli':'flareon','voltali':'jolteon',
  'mentali':'espeon','noctali':'umbreon','givrali':'glaceon','feuilleon':'leafeon','nymphali':'sylveon',
  'pikachu':'pikachu','raichu':'raichu','magicarpe':'magikarp','léviator':'gyarados',
  'mewtwo':'mewtwo','mew':'mew','lokhlass':'lapras','ronflex':'snorlax',
  'dracolosse':'dragonite','dragonite':'dragonite','draco':'dragonair','minidraco':'dratini',
  'électhor':'zapdos','sulfura':'moltres','artikodin':'articuno',
  'lugia':'lugia','ho-oh':'ho-oh','suicune':'suicune','raikou':'raikou','entei':'entei',
  'celebi':'celebi','mew':'mew','deoxys':'deoxys','rayquaza':'rayquaza',
  'kyogre':'kyogre','groudon':'groudon','latios':'latios','latias':'latias',
  'lucario':'lucario','darkrai':'darkrai','arceus':'arceus','dialga':'dialga','palkia':'palkia','giratina':'giratina',
  'zoroark':'zoroark','reshiram':'reshiram','zekrom':'zekrom','kyurem':'kyurem',
  'sylveon':'sylveon','xerneas':'xerneas','yveltal':'yveltal','zygarde':'zygarde',
  'solgaleo':'solgaleo','lunala':'lunala','marshadow':'marshadow','necrozma':'necrozma',
  'zacian':'zacian','zamazenta':'zamazenta','eternatus':'eternatus','calyrex':'calyrex',
  'griknot':'miraidon','coraidon':'koraidon','miraidon':'miraidon',
  'goupix':'vulpix','feunard':'ninetales','caninos':'growlithe','arcanin':'arcanine',
  'abra':'abra','kadabra':'kadabra','alakazam':'alakazam',
  'machoc':'machop','machopeur':'machoke','mackogneur':'machamp',
  'fantominus':'gastly','spectrum':'haunter','ectoplasma':'gengar',
  'onix':'onix','hypnomade':'drowzee','hypno':'hypno',
  'crabe':'krabby','krabboss':'kingler','voltorbe':'voltorb','électrode':'electrode',
  'nœunœuf':'exeggcute','noadkoko':'exeggutor',
  'osselait':'cubone','ossatueur':'marowak',
  'kicklee':'hitmonlee','tygnon':'hitmonchan',
  'lipoutou':'lickitung','koffing':'koffing','weezing':'weezing',
  'rhinocorne':'rhyhorn','rhinoféros':'rhydon',
  'leveinard':'chansey','kangourex':'kangaskhan',
  'tentacool':'tentacool','tentacruel':'tentacruel',
  'tauros':'tauros','poissirène':'horsea','hypocéan':'seadra',
  'goldeen':'goldeen','colis':'seaking',
  'stari':'staryu','staross':'starmie',
  'mime':'mr-mime','insecateur':'scyther','jynx':'jynx',
  'electabuzz':'electabuzz','magmar':'magmar','scarabaffe':'pinsir',
  'tauros':'tauros','faucon':'fearow','piafabec':'spearow',
  'papilusion':'butterfree','dardargnan':'beedrill','aspicot':'weedle','coconfort':'kakuna',
  'chenipan':'caterpie','chrysacier':'metapod',
  'nidoran':'nidoran','nidorina':'nidorina','nidoqueen':'nidoqueen',
  'nidorino':'nidorino','nidoking':'nidoking',
  'gardevoir':'gardevoir','gallade':'gallade',
  'dracovish':'dracovish','dracolosse':'dragonite',
  'terapagos':'terapagos','coraidon':'koraidon',
};

function translateQuery(q) {
  const lower = q.toLowerCase().trim();
  // Essaie le nom complet d'abord
  if (FR_TO_EN[lower]) return FR_TO_EN[lower];
  // Essaie le premier mot
  const first = lower.split(' ')[0];
  if (FR_TO_EN[first]) {
    return FR_TO_EN[first] + (lower.slice(first.length));
  }
  return q;
}

// GET /api/cards/search-fast?q=Pikachu
export function searchFast(req, res) {
  loadIndex();
  const raw = (req.query.q || '').trim().toLowerCase();
  if (!raw) return res.json({ cards: [] });

  // Traduit si nécessaire (français → anglais)
  const q = translateQuery(raw);
  const word = q.split(' ')[0];
  const ids = index.byName[word] || [];

  const results = ids
    .map(id => ({ id, ...index.cards[id] }))
    .filter(c => c.n?.toLowerCase().includes(q))
    .map(c => ({ name: c.n, imageSmall: c.i, set: c.s, rarity: c.r }));

  res.json({ cards: results, total: results.length, translated: q !== raw ? q : undefined });
}

// GET /api/cards/status
export function indexStatus(req, res) {
  loadIndex();
  res.json({
    loaded: loaded && index.meta.count > 0,
    count: index.meta.count || 0,
    sets: index.meta.sets || 0,
    updated: index.meta.updated || null,
    validator: {
      running: _validatorRunning,
      cycles: _validatorCycles,
      progress: _validatorProgress,
      total: _validatorTotal,
      validated: _validated.size,
      pct: _validatorTotal > 0 ? Math.round((_validatorProgress / _validatorTotal) * 100) : 0
    }
  });
}
