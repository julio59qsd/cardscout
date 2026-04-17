// Script one-shot : télécharge les prix de tous les sets locaux et sauvegarde data/price-cache.json
// Usage : node scripts/build-price-cache.js

import { readdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POKEMON_API = 'https://api.pokemontcg.io/v2';
const API_KEY = process.env.POKEMON_API_KEY || '';
const headers = API_KEY ? { 'X-Api-Key': API_KEY } : {};
const PHOTOS_DIR = join(__dirname, '../../photos');
const OUT_FILE = join(__dirname, '../data/price-cache.json');

// Extrait les set IDs uniques des fichiers photos
function getSetIds() {
  const ids = new Set();
  for (const f of readdirSync(PHOTOS_DIR)) {
    if (!/\.(png|webp)$/i.test(f)) continue;
    const cardId = f.replace(/_.*/, '');
    const setId = cardId.replace(/-[^-]*$/, '');
    if (setId) ids.add(setId);
  }
  return [...ids].sort();
}

function bestPrice(c) {
  const cm = c.cardmarket?.prices || {};
  const tcgAll = c.tcgplayer?.prices || {};
  const tcgBest = Object.values(tcgAll).reduce((best, v) => {
    const m = v?.market || v?.mid || 0;
    return m > (best || 0) ? m : best;
  }, 0);

  return cm.averageSellPrice || cm.trendPrice
    || cm.avg1 || cm.avg7 || cm.avg30
    || cm.reverseHoloAvg1 || cm.reverseHoloAvg7 || cm.reverseHoloAvg30
    || cm.reverseHoloTrend || cm.reverseHoloSell
    || cm.lowPriceExPlus || cm.lowPrice
    || cm.reverseHoloLow || cm.germanProLow
    || cm.suggestedPrice
    || (tcgBest * 0.93)  // USD → EUR approximatif
    || 0;
}

async function fetchSetPrices(setId) {
  const prices = {};
  let page = 1;
  while (true) {
    const url = `${POKEMON_API}/cards?q=${encodeURIComponent(`set.id:${setId}`)}&pageSize=250&page=${page}&select=id,cardmarket,tcgplayer`;
    const r = await fetch(url, { headers });
    if (!r.ok) { console.warn(`  ⚠ HTTP ${r.status} pour ${setId}`); break; }
    const data = await r.json();
    for (const c of data.data || []) {
      const p = bestPrice(c);
      if (p > 0) prices[c.id] = Math.round(p * 100) / 100;
    }
    const total = data.totalCount || 0;
    if (Object.keys(prices).length >= total || !data.data?.length) break;
    page++;
  }
  return prices;
}

async function main() {
  const setIds = getSetIds();
  console.log(`\n💰 Construction du cache prix — ${setIds.length} sets, ~${setIds.length * 150} cartes estimées\n`);

  const priceCache = {};
  let done = 0;

  for (const setId of setIds) {
    process.stdout.write(`  [${String(++done).padStart(3)}/${setIds.length}] ${setId.padEnd(16)} `);
    try {
      const prices = await fetchSetPrices(setId);
      const count = Object.keys(prices).length;
      Object.assign(priceCache, prices);
      console.log(`→ ${count} cartes avec prix`);
    } catch (e) {
      console.log(`→ erreur: ${e.message}`);
    }
    // Petite pause pour respecter les rate limits
    await new Promise(r => setTimeout(r, 120));
  }

  writeFileSync(OUT_FILE, JSON.stringify(priceCache));
  console.log(`\n✅ ${Object.keys(priceCache).length} prix sauvegardés dans data/price-cache.json`);
}

main().catch(console.error);
