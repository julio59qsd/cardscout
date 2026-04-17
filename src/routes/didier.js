/**
 * Didier — Agent mondial des cartes Pokémon
 *
 * Missions :
 *  1. Découvrir TOUS les sets Pokémon existants dans le monde entier
 *  2. Prix exact au centime près pour chaque carte
 *  3. Historique quotidien (90 jours) pour chaque carte
 *  4. Prédiction hausse / baisse basée sur tendances multi-périodes
 *  5. Auto-correction permanente des anomalies de prix
 *
 * Cycles :
 *  — Fast   (30 min) : cartes récentes + top populaires
 *  — Medium (6h)     : refresh complet tous les prix
 *  — Slow   (24h)    : découverte nouveaux sets, reconstruction catalogue
 *  — Trend  (1h)     : recalcul prédictions + détection anomalies
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR        = join(__dirname, '../../data');
const HISTORY_FILE    = join(DATA_DIR, 'didier-history.json');
const ALLSETS_FILE    = join(DATA_DIR, 'didier-allsets.json');
const TRENDS_FILE     = join(DATA_DIR, 'didier-trends.json');
const POKEMON_API     = 'https://api.pokemontcg.io/v2';
const API_KEY         = process.env.POKEMON_API_KEY || '';
const HEADERS         = API_KEY ? { 'X-Api-Key': API_KEY } : {};
const DELAY           = API_KEY ? 80 : 350;
const MAX_HISTORY     = 90;   // jours d'historique conservés par carte
const ANOMALY_FACTOR  = 5;    // prix > 5× la moyenne → suspect

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── ÉTAT INTERNE ────────────────────────────────────────────────────────────
let _running  = false;
let _phase    = 'démarrage';
let _fastCycle   = 0;
let _medCycle    = 0;
let _slowCycle   = 0;
let _trendCycle  = 0;
let _totalCards  = 0;
let _totalSets   = 0;
let _corrections = 0;
let _lastTrend   = null;
let _errors      = 0;

// Données en mémoire
export const didierPrices  = new Map(); // cardId → prix actuel
export const didierHistory = {};        // cardId → [{ ts, p }]
export const didierTrends  = {};        // cardId → { signal, confidence, trend7, trend30 }
let allSets = {};                        // setId → { name, releaseDate, total, lastFetch }

// ─── PERSISTANCE ─────────────────────────────────────────────────────────────
function loadAll() {
  try {
    if (existsSync(HISTORY_FILE)) {
      const h = JSON.parse(readFileSync(HISTORY_FILE, 'utf8'));
      Object.assign(didierHistory, h);
      // Reconstruire les prix actuels depuis l'historique
      for (const [id, pts] of Object.entries(didierHistory)) {
        if (pts.length > 0) didierPrices.set(id, pts[pts.length - 1].p);
      }
      console.log(`💎 Didier: ${Object.keys(didierHistory).length.toLocaleString()} cartes avec historique chargées`);
    }
    if (existsSync(ALLSETS_FILE)) {
      allSets = JSON.parse(readFileSync(ALLSETS_FILE, 'utf8'));
      _totalSets = Object.keys(allSets).length;
      console.log(`💎 Didier: ${_totalSets} sets connus`);
    }
    if (existsSync(TRENDS_FILE)) {
      const t = JSON.parse(readFileSync(TRENDS_FILE, 'utf8'));
      Object.assign(didierTrends, t);
    }
  } catch (e) {
    console.error('Didier: erreur chargement', e.message);
  }
}

function saveHistory() {
  try {
    writeFileSync(HISTORY_FILE, JSON.stringify(didierHistory));
  } catch (e) { console.error('Didier: erreur save history', e.message); }
}

function saveSets() {
  try {
    writeFileSync(ALLSETS_FILE, JSON.stringify(allSets));
  } catch (e) { console.error('Didier: erreur save sets', e.message); }
}

function saveTrends() {
  try {
    writeFileSync(TRENDS_FILE, JSON.stringify(didierTrends));
  } catch (e) { console.error('Didier: erreur save trends', e.message); }
}

// ─── EXTRACTION PRIX ─────────────────────────────────────────────────────────
function extractPrice(c) {
  const cm  = c.cardmarket?.prices || {};
  const tcg = c.tcgplayer?.prices  || {};
  const tcgBest = Object.values(tcg).reduce((best, v) => {
    const m = v?.market || v?.mid || 0;
    return m > best ? m : best;
  }, 0);
  const price =
    cm.averageSellPrice || cm.trendPrice ||
    cm.avg1 || cm.avg7  || cm.avg30     ||
    cm.reverseHoloAvg1  || cm.reverseHoloAvg7 || cm.reverseHoloAvg30 ||
    cm.reverseHoloTrend || cm.reverseHoloSell  ||
    cm.lowPriceExPlus   || cm.lowPrice          ||
    cm.reverseHoloLow   || cm.germanProLow       ||
    cm.suggestedPrice   ||
    (tcgBest * 0.93)    || 0;
  return Math.round(price * 100) / 100;
}

// ─── AUTO-CORRECTION ─────────────────────────────────────────────────────────
function isAnomaly(cardId, newPrice) {
  const hist = didierHistory[cardId];
  if (!hist || hist.length < 3) return false;
  const recent = hist.slice(-7).map(p => p.p).filter(p => p > 0);
  if (!recent.length) return false;
  const avg = recent.reduce((s, v) => s + v, 0) / recent.length;
  return newPrice > avg * ANOMALY_FACTOR || (newPrice < avg / ANOMALY_FACTOR && avg > 0.5);
}

async function refetchPrice(cardId) {
  try {
    const r = await fetch(`${POKEMON_API}/cards/${cardId}?select=id,cardmarket,tcgplayer`, { headers: HEADERS });
    if (!r.ok) return 0;
    const data = await r.json();
    return extractPrice(data.data || {});
  } catch { return 0; }
}

// ─── ENREGISTREMENT HISTORIQUE ───────────────────────────────────────────────
function recordPrice(cardId, price) {
  if (!price || price <= 0) return;

  // Auto-correction : si anomalie, re-fetch pour confirmer
  if (isAnomaly(cardId, price)) {
    // On ne bloque pas le cycle, on planifie juste un re-check
    setTimeout(async () => {
      const confirmed = await refetchPrice(cardId);
      const finalPrice = confirmed > 0 ? confirmed : price;
      _pushHistory(cardId, finalPrice);
      _corrections++;
    }, 2000);
    return;
  }

  _pushHistory(cardId, price);
}

function _pushHistory(cardId, price) {
  if (!didierHistory[cardId]) didierHistory[cardId] = [];
  const now = Date.now();
  const pts = didierHistory[cardId];
  // Max 1 point par heure (évite les doublons sur cycle rapide)
  if (pts.length > 0 && now - pts[pts.length - 1].ts < 3600000) {
    pts[pts.length - 1].p = price; // met à jour le dernier point
  } else {
    pts.push({ ts: now, p: price });
  }
  // Tronquer à MAX_HISTORY jours
  const cutoff = now - MAX_HISTORY * 86400000;
  while (pts.length > 1 && pts[0].ts < cutoff) pts.shift();
  didierPrices.set(cardId, price);
  _totalCards = Math.max(_totalCards, didierPrices.size);
}

// ─── ANALYSE DE TENDANCE ─────────────────────────────────────────────────────
function avg(arr) {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

function computeTrend(cardId) {
  const hist = didierHistory[cardId];
  if (!hist || hist.length < 2) return null;
  const now   = Date.now();
  const day   = 86400000;

  const slice = (days) => hist
    .filter(p => p.ts >= now - days * day)
    .map(p => p.p)
    .filter(p => p > 0);

  const pts7  = slice(7);
  const pts30 = slice(30);
  const pts90 = slice(90);
  const cur   = hist[hist.length - 1].p;

  const avg7  = avg(pts7)  || cur;
  const avg30 = avg(pts30) || cur;
  const avg90 = avg(pts90) || cur;

  const trend7  = avg7  > 0 ? ((cur - avg7)  / avg7)  * 100 : 0;
  const trend30 = avg30 > 0 ? ((cur - avg30) / avg30) * 100 : 0;
  const trend90 = avg90 > 0 ? ((cur - avg90) / avg90) * 100 : 0;
  const momentum = trend7 - trend30;

  // Volatilité
  const allPrices = pts90.length >= 3 ? pts90 : hist.map(p => p.p);
  const mean = avg(allPrices);
  const variance = allPrices.reduce((s, v) => s + (v - mean) ** 2, 0) / allPrices.length;
  const volatility = mean > 0 ? (Math.sqrt(variance) / mean) * 100 : 0;

  // Signal
  let signal = 'stable';
  let confidence = 50;

  if (trend7 > 10 && trend30 > 5) {
    signal = 'hausse forte'; confidence = Math.min(95, 70 + momentum);
  } else if (trend7 > 5 && momentum > 0) {
    signal = 'hausse'; confidence = Math.min(85, 60 + trend7);
  } else if (trend7 > 2) {
    signal = 'légère hausse'; confidence = Math.min(75, 55 + trend7);
  } else if (trend7 < -10 && trend30 < -5) {
    signal = 'baisse forte'; confidence = Math.min(95, 70 + Math.abs(momentum));
  } else if (trend7 < -5 && momentum < 0) {
    signal = 'baisse'; confidence = Math.min(85, 60 + Math.abs(trend7));
  } else if (trend7 < -2) {
    signal = 'légère baisse'; confidence = Math.min(75, 55 + Math.abs(trend7));
  } else {
    confidence = Math.max(30, 60 - volatility);
  }

  return {
    signal,
    confidence: Math.round(confidence),
    trend7:  Math.round(trend7  * 10) / 10,
    trend30: Math.round(trend30 * 10) / 10,
    trend90: Math.round(trend90 * 10) / 10,
    volatility: Math.round(volatility * 10) / 10,
    cur, avg7: Math.round(avg7 * 100) / 100,
    dataPoints: hist.length,
  };
}

// ─── FETCH SETS ───────────────────────────────────────────────────────────────
async function fetchAllSets() {
  try {
    const r = await fetch(`${POKEMON_API}/sets?pageSize=250&orderBy=-releaseDate`, { headers: HEADERS });
    if (!r.ok) return;
    const data = await r.json();
    for (const s of data.data || []) {
      if (!allSets[s.id]) {
        allSets[s.id] = { name: s.name, releaseDate: s.releaseDate, total: s.total, lastFetch: null };
      } else {
        allSets[s.id].total = s.total;
      }
    }
    _totalSets = Object.keys(allSets).length;
    saveSets();
    console.log(`💎 Didier: ${_totalSets} sets découverts au total`);
  } catch (e) {
    console.error('Didier: erreur fetchAllSets', e.message);
    _errors++;
  }
}

// ─── FETCH PRIX D'UN SET ─────────────────────────────────────────────────────
async function fetchSetPrices(setId) {
  let page = 1, fetched = 0;
  while (true) {
    try {
      const url = `${POKEMON_API}/cards?q=${encodeURIComponent(`set.id:${setId}`)}&pageSize=250&page=${page}&select=id,name,cardmarket,tcgplayer`;
      const r = await fetch(url, { headers: HEADERS });
      if (!r.ok) { _errors++; break; }
      const data = await r.json();
      for (const c of data.data || []) {
        const price = extractPrice(c);
        if (price > 0) { recordPrice(c.id, price); fetched++; }
      }
      if (!data.data?.length || fetched >= (data.totalCount || 0)) break;
      page++;
      await sleep(DELAY);
    } catch (e) {
      _errors++;
      break;
    }
  }
  if (allSets[setId]) allSets[setId].lastFetch = new Date().toISOString();
  return fetched;
}

// ─── CYCLE TREND ─────────────────────────────────────────────────────────────
function runTrendAnalysis() {
  _phase = 'analyse tendances';
  let computed = 0;
  for (const cardId of Object.keys(didierHistory)) {
    const t = computeTrend(cardId);
    if (t) { didierTrends[cardId] = t; computed++; }
  }
  saveTrends();
  _trendCycle++;
  _lastTrend = new Date().toISOString();
  console.log(`📈 Didier: ${computed.toLocaleString()} tendances calculées — cycle ${_trendCycle}`);
}

// ─── CYCLE RAPIDE (30 min) — sets récents ────────────────────────────────────
async function fastCycle() {
  _phase = 'cycle rapide';
  _fastCycle++;
  // Les 20 sets les plus récents
  const recentSets = Object.entries(allSets)
    .filter(([, s]) => s.releaseDate)
    .sort((a, b) => b[1].releaseDate.localeCompare(a[1].releaseDate))
    .slice(0, 20)
    .map(([id]) => id);

  let total = 0;
  for (const setId of recentSets) {
    total += await fetchSetPrices(setId);
    await sleep(DELAY * 2);
  }
  saveHistory();
  console.log(`⚡ Didier fast cycle ${_fastCycle}: ${total} prix mis à jour (${recentSets.length} sets récents)`);
}

// ─── CYCLE MEDIUM (6h) — tous les prix ───────────────────────────────────────
async function medCycle() {
  _phase = 'cycle complet';
  _medCycle++;
  const setIds = Object.keys(allSets);
  console.log(`💎 Didier medium cycle ${_medCycle}: ${setIds.length} sets à traiter`);
  let total = 0, done = 0;
  for (const setId of setIds) {
    total += await fetchSetPrices(setId);
    done++;
    if (done % 30 === 0) {
      saveHistory();
      console.log(`   Didier: ${done}/${setIds.length} sets — ${total.toLocaleString()} prix`);
    }
    await sleep(DELAY);
  }
  saveHistory();
  console.log(`✅ Didier medium cycle ${_medCycle} terminé: ${total.toLocaleString()} prix · ${didierPrices.size.toLocaleString()} cartes`);
}

// ─── CYCLE LENT (24h) — découverte globale ───────────────────────────────────
async function slowCycle() {
  _phase = 'découverte mondiale';
  _slowCycle++;
  console.log(`🌍 Didier slow cycle ${_slowCycle}: scan mondial des sets`);
  await fetchAllSets();
  saveSets();
}

// ─── VÉRIFICATION COMPLÈTE AU DÉMARRAGE ──────────────────────────────────────
let _verifyRunning = false;
let _verifyProgress = 0;
let _verifyTotal = 0;
let _verifyDone = false;

async function verifyAllCards() {
  if (_verifyRunning) return;
  _verifyRunning = true;
  _verifyProgress = 0;
  _phase = 'vérification initiale complète';

  // Lire TOUS les sets connus et en récupérer les prix
  const setIds = Object.keys(allSets);
  _verifyTotal = setIds.length;
  console.log(`\n💎 Didier — vérification complète : ${setIds.length} sets à vérifier\n`);

  let totalPrices = 0;
  for (const setId of setIds) {
    totalPrices += await fetchSetPrices(setId);
    _verifyProgress++;
    if (_verifyProgress % 20 === 0) {
      saveHistory();
      console.log(`   Didier vérif: ${_verifyProgress}/${setIds.length} sets · ${totalPrices.toLocaleString()} prix`);
    }
    await sleep(DELAY);
  }

  // Vérifier aussi les cartes du card-index sans prix (cartes orphelines)
  try {
    const INDEX_FILE = join(__dirname, '../../data/card-index.json');
    if (existsSync(INDEX_FILE)) {
      const idx = JSON.parse(readFileSync(INDEX_FILE, 'utf8'));
      const orphans = Object.keys(idx.cards || {}).filter(id => !didierPrices.has(id));
      console.log(`   Didier: ${orphans.length} cartes sans prix → re-fetch individuel`);
      for (const id of orphans) {
        const price = await refetchPrice(id);
        if (price > 0) { recordPrice(id, price); totalPrices++; }
        await sleep(DELAY);
      }
    }
  } catch (e) { console.error('Didier: erreur vérif orphelins', e.message); }

  saveHistory();
  runTrendAnalysis();
  _verifyDone = true;
  _verifyRunning = false;
  console.log(`\n✅ Didier — vérification terminée : ${totalPrices.toLocaleString()} prix · ${didierPrices.size.toLocaleString()} cartes couvertes\n`);
}

// ─── BOUCLE PRINCIPALE ───────────────────────────────────────────────────────
export async function startDidier() {
  if (_running) return;
  _running = true;

  loadAll();

  console.log('\n💎 Didier démarre — agent mondial Pokémon TCG');
  console.log('   Fast: 30min · Medium: 6h · Slow: 24h · Trends: 1h\n');

  // 1. Découvrir tous les sets
  await fetchAllSets();

  // 2. Vérification immédiate de TOUTES les cartes actuelles
  await verifyAllCards();

  // Timestamps des prochains cycles (après la vérif initiale)
  let nextFast   = Date.now() + 1000 * 60 * 30;        // 30min
  let nextMed    = Date.now() + 1000 * 60 * 60 * 6;    // 6h
  let nextSlow   = Date.now() + 1000 * 60 * 60 * 24;   // 24h
  let nextTrend  = Date.now() + 1000 * 60 * 60;         // 1h

  while (true) {
    const now = Date.now();
    try {
      if (now >= nextSlow) {
        await slowCycle();
        nextSlow = Date.now() + 1000 * 60 * 60 * 24;
      }
      if (now >= nextMed) {
        await medCycle();
        nextMed = Date.now() + 1000 * 60 * 60 * 6;
      }
      if (now >= nextFast) {
        await fastCycle();
        nextFast = Date.now() + 1000 * 60 * 30;
      }
      if (now >= nextTrend) {
        runTrendAnalysis();
        nextTrend = Date.now() + 1000 * 60 * 60;
      }
    } catch (e) {
      console.error('Didier: erreur cycle', e.message);
      _errors++;
    }
    _phase = 'en veille';
    await sleep(60000); // vérifie toutes les 60s
  }
}

// ─── API ENDPOINTS ────────────────────────────────────────────────────────────

// GET /api/didier/status
export function didierStatus(req, res) {
  res.json({
    running:      _running,
    phase:        _phase,
    totalCards:   didierPrices.size,
    totalSets:    _totalSets,
    historyCards: Object.keys(didierHistory).length,
    trendCards:   Object.keys(didierTrends).length,
    corrections:  _corrections,
    errors:       _errors,
    cycles: { fast: _fastCycle, medium: _medCycle, slow: _slowCycle, trend: _trendCycle },
    lastTrend:    _lastTrend,
    verify: {
      running:  _verifyRunning,
      done:     _verifyDone,
      progress: _verifyProgress,
      total:    _verifyTotal,
      pct:      _verifyTotal > 0 ? Math.round((_verifyProgress / _verifyTotal) * 100) : 0,
    },
  });
}

// POST /api/didier/verify-now — relance une vérification complète immédiate
export function didierVerifyNow(req, res) {
  if (_verifyRunning) return res.json({ ok: false, message: 'Vérification déjà en cours' });
  res.json({ ok: true, message: 'Vérification complète lancée en arrière-plan' });
  verifyAllCards().catch(e => console.error('Didier verifyNow erreur:', e.message));
}

// GET /api/didier/predict?id=swsh1-1
export function didierPredict(req, res) {
  const id = (req.query.id || '').trim();
  if (!id) return res.json({ error: 'id requis' });
  const trend = didierTrends[id] || computeTrend(id);
  const price = didierPrices.get(id) || 0;
  if (!trend) return res.json({ id, price, signal: 'inconnu', message: 'pas assez de données' });
  res.json({ id, price, ...trend });
}

// POST /api/didier/predict-batch — body: { ids: [...] }
export function didierPredictBatch(req, res) {
  const ids = (req.body?.ids || []).slice(0, 200);
  const result = {};
  for (const id of ids) {
    const trend = didierTrends[id] || computeTrend(id);
    const price = didierPrices.get(id) || 0;
    if (price > 0) result[id] = { price, ...(trend || { signal: 'inconnu' }) };
  }
  res.json({ predictions: result });
}

// GET /api/didier/top-movers?limit=20&signal=hausse
export function didierTopMovers(req, res) {
  const limit  = Math.min(parseInt(req.query.limit) || 20, 100);
  const signal = req.query.signal || null;

  let entries = Object.entries(didierTrends)
    .filter(([id, t]) => didierPrices.has(id) && t.confidence >= 60);

  if (signal) entries = entries.filter(([, t]) => t.signal.includes(signal));

  entries.sort((a, b) => Math.abs(b[1].trend7) - Math.abs(a[1].trend7));
  const top = entries.slice(0, limit).map(([id, t]) => ({
    id, price: didierPrices.get(id), ...t
  }));
  res.json({ movers: top });
}

// Lookup prix Didier (fallback chain: Vinicius → Kane → Didier)
export function didierLookup(cardId) {
  return didierPrices.get(cardId) || 0;
}
