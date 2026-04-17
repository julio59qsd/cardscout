/**
 * Vinicius — Agent de mise à jour quotidienne des prix
 * Tourne en arrière-plan, cycle sur tous les sets 1× par jour
 * Alimente priceById (id→prix) et priceByName (nom→prix)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_FILE   = join(__dirname, '../../data/card-index.json');
const CACHE_FILE   = join(__dirname, '../../data/price-cache.json');
const POKEMON_API  = 'https://api.pokemontcg.io/v2';
const API_KEY      = process.env.POKEMON_API_KEY || '';
const headers      = API_KEY ? { 'X-Api-Key': API_KEY } : {};
const DELAY        = API_KEY ? 80 : 300;          // ms entre requêtes
const CYCLE_PAUSE  = 1000 * 60 * 60 * 24;          // 24h entre chaque cycle complet

// Prix en mémoire
export const priceById   = new Map(); // cardId   → prix €
export const priceByName = new Map(); // nom min  → prix €

// Statut Vinicius
let _running   = false;
let _cycle     = 0;
let _progress  = 0;
let _total     = 0;
let _lastSave  = null;
let _nextCycle = null;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function extractPrice(c) {
  const cm  = c.cardmarket?.prices || {};
  const tcg = c.tcgplayer?.prices  || {};
  const tcgBest = Object.values(tcg).reduce((best, v) => {
    const m = v?.market || v?.mid || 0;
    return m > best ? m : best;
  }, 0);
  return cm.averageSellPrice || cm.trendPrice
    || cm.avg1 || cm.avg7 || cm.avg30
    || cm.reverseHoloAvg1 || cm.reverseHoloAvg7 || cm.reverseHoloAvg30
    || cm.reverseHoloTrend || cm.reverseHoloSell
    || cm.lowPriceExPlus   || cm.lowPrice
    || cm.reverseHoloLow   || cm.germanProLow
    || cm.suggestedPrice
    || (tcgBest * 0.93)
    || 0;
}

function indexPrice(cardId, cardName, price) {
  if (!price) return;
  priceById.set(cardId, price);
  // Index par nom complet minuscule
  const key = cardName.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  // Garde le meilleur prix si plusieurs variantes du même nom
  if (!priceByName.has(key) || priceByName.get(key) < price) {
    priceByName.set(key, price);
  }
  // Index par premier mot aussi (pour les recherches partielles)
  const firstKey = key.split(' ')[0];
  if (!priceByName.has(firstKey) || priceByName.get(firstKey) < price) {
    priceByName.set(firstKey, price);
  }
}

async function fetchSetPrices(setId) {
  let page = 1;
  let fetched = 0;
  while (true) {
    const url = `${POKEMON_API}/cards?q=${encodeURIComponent(`set.id:${setId}`)}&pageSize=250&page=${page}&select=id,name,cardmarket,tcgplayer`;
    const r = await fetch(url, { headers });
    if (!r.ok) { console.warn(`  ⚠ Vinicius: HTTP ${r.status} pour ${setId}`); break; }
    const data = await r.json();
    for (const c of data.data || []) {
      const price = Math.round(extractPrice(c) * 100) / 100;
      if (price > 0) { indexPrice(c.id, c.name, price); fetched++; }
    }
    if (fetched >= (data.totalCount || 0) || !data.data?.length) break;
    page++;
    await sleep(DELAY);
  }
  return fetched;
}

function saveToDisk() {
  try {
    const obj = Object.fromEntries(priceById);
    writeFileSync(CACHE_FILE, JSON.stringify(obj));
    _lastSave = new Date().toISOString();
  } catch (e) {
    console.error('Vinicius: erreur sauvegarde', e.message);
  }
}

function loadFromDisk() {
  try {
    if (!existsSync(CACHE_FILE)) return;
    const obj = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
    let count = 0;
    // Charger aussi l'index card pour reconstruire priceByName
    let cardNames = {};
    if (existsSync(INDEX_FILE)) {
      const idx = JSON.parse(readFileSync(INDEX_FILE, 'utf8'));
      for (const [id, c] of Object.entries(idx.cards || {})) {
        cardNames[id] = c.n;
      }
    }
    for (const [id, price] of Object.entries(obj)) {
      if (price > 0) {
        priceById.set(id, price);
        const name = cardNames[id];
        if (name) indexPrice(id, name, price);
        count++;
      }
    }
    console.log(`💵 Vinicius: ${count.toLocaleString()} prix chargés depuis le cache`);
  } catch (e) {
    console.error('Vinicius: erreur chargement cache', e.message);
  }
}

export async function startVinicius() {
  if (_running) return;
  _running = true;

  // Chargement initial du cache existant
  loadFromDisk();

  console.log('\n💵 Vinicius démarre — mise à jour quotidienne des prix');
  console.log(`   Délai: ${DELAY}ms/requête · Prochain cycle dans 24h\n`);

  while (true) {
    // Charger la liste des sets depuis l'index Nuno
    let sets = [];
    try {
      const idx = JSON.parse(readFileSync(INDEX_FILE, 'utf8'));
      // Extraire les IDs de sets uniques
      const setIds = new Set();
      for (const id of Object.keys(idx.cards || {})) {
        const parts = id.split('-');
        parts.pop();
        setIds.add(parts.join('-'));
      }
      sets = [...setIds].filter(Boolean);
    } catch (e) {
      console.error('Vinicius: impossible de lire l\'index', e.message);
      await sleep(30000);
      continue;
    }

    _total    = sets.length;
    _progress = 0;
    _cycle++;
    console.log(`💵 Vinicius — cycle ${_cycle} : ${sets.length} sets à traiter`);

    let totalPrices = 0;
    for (const setId of sets) {
      try {
        const count = await fetchSetPrices(setId);
        totalPrices += count;
        _progress++;
        // Sauvegarde sur disque toutes les 20 sets
        if (_progress % 20 === 0) saveToDisk();
      } catch (e) {
        console.warn(`  ⚠ Vinicius skip ${setId}: ${e.message}`);
        _progress++;
      }
      await sleep(DELAY);
    }

    saveToDisk();
    const next = new Date(Date.now() + CYCLE_PAUSE);
    console.log(`✅ Vinicius cycle ${_cycle} terminé — ${totalPrices.toLocaleString()} prix mis à jour`);
    console.log(`   Prochain cycle : ${next.toLocaleDateString('fr-FR')} à ${next.toLocaleTimeString('fr-FR')}`);
    _nextCycle = new Date(Date.now() + CYCLE_PAUSE).toISOString();
    await sleep(CYCLE_PAUSE);
  }
}

// GET /api/prices/card?name=Charizard+ex+SAR
export function getCardPrice(req, res) {
  const name = (req.query.name || '').trim().toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g,' ');
  if (!name) return res.json({ price: 0 });
  const price = priceByName.get(name) || priceByName.get(name.split(' ')[0]) || 0;
  res.json({ price, name });
}

// GET /api/prices/batch — body: { names: [...] }
export function getBatchPrices(req, res) {
  const names = (req.body?.names || req.query?.names?.split(',') || []).slice(0, 50);
  const result = {};
  for (const raw of names) {
    const key = raw.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    result[raw] = priceByName.get(key) || priceByName.get(key.split(' ')[0]) || 0;
  }
  res.json({ prices: result });
}

// GET /api/prices/status
export function pricesStatus(req, res) {
  res.json({
    running:    _running,
    cycle:      _cycle,
    progress:   _progress,
    total:      _total,
    pct:        _total > 0 ? Math.round((_progress / _total) * 100) : 0,
    cached:     priceById.size,
    lastSave:   _lastSave,
    nextCycle:  _nextCycle,
  });
}
