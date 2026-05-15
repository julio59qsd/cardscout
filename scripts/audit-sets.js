// Audit : compare le nb de cartes affiché par cardscout vs pokecardex pour chaque set
// Signale les écarts (cardscout > pokecardex = cartes en trop, ou l'inverse)
import { readFileSync, readdirSync } from 'fs';

const BASE = 'http://localhost:3000';

// 1) Charge les données pokecardex (totalCards déclaré)
const pcxFiles = readdirSync('data/pokecardex').filter(f => f.endsWith('.json'));
const pcxBySetId = {};  // pcx_... → {total, name, zone, shortName}
const pcxByName = {};    // nom normalisé (EN si dispo sinon FR) → pcx data
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&/g, ' and ').replace(/[:\-—–]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

for (const f of pcxFiles) {
  const d = JSON.parse(readFileSync(`data/pokecardex/${f}`, 'utf8'));
  const zone = d.zone || 'fr';
  const idSuffix = zone === 'fr' ? d.shortName : `${zone}_${d.shortName}`;
  const setId = `pcx_${idSuffix}`;
  const total = d.totalCards ?? d.cards.length;
  const realCount = d.cards.length;
  pcxBySetId[setId] = { setId, shortName: d.shortName, zone, name: d.name, nameEN: d.nameEN, declaredTotal: total, actualCount: realCount };
  // index par nom
  [d.nameEN, d.name].filter(Boolean).forEach(n => { pcxByName[norm(n)] = pcxBySetId[setId]; });
}

// 2) Récup liste des sets depuis l'API
const setsRes = await fetch(`${BASE}/api/pokemon/sets?_t=${Date.now()}`);
const setsData = await setsRes.json();
const sets = setsData.sets || [];

// 3) Pour chaque set cardscout, compte les cartes servies
async function countCardsServed(set) {
  const ids = set.mergedIds || [set.id];
  let total = 0;
  const seen = new Set();
  for (const id of ids) {
    const r = await fetch(`${BASE}/api/pokemon/search?setId=${encodeURIComponent(id)}&_t=${Date.now()}`);
    const d = await r.json();
    for (const c of d.cards || []) { if (!seen.has(c.id)) { seen.add(c.id); total++; } }
  }
  return total;
}

const issues = { moreInCS: [], moreInPCX: [], noPcxMatch: 0, matched: 0 };
let idx = 0;
for (const s of sets) {
  idx++;
  if (idx % 50 === 0) process.stderr.write(`  ${idx}/${sets.length}\r`);
  const served = await countCardsServed(s);

  // Si c'est un set pokecardex, on compare directement
  if (s.id?.startsWith('pcx_')) {
    const p = pcxBySetId[s.id];
    if (!p) { continue; }
    issues.matched++;
    if (served !== p.actualCount) {
      issues.moreInCS.push({ setId: s.id, name: s.name, cs: served, pcx: p.actualCount, delta: served - p.actualCount });
    }
    continue;
  }

  // Sinon : essaye de matcher le set natif à un pokecardex par nom
  const candidates = [s.name, s.series ? `${s.series} ${s.name}` : null].filter(Boolean);
  let pcx = null;
  for (const c of candidates) {
    const k = norm(c);
    if (pcxByName[k]) { pcx = pcxByName[k]; break; }
  }
  if (!pcx) { issues.noPcxMatch++; continue; }
  issues.matched++;
  if (served > pcx.actualCount) {
    issues.moreInCS.push({ setId: s.id, name: s.name, cs: served, pcx: pcx.actualCount, delta: served - pcx.actualCount, pcxName: pcx.name });
  } else if (served < pcx.actualCount) {
    issues.moreInPCX.push({ setId: s.id, name: s.name, cs: served, pcx: pcx.actualCount, delta: pcx.actualCount - served, pcxName: pcx.name });
  }
}

console.log('\n════════ RÉSULTATS ════════');
console.log(`Sets matchés avec pokecardex : ${issues.matched}`);
console.log(`Sets sans correspondance pcx  : ${issues.noPcxMatch}`);
console.log();
console.log(`⚠️  Cardscout > Pokecardex (cartes en trop côté cardscout) : ${issues.moreInCS.length}`);
issues.moreInCS.sort((a,b)=>b.delta-a.delta).slice(0,20).forEach(x=>{
  console.log(`   ${String(x.delta).padStart(4)} de trop · ${x.setId.padEnd(18)} ${x.name.padEnd(35)} (CS=${x.cs}, PCX=${x.pcx})${x.pcxName ? ' ← pcx: '+x.pcxName : ''}`);
});
console.log();
console.log(`⚠️  Pokecardex > Cardscout (cartes manquantes côté cardscout) : ${issues.moreInPCX.length}`);
issues.moreInPCX.sort((a,b)=>b.delta-a.delta).slice(0,20).forEach(x=>{
  console.log(`   ${String(x.delta).padStart(4)} manquant · ${x.setId.padEnd(18)} ${x.name.padEnd(35)} (CS=${x.cs}, PCX=${x.pcx})${x.pcxName ? ' ← pcx: '+x.pcxName : ''}`);
});
