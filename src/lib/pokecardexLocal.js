// Loader des séries Pokecardex scrapées (data/pokecardex/*.json)
// Expose les sets au format de l'API cardscout + leurs cartes.
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, '../../data/pokecardex');
const MENU_FILE = join(__dirname, '../../data/pokecardex-missing.json');

// Map shortName → { nameFR, nameEN, order } à partir du menu Pokecardex
// L'index dans `all` correspond à l'ordre d'affichage sur pokecardex.com (haut en bas)
const _shortNameToNames = new Map();
try {
  if (existsSync(MENU_FILE)) {
    const menu = JSON.parse(readFileSync(MENU_FILE, 'utf8'));
    (menu.all || []).forEach((s, idx) => {
      _shortNameToNames.set(s.shortName, {
        nameFR: s.nameFR || '',
        nameEN: s.nameEN || '',
        blocFR: s.blocFR || '',
        blocEN: s.blocEN || '',
        order: idx
      });
    });
  }
} catch {}

// Séries Pokecardex à fusionner dans un set existant de cardscout (pas de set séparé)
// shortName Pokecardex → id du set parent cardscout
const MERGE_INTO = {};

// Séries Pokecardex à NE PAS exposer (doublons ou non-TCG)
// Clé = zone_shortName (ex: 'fr_BLW'), ou 'shortName' pour zone fr
// Zones entières à masquer (demande utilisateur : enlever tout JP et tout CHN)
const SKIP_ZONE = new Set(['jp', 'chn']);

// Blocs entiers à masquer pour les zones non-FR
// (devenu inutile maintenant que JP+CHN sont totalement masqués mais conservé pour traçabilité)
const SKIP_BLOC_BY_ZONE = {};

// Séries (= bloc final affiché) à masquer pour la zone FR
const SKIP_SERIES_FR = new Set();

const SKIP = new Set([
  'fr_CRI',  // Chaos Ascendant — pas encore publiée sur pokecardex.com (sortie 2026/05/22)
  'fr_BLW',  // duplique bw1 (Black & White) — cardscout a déjà
]);

// Override de série désactivé : on respecte le bloc d'origine Pokécardex
// (les sets cross-ère comme BXT, RUM, etc. retournent dans le bloc "Promos" PC)
const SERIES_OVERRIDE = {};

// Remap des noms de blocs Pokecardex → noms de séries cardscout
const BLOC_ALIAS = {
  'HeartGold SoulSilver': 'HeartGold & SoulSilver',
  'Call of Legends': 'HeartGold & SoulSilver',
  // 'Wizards' et 'Others' conservés tels quels (demande utilisateur : ordre/noms Pokécardex)
};

let _sets = [];
let _cardsBySetId = new Map();
let _mergeMap = new Map(); // parentId → [{ setId, count }]

// Sélectionne la carte la plus "iconique" d'un set pour servir de cover :
// priorité aux raretés haut de gamme (Hyper, Secret, Rainbow, Gold, Alt Art), sinon dernière carte.
function pickCoverCard(cards) {
  if (!cards?.length) return null;
  const scoreRarity = r => {
    const x = (r || '').toLowerCase();
    if (/(hyper|rainbow|gold|secret|illustration rare|special illustration|alt art|alternate)/.test(x)) return 5;
    if (/(ultra|full art|special)/.test(x)) return 4;
    if (/(holo|brillante)/.test(x)) return 3;
    if (/rare/.test(x)) return 2;
    return 1;
  };
  let best = cards[cards.length - 1];
  let bestScore = -1;
  for (const c of cards) {
    const s = scoreRarity(c.rarity);
    if (s > bestScore && (c.imageFR || c.image || c.imageEN)) {
      best = c;
      bestScore = s;
    }
  }
  return best;
}

export function loadPokecardex() {
  _sets = [];
  _cardsBySetId = new Map();
  _mergeMap = new Map();
  if (!existsSync(DIR)) return 0;

  for (const file of readdirSync(DIR).sort()) {
    if (!file.endsWith('.json')) continue;
    let data;
    try { data = JSON.parse(readFileSync(join(DIR, file), 'utf8')); }
    catch { continue; }
    if (!data?.shortName || !Array.isArray(data.cards)) continue;

    const zone = data.zone || 'fr'; // 'fr' | 'jp' | 'chn'
    const idSuffix = zone === 'fr' ? data.shortName : `${zone}_${data.shortName}`;
    if (SKIP.has(`${zone}_${data.shortName}`)) continue;
    // Skip de zones entières (ex: toute la zone JP)
    if (SKIP_ZONE.has(zone)) continue;
    // Skip de blocs entiers par zone (ex: tous les sets CHN du bloc Scarlet & Violet)
    const blocSkipSet = SKIP_BLOC_BY_ZONE[zone];
    if (blocSkipSet && (blocSkipSet.has(data.bloc?.nameEN) || blocSkipSet.has(data.bloc?.nameFR))) continue;
    // Skip de séries finales (ex: Neo, World Championships, etc.) côté FR
    if (zone === 'fr') {
      const rawSeriesCheck = data.bloc?.nameEN || data.bloc?.nameFR || 'Pokecardex';
      const overrideCheck = SERIES_OVERRIDE[data.shortName];
      const seriesCheck = overrideCheck || BLOC_ALIAS[rawSeriesCheck] || rawSeriesCheck;
      if (SKIP_SERIES_FR.has(seriesCheck)) continue;
    }
    const setId = `pcx_${idSuffix}`;
    const releaseDate = data.releaseDateFR
      ? data.releaseDateFR.split(' ')[0].replace(/-/g, '/')
      : '';
    const rawSeries = data.bloc?.nameEN || data.bloc?.nameFR || 'Pokecardex';
    const zonePrefix = zone === 'jp' ? 'JP — ' : zone === 'chn' ? 'CHN — ' : '';
    const override = zone === 'fr' ? SERIES_OVERRIDE[data.shortName] : null;
    const series = zonePrefix + (override || BLOC_ALIAS[rawSeries] || rawSeries);
    const count = data.totalCards || data.cards.length;
    const mergeParent = MERGE_INTO[data.shortName];

    if (mergeParent) {
      const arr = _mergeMap.get(mergeParent) || [];
      arr.push({ setId, count });
      _mergeMap.set(mergeParent, arr);
    } else {
      const coverCard = pickCoverCard(data.cards);
      const altNames = _shortNameToNames.get(data.shortName) || {};
      _sets.push({
        id: setId,
        name: data.name,  // FR par défaut
        nameFR: data.name,
        nameEN: altNames.nameEN || '',
        series,
        total: count,
        releaseDate,
        logo: data.logo || '',
        symbol: data.symbol || '',
        coverImage: coverCard?.imageFR || coverCard?.image || coverCard?.imageEN || '',
        universe: 'pokemon',
        pokecardex: true,
        pcxOrder: typeof altNames.order === 'number' ? altNames.order : 9999,
        pcxBloc: altNames.blocFR || ''
      });
    }

    const cards = data.cards.map(c => {
      const img = c.imageFR || c.image || c.imageEN || '';
      const prices = c.priceEUR ? { cardmarket: { avg: c.priceEUR, trend: c.priceEUR } } : {};
      return {
        id: `${setId}-${c.num}`,
        name: c.nameFR || c.nameEN,
        nameEN: c.nameEN,
        nameFR: c.nameFR,
        set: data.name,
        setId,
        number: c.num,
        setTotal: data.totalCards || data.cards.length,
        rarity: c.rarity || '',
        types: [],
        supertype: '',
        subtypes: [],
        hp: '',
        imageSmall: img,
        imageLarge: img,
        localImage: '',
        prices,
        universe: 'pokemon',
        tcgplayerUrl: c.cardmarketUrl || '',
        idCardmarket: c.idCardmarket || null,
        idTcgplayer: c.idTcgplayer || null,
        source: 'pokecardex'
      };
    });
    _cardsBySetId.set(setId, cards);
    for (const c of cards) {
      const avg = c.prices?.cardmarket?.avg;
      if (avg > 0) _priceById.set(c.id, avg);
    }
  }
  return _sets.length;
}

export function getPokecardexSets() { return _sets; }
export function getPokecardexCards(setId) { return _cardsBySetId.get(setId) || null; }
export function isPokecardexSetId(id) { return typeof id === 'string' && id.startsWith('pcx_'); }

// Map cardId (pcx_XX-num) → prix EUR — construit au load pour le snapshot portfolio
const _priceById = new Map();
export function getPokecardexCardPrice(cardId) { return _priceById.get(cardId) || 0; }
// parentId (cardscout set id) → [{ setId, count }]
export function getPokecardexMergeMap() { return _mergeMap; }

loadPokecardex();
const total = _sets.length + [..._mergeMap.values()].reduce((a, b) => a + b.length, 0);
if (total > 0) console.log(`📚 ${total} série${total > 1 ? 's' : ''} Pokecardex chargée${total > 1 ? 's' : ''} (${_mergeMap.size} fusionnée${_mergeMap.size > 1 ? 's' : ''} dans un set existant)`);
