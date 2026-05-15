// Agent price-sync — vérifie quotidiennement que les prix locaux sont alignés avec
// la source (pokemontcg.io → agrège Cardmarket → source de vérité Pokecardex).
//
// Workflow :
//   1. Lit data/price-cache.json (prix actuels)
//   2. Re-fetch les prix par set depuis pokemontcg.io (batch paginé)
//   3. Compare chaque entrée : unchanged / changed (<10%) / significant (>=10%)
//   4. Met à jour price-cache.json
//   5. Append un résumé dans data/price-sync-log.json (historique des runs)
//
// Lancement : `node scripts/price-sync-agent.js [--sets=<count>]`
//   --sets=N : ne traite que les N sets les plus récents (défaut : tous)

import { readFileSync, writeFileSync, existsSync } from 'fs';

const POKEMON_API = 'https://api.pokemontcg.io/v2';
const API_KEY = process.env.POKEMON_API_KEY || '';
const HDR = API_KEY ? { 'X-Api-Key': API_KEY } : {};
const DELAY = API_KEY ? 100 : 350;
const ALERT_THRESHOLD = 0.10; // 10%
const sleep = ms => new Promise(r => setTimeout(r, ms));

const args = new Map(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const setLimit = args.get('sets') ? parseInt(args.get('sets'), 10) : null;

const CACHE_PATH = 'data/price-cache.json';
const LOG_PATH = 'data/price-sync-log.json';

function bestPrice(c) {
  const cm = c.cardmarket?.prices || {};
  const tcg = Object.values(c.tcgplayer?.prices || {}).reduce((b, v) => Math.max(b, v?.market || v?.mid || 0), 0);
  return cm.averageSellPrice || cm.trendPrice || cm.avg1 || cm.avg7 || cm.avg30
      || cm.reverseHoloTrend || cm.reverseHoloAvg7 || cm.reverseHoloAvg30
      || cm.lowPrice || (tcg * 0.93) || 0;
}

async function fetchSetPrices(setId) {
  const out = {};
  let page = 1;
  while (true) {
    const url = `${POKEMON_API}/cards?q=${encodeURIComponent(`set.id:${setId}`)}&pageSize=250&page=${page}&select=id,number,cardmarket,tcgplayer`;
    const rr = await fetch(url, { headers: HDR });
    if (!rr.ok) { console.warn(`  ⚠  HTTP ${rr.status} pour ${setId} p${page}`); break; }
    const d = await rr.json();
    for (const c of d.data || []) {
      const p = bestPrice(c);
      if (p > 0) out[c.id] = Math.round(p * 100) / 100;
    }
    if (!d.data?.length || (d.totalCount && page * 250 >= d.totalCount)) break;
    page++;
    await sleep(DELAY);
  }
  return out;
}

// ── Run ──────────────────────────────────────────────
const startedAt = new Date().toISOString();
console.log(`\n🔁 price-sync-agent  · ${startedAt}`);
console.log(`   seuil alerte : ±${(ALERT_THRESHOLD * 100).toFixed(0)}%`);
if (!API_KEY) console.log(`   ⚠  pas de POKEMON_API_KEY — delay 350ms`);

// Charge cache existant
const cache = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, 'utf8')) : {};
const cacheSize = Object.keys(cache).length;
console.log(`   cache actuel : ${cacheSize} prix`);

// Liste des sets à rafraîchir (tous ceux présents dans le cache, groupés par setId)
const setsInCache = new Map();
for (const cid of Object.keys(cache)) {
  const m = cid.match(/^(.+?)-\d+$/);
  if (!m) continue;
  setsInCache.set(m[1], (setsInCache.get(m[1]) || 0) + 1);
}
let setIds = [...setsInCache.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
if (setLimit && setIds.length > setLimit) setIds = setIds.slice(0, setLimit);

console.log(`   sets à refetch : ${setIds.length}`);
console.log('');

let totalRefreshed = 0, unchanged = 0, changed = 0, significant = 0, added = 0;
const alerts = [];

for (let i = 0; i < setIds.length; i++) {
  const setId = setIds[i];
  try {
    const fresh = await fetchSetPrices(setId);
    const freshCount = Object.keys(fresh).length;
    totalRefreshed += freshCount;
    let localChanged = 0, localAlerts = 0;
    for (const [cid, newP] of Object.entries(fresh)) {
      const oldP = cache[cid];
      if (oldP === undefined) { added++; cache[cid] = newP; continue; }
      if (Math.abs(newP - oldP) < 0.01) { unchanged++; continue; }
      const delta = (newP - oldP) / (oldP || 1);
      cache[cid] = newP;
      changed++; localChanged++;
      if (Math.abs(delta) >= ALERT_THRESHOLD) {
        significant++; localAlerts++;
        alerts.push({ cardId: cid, old: oldP, new: newP, deltaPct: Math.round(delta * 1000) / 10 });
      }
    }
    const flag = localAlerts ? '🚨' : localChanged ? '•' : '✓';
    console.log(`  ${flag} [${String(i + 1).padStart(3)}/${setIds.length}] ${setId.padEnd(10)} ${String(freshCount).padStart(4)} prix  (Δ${localChanged}, 🚨${localAlerts})`);
    await sleep(DELAY);
  } catch (err) {
    console.warn(`  ⚠  [${i + 1}/${setIds.length}] ${setId} — ${err.message}`);
  }
}

// Persiste cache mis à jour
writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0));

// Append dans le log
const logEntry = {
  startedAt,
  finishedAt: new Date().toISOString(),
  setsChecked: setIds.length,
  pricesRefreshed: totalRefreshed,
  unchanged,
  changed,
  significant,
  added,
  topAlerts: alerts.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct)).slice(0, 20)
};
let log = [];
if (existsSync(LOG_PATH)) { try { log = JSON.parse(readFileSync(LOG_PATH, 'utf8')); } catch {} }
log.push(logEntry);
if (log.length > 90) log = log.slice(-90); // garde 90 derniers runs
writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));

// Résumé
console.log('');
console.log('═══════════════════════════════════════════');
console.log(`✅ Sync terminé`);
console.log(`   Prix rafraîchis : ${totalRefreshed}`);
console.log(`   Inchangés       : ${unchanged}`);
console.log(`   Modifiés        : ${changed} (dont 🚨 ${significant} ≥ ±${(ALERT_THRESHOLD*100).toFixed(0)}%)`);
console.log(`   Nouveaux        : ${added}`);
if (alerts.length) {
  console.log('');
  console.log(`🚨 Top 10 écarts significatifs :`);
  alerts.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct)).slice(0, 10).forEach(a =>
    console.log(`   ${a.cardId.padEnd(20)} ${String(a.old).padStart(8)} → ${String(a.new).padStart(8)} €  (${a.deltaPct > 0 ? '+' : ''}${a.deltaPct}%)`)
  );
}
console.log('');
console.log(`📝 Log : ${LOG_PATH}`);
