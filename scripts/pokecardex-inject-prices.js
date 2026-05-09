// Étape finale : match pcx FR → pokemontcg.io par nom EN, fetch prix manquants, injecte dans data/pokecardex/*.json
import { readFileSync, writeFileSync, readdirSync, utimesSync } from 'fs';

const POKEMON_API = 'https://api.pokemontcg.io/v2';
const API_KEY = process.env.POKEMON_API_KEY || '';
const HDR = API_KEY ? { 'X-Api-Key': API_KEY } : {};
const DELAY = API_KEY ? 100 : 300;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[:\-—–]/g, ' ')
  .replace(/[^a-z0-9]+/g, ' ').trim();

// 1) Fetch all pokemontcg.io sets (unfiltered)
console.log('📡 Fetch pokemontcg.io sets (liste complète)…');
const r = await fetch(`${POKEMON_API}/sets?pageSize=250`, { headers: HDR });
const { data: pctgSets } = await r.json();
console.log(`   ${pctgSets.length} sets récupérés`);

const pctgByName = new Map();
for (const s of pctgSets) {
  pctgByName.set(norm(s.name), s);                       // "arceus"
  pctgByName.set(norm(`${s.series} ${s.name}`), s);       // "platinum arceus"
  pctgByName.set(norm(`${s.series}: ${s.name}`), s);
}

// 2) Charge existing price cache
const priceCache = JSON.parse(readFileSync('data/price-cache.json', 'utf8'));

// 2b) Charge le lookup shortName → nameEN depuis pokecardex-missing.json
const pcxIndex = (() => {
  try {
    const doc = JSON.parse(readFileSync('data/pokecardex-missing.json', 'utf8'));
    const map = new Map();
    for (const s of (doc.all || [])) if (s.shortName) map.set(s.shortName, s);
    return map;
  } catch { return new Map(); }
})();
console.log(`   ${pcxIndex.size} séries Pokecardex indexées (nameEN)`);
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
    if (!rr.ok) break;
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

// 3) Match + fetch + inject
const files = readdirSync('data/pokecardex').filter(f => f.endsWith('.json') && !f.startsWith('jp_') && !f.startsWith('chn_'));
let matched = 0, unmatched = 0, totalPriced = 0;
const report = [];

for (const f of files) {
  const data = JSON.parse(readFileSync(`data/pokecardex/${f}`, 'utf8'));
  const pcxMeta = pcxIndex.get(data.shortName) || {};
  const nameEN = data.nameEN || pcxMeta.nameEN || '';

  // Mapping manuel pour les sets dont le nom ne match pas (différences "Base" vs "Base Set", etc.)
  const MANUAL_MAP = {
    'BS': 'base1',     // Base Set → "Base"
    'EX': 'ecard1',    // Expedition → "Expedition Base Set"
    'CL': 'col1',      // Call of Legends
    'HGSS': 'hgss1',   // HeartGold SoulSilver
    'RFVF': 'ex6',     // EX FireRed & LeafGreen
  };
  let pctg = MANUAL_MAP[data.shortName]
    ? pctgSets.find(s => s.id === MANUAL_MAP[data.shortName])
    : null;
  if (!pctg && nameEN) {
    const k = norm(nameEN);
    const variants = new Set([
      k,
      k.replace(/\bpromos?\b/g, 'promo').trim(),
      k.replace(/\bblack\s+star\b/g, '').replace(/\s+/g, ' ').trim(),
      k.replace(/\bthe\b/g, '').replace(/\s+/g, ' ').trim(),
      // part after "X : Y" → just Y
      k.split(/\s*:\s*/).pop(),
      // part after "EX " → drop "ex" prefix
      k.replace(/^ex\s+/, '').trim(),
      // strip series prefix if nameEN has "Block: Name" → try just "Name"
      k.split(/\s+/).slice(-2).join(' '),
    ].filter(Boolean));
    for (const v of variants) {
      if (pctgByName.has(v)) { pctg = pctgByName.get(v); break; }
    }
    // Garde-fou : rejette si écart de total > 50 % (ex: MEP 53 vs me1 188)
    if (pctg && data.totalCards) {
      const pt = pctg.printedTotal || pctg.total || 0;
      if (pt && Math.abs(pt - data.totalCards) / Math.max(pt, data.totalCards) > 0.5) {
        pctg = null;
      }
    }
  }

  // Purge d'éventuels prix injectés lors d'un run précédent faux
  if (!pctg) {
    let cleaned = false;
    for (const c of data.cards) { if (c.priceEUR != null) { delete c.priceEUR; delete c.priceSource; cleaned = true; } }
    if (cleaned) writeFileSync(`data/pokecardex/${f}`, JSON.stringify(data, null, 2));
  }

  if (!pctg) {
    unmatched++;
    report.push(`⚪ ${data.shortName.padEnd(8)} "${data.nameEN || data.name}" — pas de match pctg.io`);
    continue;
  }

  // Récupère les prix : depuis cache existant, sinon fetch
  let setPrices = {};
  const hasInCache = Object.keys(priceCache).some(k => k.startsWith(`${pctg.id}-`));
  if (hasInCache) {
    for (const [k, v] of Object.entries(priceCache)) {
      if (k.startsWith(`${pctg.id}-`)) setPrices[k] = v;
    }
  } else {
    process.stdout.write(`  💰 fetch prix ${pctg.id} (${pctg.name})… `);
    setPrices = await fetchSetPrices(pctg.id);
    console.log(`${Object.keys(setPrices).length} prix`);
    await sleep(DELAY);
  }

  // Inject prices dans les cartes pokecardex
  let priced = 0;
  for (const c of data.cards) {
    const num = parseInt(c.num, 10);
    if (isNaN(num)) continue;
    // Essaye plusieurs formats de numéro
    const candidates = [num.toString(), c.num, String(c.num).replace(/^0+/, '')];
    for (const nk of candidates) {
      const key = `${pctg.id}-${nk}`;
      if (setPrices[key] !== undefined) {
        c.priceEUR = setPrices[key];
        c.priceSource = 'pokemontcg.io';
        priced++;
        break;
      }
    }
  }

  writeFileSync(`data/pokecardex/${f}`, JSON.stringify(data, null, 2));
  if (priced > 0) matched++;
  totalPriced += priced;
  report.push(`${priced > 0 ? '✅' : '⚠️ '} ${data.shortName.padEnd(8)} → ${pctg.id.padEnd(10)} ${pctg.name.padEnd(30)} ${priced}/${data.cards.length} prix`);
}

report.forEach(r => console.log(r));
console.log(`\n📊 Total : ${matched} sets avec au moins 1 prix · ${totalPriced} cartes prisées · ${unmatched} sets sans match`);

// Touch loader
try { const now = new Date(); utimesSync('src/lib/pokecardexLocal.js', now, now); } catch {}
