/**
 * Kane — Agent QA anti-bugs d'affichage
 *
 * Tâches :
 *  1. Détecter les cartes sans prix dans le cache Vinicius et les combler
 *  2. Vérifier que searchFast retourne bien des IDs valides pour tout le catalogue
 *  3. S'assurer qu'aucune carte affichable n'a p:0 (bug "tiret")
 *  4. Signaler toute anomalie dans les logs toutes les 6h
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { priceById, priceByName } from './priceAgent.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_FILE       = join(__dirname, '../../data/card-index.json');
const SUPPLEMENT_FILE  = join(__dirname, '../../data/kane-supplement.json');
const POKEMON_API      = 'https://api.pokemontcg.io/v2';
const API_KEY          = process.env.POKEMON_API_KEY || '';
const headers          = API_KEY ? { 'X-Api-Key': API_KEY } : {};
const DELAY            = API_KEY ? 100 : 400;
const CYCLE_PAUSE      = 1000 * 60 * 60 * 6; // 6h entre chaque audit

// Prix supplémentaires trouvés par Kane (cartes introuvables chez Vinicius)
export const kaneSupplementPrices = new Map(); // cardId → prix

let _running   = false;
let _lastAudit = null;
let _fixed     = 0;
let _missing   = 0;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function loadSupplement() {
  try {
    if (!existsSync(SUPPLEMENT_FILE)) return;
    const obj = JSON.parse(readFileSync(SUPPLEMENT_FILE, 'utf8'));
    for (const [id, price] of Object.entries(obj)) {
      if (price > 0) kaneSupplementPrices.set(id, price);
    }
    console.log(`🔍 Kane: ${kaneSupplementPrices.size} prix supplémentaires chargés`);
  } catch (e) {
    console.error('Kane: erreur chargement supplément', e.message);
  }
}

function saveSupplement() {
  try {
    const obj = Object.fromEntries(kaneSupplementPrices);
    writeFileSync(SUPPLEMENT_FILE, JSON.stringify(obj));
  } catch (e) {
    console.error('Kane: erreur sauvegarde', e.message);
  }
}

function extractPrice(c) {
  const cm  = c.cardmarket?.prices || {};
  const tcg = c.tcgplayer?.prices  || {};
  const tcgBest = Object.values(tcg).reduce((best, v) => {
    const m = v?.market || v?.mid || 0;
    return m > best ? m : best;
  }, 0);
  return cm.averageSellPrice || cm.trendPrice || cm.avg1 || cm.avg7 || cm.avg30
    || cm.reverseHoloAvg1 || cm.reverseHoloAvg7 || cm.reverseHoloTrend
    || cm.lowPriceExPlus || cm.lowPrice || cm.suggestedPrice
    || (tcgBest * 0.93) || 0;
}

async function fetchPriceForCard(cardId) {
  try {
    const url = `${POKEMON_API}/cards/${cardId}?select=id,cardmarket,tcgplayer`;
    const r = await fetch(url, { headers });
    if (!r.ok) return 0;
    const data = await r.json();
    return Math.round(extractPrice(data.data || {}) * 100) / 100;
  } catch {
    return 0;
  }
}

async function runAudit() {
  if (!existsSync(INDEX_FILE)) return;

  let index;
  try {
    index = JSON.parse(readFileSync(INDEX_FILE, 'utf8'));
  } catch (e) {
    console.error('Kane: impossible de lire l\'index', e.message);
    return;
  }

  const allIds = Object.keys(index.cards || {});
  const orphans = allIds.filter(id =>
    !priceById.has(id) && !kaneSupplementPrices.has(id)
  );

  _missing = orphans.length;
  console.log(`🔍 Kane — audit : ${allIds.length} cartes, ${orphans.length} sans prix`);

  if (orphans.length === 0) {
    console.log('✅ Kane — aucun bug "tiret" détecté, tout est propre');
    _lastAudit = new Date().toISOString();
    return;
  }

  let fixed = 0;
  for (const id of orphans) {
    const price = await fetchPriceForCard(id);
    if (price > 0) {
      kaneSupplementPrices.set(id, price);
      fixed++;
    }
    await sleep(DELAY);
  }

  _fixed += fixed;
  saveSupplement();
  _lastAudit = new Date().toISOString();
  console.log(`✅ Kane — audit terminé : ${fixed}/${orphans.length} cartes renseignées, ${orphans.length - fixed} sans données de marché`);
}

export async function startKane() {
  if (_running) return;
  _running = true;

  loadSupplement();

  console.log('\n🔍 Kane démarre — agent QA anti-bugs d\'affichage');
  console.log('   Tâches : détection cartes sans prix · audit toutes les 6h\n');

  // Attend que Vinicius ait eu le temps de charger son cache (30s)
  await sleep(30000);

  while (true) {
    await runAudit();
    await sleep(CYCLE_PAUSE);
  }
}

// GET /api/kane/status
export function kaneStatus(req, res) {
  res.json({
    running:    _running,
    lastAudit:  _lastAudit,
    supplement: kaneSupplementPrices.size,
    fixed:      _fixed,
    missing:    _missing,
  });
}

// Lookup prix Kane (appelé en dernier recours si Vinicius n'a rien)
export function kaneLookup(cardId) {
  return kaneSupplementPrices.get(cardId) || 0;
}
