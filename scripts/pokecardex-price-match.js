// Test de faisabilité : match pokecardex → prix existants via nom de set
import { readFileSync, readdirSync } from 'fs';

const priceCache = JSON.parse(readFileSync('data/price-cache.json', 'utf8'));
const setsCache  = JSON.parse(readFileSync('data/sets-cache.json', 'utf8'));

// Index des sets pokemontcg.io par nom normalisé
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const pctgByName = new Map();
setsCache.result.sets.forEach(s => {
  pctgByName.set(norm(s.name), s);
});

// Index des priceCache par set
const pricesBySet = new Map();
for (const [cid, price] of Object.entries(priceCache)) {
  const m = cid.match(/^(.+?)-(\d+)$/);
  if (!m) continue;
  const setId = m[1];
  const num = m[2];
  if (!pricesBySet.has(setId)) pricesBySet.set(setId, new Map());
  pricesBySet.get(setId).set(num, price);
}

const pcxDir = 'data/pokecardex';
const files = readdirSync(pcxDir).filter(f => f.endsWith('.json'));

const stats = { totalSets: 0, matchedSets: 0, totalCards: 0, pricedCards: 0, zones: { fr: 0, jp: 0, chn: 0 } };
const sampleMatched = [];
const sampleUnmatched = [];

for (const f of files) {
  const data = JSON.parse(readFileSync(`${pcxDir}/${f}`, 'utf8'));
  stats.totalSets++;
  const zone = data.zone || 'fr';

  // Matching strict : uniquement par nom de SET (pas par bloc)
  // Pour JP/CHN, on ne matche pas du tout (numérotations différentes, faux positifs trop fréquents)
  let matched = null;
  if (zone === 'fr') {
    const k = norm(data.name);
    if (pctgByName.has(k)) matched = pctgByName.get(k);
    // Variantes : nom anglais du bloc + nom FR sans accent, mots courants
    if (!matched) {
      // Essaye remplaçant "et" → "&" pour les noms FR
      const k2 = k.replace(/\bet\b/g, '').replace(/\s+/g,' ').trim();
      if (k2 !== k && pctgByName.has(k2)) matched = pctgByName.get(k2);
    }
  }

  if (matched) {
    stats.matchedSets++;
    const setPrices = pricesBySet.get(matched.id);
    let localPriced = 0;
    for (const c of data.cards) {
      stats.totalCards++;
      if (setPrices) {
        const key = parseInt(c.num, 10).toString();
        if (setPrices.has(key)) { stats.pricedCards++; stats.zones[zone]++; localPriced++; }
      }
    }
    if (localPriced > 0 && sampleMatched.length < 10) {
      sampleMatched.push(`${f} → ${matched.id} (${matched.name}) — ${localPriced}/${data.cards.length} prix`);
    }
  } else {
    for (const c of data.cards) stats.totalCards++;
    if (sampleUnmatched.length < 10) sampleUnmatched.push(`${f} — pas de match pour "${data.name}"`);
  }
}

console.log(JSON.stringify(stats, null, 2));
console.log('\nExemples matchés avec prix :');
sampleMatched.forEach(s => console.log(' ', s));
console.log('\nExemples NON matchés :');
sampleUnmatched.forEach(s => console.log(' ', s));
