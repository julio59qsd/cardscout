// Audit rapide statique : pas d'appels API, juste compare les données locales
//   1) Pokecardex files : vérifie cohérence declaredTotal vs cards.length
//   2) Sets natifs cardscout : liste ceux qui n'ont PAS d'équivalent pokecardex (donc pas de double)
//   3) Flague les sets qui pourraient être "dupliqués" (même nom) entre natif et pcx
import { readFileSync, readdirSync } from 'fs';

const pcxFiles = readdirSync('data/pokecardex').filter(f => f.endsWith('.json'));
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/&/g, ' and ').replace(/[:\-—–]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

// 1) Vérifie intégrité de chaque pokecardex JSON
const pcxInfo = [];
const nameToPcx = {};
for (const f of pcxFiles) {
  const d = JSON.parse(readFileSync(`data/pokecardex/${f}`, 'utf8'));
  const zone = d.zone || 'fr';
  pcxInfo.push({
    file: f,
    zone,
    shortName: d.shortName,
    name: d.name,
    nameEN: d.nameEN || null,
    declared: d.totalCards || 0,
    actual: d.cards.length
  });
  [d.nameEN, d.name].filter(Boolean).forEach(n => {
    const k = norm(n);
    if (!nameToPcx[k]) nameToPcx[k] = [];
    nameToPcx[k].push({ file: f, zone, shortName: d.shortName });
  });
}

const pcxIntegrityIssues = pcxInfo.filter(p => p.declared !== p.actual);
console.log('════════ 1) Intégrité fichiers pokecardex ════════');
console.log(`${pcxFiles.length} fichiers au total`);
console.log(`${pcxIntegrityIssues.length} fichier(s) avec declaredTotal ≠ cards.length`);
pcxIntegrityIssues.slice(0, 30).forEach(p => {
  console.log(`  ${p.shortName.padEnd(10)} [${p.zone}]  declared=${p.declared}  actual=${p.actual}  (diff ${p.actual - p.declared > 0 ? '+' : ''}${p.actual - p.declared})   ${p.name}`);
});
if (pcxIntegrityIssues.length > 30) console.log(`  … + ${pcxIntegrityIssues.length - 30} autres`);

// 2) Compare sets natifs cardscout avec pokecardex par nom
const sc = JSON.parse(readFileSync('data/sets-cache.json', 'utf8'));
const nativeSets = sc.result.sets.filter(s => s.universe === 'pokemon');

console.log();
console.log('════════ 2) Sets natifs cardscout avec équivalent pokecardex ════════');
const dupes = [];
for (const ns of nativeSets) {
  const k = norm(ns.name);
  const matches = nameToPcx[k];
  if (matches) {
    // On a scrapé un set pokecardex du même nom ⇒ doublon potentiel
    const pcxZones = matches.map(m => `${m.zone}:${m.shortName}`).join(', ');
    dupes.push({ id: ns.id, name: ns.name, series: ns.series, total: ns.total, pcx: pcxZones });
  }
}
if (dupes.length) {
  console.log(`${dupes.length} set(s) natif(s) ont un homonyme dans pokecardex :`);
  dupes.forEach(d => console.log(`  cs=${d.id.padEnd(10)} "${d.name}"  (série=${d.series}, ${d.total} cartes)  → pcx: ${d.pcx}`));
} else {
  console.log('Aucun doublon trouvé par nom.');
}

// 3) Vérifie si certaines sections apparaissent à la fois natifs + pcx zone FR
console.log();
console.log('════════ 3) Résumé global ════════');
const byZone = pcxInfo.reduce((a, p) => { a[p.zone] = (a[p.zone] || 0) + 1; return a; }, {});
console.log('Fichiers pcx par zone:', byZone);
console.log('Sets natifs cardscout (pokemon):', nativeSets.length);
console.log('Total attendu servi :', nativeSets.length + pcxInfo.length, '(natifs + pcx)');
