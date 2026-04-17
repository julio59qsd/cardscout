import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_FILE = join(__dirname, '../../data/card-index.json');

let index = { meta: { count: 0 }, cards: {}, byName: {} };
let loaded = false;

// Cartes célèbres absentes de l'API pokemontcg.io — images fiables codées en dur
const SPECIAL_CARDS = {
  'pikachu illustrator': {
    img: 'https://archives.bulbagarden.net/media/upload/thumb/5/5f/Pok%C3%A9monIllustratorCoroCoropromo.jpg/250px-Pok%C3%A9monIllustratorCoroCoropromo.jpg',
    name: 'Pikachu Illustrator',
    set: 'CoroCoro Comics Promo 1998',
    rarity: 'Promo (Unnumbered)',
    score: 200
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
  const lower = fullName.toLowerCase().trim();
  // Try longest suffix match first
  const keys = Object.keys(RARITY_HINTS).sort((a, b) => b.length - a.length);
  for (const suffix of keys) {
    if (lower.endsWith(' ' + suffix)) {
      const hint = RARITY_HINTS[suffix];
      const base = fullName.slice(0, fullName.length - suffix.length - 1).trim();
      return { base, rarityHint: hint, suffix };
    }
  }
  return { base: fullName.trim(), rarityHint: null, suffix: null };
}

// Score a candidate card against the search query
function scoreMatch(card, baseName, rarityHint) {
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

  // Rarity bonus
  if (rarityHint && card.r) {
    const rLow = card.r.toLowerCase();
    const hintLow = rarityHint.toLowerCase();
    if (rLow === hintLow) score += 50;
    else if (rLow.includes('illustration')) score += 20;
    else if (rLow.includes('special')) score += 15;
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
    const score = scoreMatch(c, base, rarityHint);
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
    const score = scoreMatch(c, base, rarityHint);
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

// GET /api/cards/search-fast?q=Pikachu
export function searchFast(req, res) {
  loadIndex();
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ cards: [] });

  const word = q.split(' ')[0];
  const ids = index.byName[word] || [];

  const results = ids
    .map(id => ({ id, ...index.cards[id] }))
    .filter(c => c.n?.toLowerCase().includes(q))
    .slice(0, 20)
    .map(c => ({ name: c.n, imageSmall: c.i, set: c.s, rarity: c.r }));

  res.json({ cards: results, total: results.length });
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
