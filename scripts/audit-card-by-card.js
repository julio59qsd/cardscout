// Audit fin : pour chaque set natif cardscout (pokemon), trouve l'homonyme pokecardex
// et compare le nombre de cartes. Liste les divergences.
import { readFileSync, readdirSync, writeFileSync } from 'fs';

const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&/g, ' and ').replace(/[:\-—–']/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

// 1) Sets natifs cardscout depuis l'API
const apiUrl = 'http://localhost:3000/api/pokemon/sets';
const sc = await fetch(apiUrl).then(r => r.json());
const allSets = sc.sets || [];
const native = allSets.filter(s => !s.id.startsWith('pcx_'));
const pcxSets = allSets.filter(s => s.id.startsWith('pcx_'));

// 2) Charge tous les fichiers pokecardex (FR uniquement pour audit principal)
const pcxFiles = readdirSync('data/pokecardex').filter(f => f.endsWith('.json') && !f.startsWith('jp_') && !f.startsWith('chn_'));
const pcxByName = {};
const pcxByShort = {};
for (const f of pcxFiles) {
  const d = JSON.parse(readFileSync(`data/pokecardex/${f}`, 'utf8'));
  const k1 = norm(d.name);
  const k2 = norm(d.nameEN || '');
  const entry = { file: f, shortName: d.shortName, name: d.name, nameEN: d.nameEN || '', totalCards: d.totalCards || 0, actualCards: d.cards.length, releaseDateFR: d.releaseDateFR || '', releaseDateUS: d.releaseDateUS || '' };
  pcxByShort[d.shortName] = entry;
  if (k1 && !pcxByName[k1]) pcxByName[k1] = entry;
  if (k2 && !pcxByName[k2]) pcxByName[k2] = entry;
}

// 3) Pour chaque set natif, trouve l'homonyme pcx
const divergences = [];
const matched = [];
const unmatched = [];

for (const ns of native) {
  const k = norm(ns.name);
  const match = pcxByName[k];
  if (!match) {
    unmatched.push({ id: ns.id, name: ns.name, total: ns.total });
    continue;
  }
  const pcxTotal = match.totalCards;
  const diff = ns.total - pcxTotal;
  if (diff !== 0) {
    divergences.push({
      id: ns.id, name: ns.name, scTotal: ns.total,
      pcxFile: match.file, pcxShort: match.shortName, pcxName: match.name, pcxTotal,
      diff
    });
  }
  matched.push({ id: ns.id, name: ns.name, scTotal: ns.total, pcxShort: match.shortName, pcxTotal });
}

console.log('════════ AUDIT CARTE PAR CARTE ════════');
console.log(`Sets natifs cardscout : ${native.length}`);
console.log(`Sets pokecardex chargés : ${pcxSets.length}`);
console.log(`Match trouvés (homonyme) : ${matched.length}`);
console.log(`Sans match pokecardex : ${unmatched.length}`);
console.log(`Divergences de total : ${divergences.length}`);
console.log();

if (divergences.length) {
  console.log('════ DIVERGENCES (cardscout total ≠ pokecardex total) ════');
  divergences.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  divergences.forEach(d => {
    const sign = d.diff > 0 ? '+' : '';
    console.log(`  ${d.id.padEnd(12)} "${d.name.padEnd(35)}" cs=${String(d.scTotal).padStart(4)}  pcx=${String(d.pcxTotal).padStart(4)} (diff ${sign}${d.diff})  [pcx:${d.pcxShort}]`);
  });
  console.log();
}

if (unmatched.length) {
  console.log('════ SETS SANS HOMONYME POKECARDEX (info) ════');
  unmatched.slice(0, 40).forEach(u => {
    console.log(`  ${u.id.padEnd(12)} "${u.name.padEnd(35)}" ${u.total} cartes`);
  });
  if (unmatched.length > 40) console.log(`  … + ${unmatched.length - 40} autres`);
}

writeFileSync('data/audit-card-by-card.json', JSON.stringify({
  generatedAt: new Date().toISOString(),
  summary: { native: native.length, pcx: pcxSets.length, matched: matched.length, unmatched: unmatched.length, divergences: divergences.length },
  divergences, unmatched, matched
}, null, 2));
console.log('\nSaved: data/audit-card-by-card.json');
