// Re-scrape TOUTES les séries Pokecardex (FR + JP + CHN) en écrasant les données locales.
// Pokecardex devient la source de vérité. Reprise possible via pokecardex-refresh-progress.json.
import { readFileSync, writeFileSync, existsSync, mkdirSync, utimesSync } from 'fs';
import crypto from 'crypto';

const AES_KEY = 'oe61R0RgVTJm9omokoKuRem2N2GUbUZ8';
const IMG_CDN = 'https://pokecardex.b-cdn.net';
const SCAN_CDN = 'https://pokecardex-scans.b-cdn.net';
const DELAY = 800;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function decrypt({ iv, data }) {
  const key = Buffer.from(AES_KEY, 'utf8');
  const ivBuf = Buffer.from(iv, 'base64');
  const ct = Buffer.from(data, 'base64');
  const d = crypto.createDecipheriv('aes-256-cbc', key, ivBuf);
  return JSON.parse(Buffer.concat([d.update(ct), d.final()]).toString('utf8'));
}

async function fetchDecrypted(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await r.text();
  const m = html.match(/__INITIAL_DATA_ALL_ENCRYPTED__\s*=\s*(\{[\s\S]*?\});/)
         || html.match(/__INITIAL_DATA_ENCRYPTED__\s*=\s*(\{[\s\S]*?\});/);
  if (!m) throw new Error('no encrypted payload in ' + url);
  return decrypt(JSON.parse(m[1]));
}

function findBloc(menu, sid, zoneKey) {
  for (const b of (menu?.blocksByRegion?.[zoneKey] || [])) {
    if ((b.series || []).some(x => x.shortName === sid)) return { nameFR: b.name, nameEN: b.nameUS };
  }
  return {};
}

async function scrapeFR(short) {
  const d = await fetchDecrypted(`https://www.pokecardex.com/series/${short}`);
  const s = d.currentSeries;
  if (!s) throw new Error(`no currentSeries for ${short}`);
  const raretesById = new Map((d.raretes || []).map(r => [r.id_rarete, r.nom_rarete]));
  const bloc = findBloc(d.seriesMenu, short, 'FR');
  const cards = (d.cartes || []).map(c => ({
    num: c.num_card, sort: c.sort,
    nameFR: c.name_card_fr, nameEN: c.name_card_en, nameDE: c.name_card_de,
    rarity: raretesById.get(c.id_rarete) || String(c.id_rarete),
    illustrator: c.nom_illustrateur || null, idPokedex: c.id_pokedex,
    idCardmarket: c.id_cardmarket || null, idTcgplayer: c.id_tcgplayer || null,
    cardmarketUrl: c.cardmarket_url ? `https://www.cardmarket.com/fr/Pokemon/Products/Singles/${c.cardmarket_url}` : null,
    imageFR: `${SCAN_CDN}/sets/${short}/FR/${c.sort}.jpg?class=hd`,
    imageEN: `${SCAN_CDN}/sets/${short}/US/${c.sort}.jpg?class=hd`,
    versions: (c.versions || []).map(v => v.nom_version)
  }));
  const result = {
    shortName: s.shortName, name: s.fullName, bloc,
    releaseDateFR: s.releaseDateFR, releaseDateUS: s.releaseDateUS,
    totalCards: s.totalCards, secretCards: s.secretCards,
    logo: `${IMG_CDN}/assets/images/logos/${short}.png`,
    logoEN: `${IMG_CDN}/assets/images/logos/US/${short}.png`,
    symbol: `${IMG_CDN}/assets/images/symboles/${short}.png`,
    scrapedAt: new Date().toISOString(), cards
  };
  writeFileSync(`data/pokecardex/${short}.json`, JSON.stringify(result, null, 2));
  return { cards: cards.length, bloc: bloc.nameEN || bloc.nameFR || 'Autres', name: s.fullName };
}

async function scrapeJPCHN(short, zone) {
  const zoneKey = zone.toUpperCase();
  const imgDir = zone === 'jp' ? 'sets_jp' : 'sets_chn';
  const d = await fetchDecrypted(`https://www.pokecardex.com/series/${zone}/${short}`);
  const s = d.currentSeries;
  if (!s) throw new Error(`no currentSeries for ${zone}/${short}`);
  const raretesById = new Map((d.raretes || []).map(r => [r.id_rarete, r.nom_rarete]));
  const bloc = findBloc(d.seriesMenu, short, zoneKey);
  const cards = (d.cartes || []).map(c => ({
    num: c.num_card, sort: c.sort,
    nameFR: c.name_card_fr, nameEN: c.name_card_en, nameDE: c.name_card_de,
    rarity: raretesById.get(c.id_rarete) || String(c.id_rarete),
    illustrator: c.nom_illustrateur || null, idPokedex: c.id_pokedex,
    idCardmarket: c.id_cardmarket || null, idTcgplayer: c.id_tcgplayer || null,
    cardmarketUrl: c.cardmarket_url ? `https://www.cardmarket.com/fr/Pokemon/Products/Singles/${c.cardmarket_url}` : null,
    image: `${SCAN_CDN}/${imgDir}/${short}/${c.sort}.jpg?class=hd`,
    versions: (c.versions || []).map(v => v.nom_version)
  }));
  const logoDir = zone === 'jp' ? 'logos_jp' : 'logos_chn';
  const symbolDir = zone === 'jp' ? 'symboles_jp' : 'symboles_chn';
  const result = {
    shortName: s.shortName, zone, name: s.fullName, bloc,
    releaseDateFR: s.releaseDateFR, releaseDateUS: s.releaseDateUS,
    totalCards: s.totalCards, secretCards: s.secretCards,
    logo: `${IMG_CDN}/assets/images/${logoDir}/${short}.png`,
    symbol: `${IMG_CDN}/assets/images/${symbolDir}/${short}.png`,
    scrapedAt: new Date().toISOString(), cards
  };
  writeFileSync(`data/pokecardex/${zone}_${short}.json`, JSON.stringify(result, null, 2));
  return { cards: cards.length, bloc: bloc.nameEN || bloc.nameFR || 'Autres', name: s.fullName };
}

if (!existsSync('data/pokecardex')) mkdirSync('data/pokecardex');

console.log('📡 Récupération des listes complètes FR + JP + CHN…');
const main = await fetchDecrypted('https://www.pokecardex.com/series');
const frList  = (main.seriesMenu?.blocksByRegion?.FR  || []).flatMap(b => (b.series || []).map(s => ({ short: s.shortName, zone: 'fr'  })));
const jpList  = (main.seriesMenu?.blocksByRegion?.JP  || []).flatMap(b => (b.series || []).map(s => ({ short: s.shortName, zone: 'jp'  })));
const chnList = (main.seriesMenu?.blocksByRegion?.CHN || []).flatMap(b => (b.series || []).map(s => ({ short: s.shortName, zone: 'chn' })));

// Reprise après interruption
const progressFile = 'data/pokecardex-refresh-progress.json';
let done = new Set();
if (existsSync(progressFile)) {
  try { done = new Set((JSON.parse(readFileSync(progressFile, 'utf8')).done || []).map(d => `${d.zone}_${d.short}`)); }
  catch {}
}

const all = [...frList, ...jpList, ...chnList];
const todo = all.filter(x => !done.has(`${x.zone}_${x.short}`));
console.log(`\n🎯 Total : ${all.length}  (FR:${frList.length} · JP:${jpList.length} · CHN:${chnList.length})`);
console.log(`   Déjà fait (progress) : ${all.length - todo.length}`);
console.log(`   À scraper           : ${todo.length}`);
console.log(`⏱  ~${Math.round(todo.length * DELAY / 1000 / 60)} min estimé\n`);

const progress = { startedAt: new Date().toISOString(), done: [], failed: [] };
if (existsSync(progressFile)) {
  try {
    const prev = JSON.parse(readFileSync(progressFile, 'utf8'));
    progress.done = prev.done || [];
    progress.failed = prev.failed || [];
  } catch {}
}

let i = 0;
for (const m of todo) {
  i++;
  const t0 = Date.now();
  try {
    const r = m.zone === 'fr' ? await scrapeFR(m.short) : await scrapeJPCHN(m.short, m.zone);
    progress.done.push({ short: m.short, zone: m.zone, name: r.name, bloc: r.bloc, cards: r.cards });
    console.log(`[${i}/${todo.length}] ✅ ${m.zone.padEnd(3)} ${m.short.padEnd(10)} ${r.bloc.padEnd(22)} ${String(r.cards).padStart(4)} cartes  ${r.name}`);
  } catch (err) {
    progress.failed.push({ short: m.short, zone: m.zone, error: err.message });
    console.log(`[${i}/${todo.length}] ❌ ${m.zone.padEnd(3)} ${m.short.padEnd(10)} ERROR: ${err.message}`);
  }
  writeFileSync(progressFile, JSON.stringify(progress, null, 2));
  const elapsed = Date.now() - t0;
  if (elapsed < DELAY) await sleep(DELAY - elapsed);
}

try { const now = new Date(); utimesSync('src/lib/pokecardexLocal.js', now, now); } catch {}

console.log(`\n✅ Refresh terminé. Succès : ${progress.done.length} · Échecs : ${progress.failed.length}`);
if (progress.failed.length) {
  console.log('\n⚠️  Échecs :');
  progress.failed.forEach(f => console.log(`  ${f.zone} ${f.short} — ${f.error}`));
}
