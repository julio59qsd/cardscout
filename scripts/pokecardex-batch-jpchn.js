// Scrape batch des séries Pokecardex JP + CHN
// URL patterns :
//   JP  : /series/jp/<short>   images : /sets_jp/<short>/<sort>.jpg?class=hd
//   CHN : /series/chn/<short>  images : /sets_chn/<short>/<sort>.jpg?class=hd
// Fichiers : data/pokecardex/jp_<short>.json  et  chn_<short>.json (préfixe pour éviter collisions)
import { readFileSync, writeFileSync, existsSync, mkdirSync, utimesSync, readdirSync } from 'fs';
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

function findBloc(menu, sid, zone) {
  for (const b of (menu?.blocksByRegion?.[zone] || [])) {
    if ((b.series || []).some(x => x.shortName === sid)) return { nameFR: b.name, nameEN: b.nameUS };
  }
  return {};
}

async function scrapeOne(short, zone /* 'jp' | 'chn' */) {
  const subPath = zone; // 'jp' or 'chn'
  const zoneKey = zone.toUpperCase(); // menu key
  const imgDir = zone === 'jp' ? 'sets_jp' : 'sets_chn';
  const url = `https://www.pokecardex.com/series/${subPath}/${short}`;

  const fr = await fetchDecrypted(url);
  const s = fr.currentSeries;
  if (!s) throw new Error(`no currentSeries for ${zone}/${short}`);

  const raretesById = new Map((fr.raretes || []).map(r => [r.id_rarete, r.nom_rarete]));
  const bloc = findBloc(fr.seriesMenu, short, zoneKey);

  const cards = (fr.cartes || []).map(c => ({
    num: c.num_card,
    sort: c.sort,
    nameFR: c.name_card_fr,
    nameEN: c.name_card_en,
    nameDE: c.name_card_de,
    rarity: raretesById.get(c.id_rarete) || String(c.id_rarete),
    illustrator: c.nom_illustrateur || null,
    idPokedex: c.id_pokedex,
    idCardmarket: c.id_cardmarket || null,
    idTcgplayer: c.id_tcgplayer || null,
    cardmarketUrl: c.cardmarket_url ? `https://www.cardmarket.com/fr/Pokemon/Products/Singles/${c.cardmarket_url}` : null,
    image: `${SCAN_CDN}/${imgDir}/${short}/${c.sort}.jpg?class=hd`,
    versions: (c.versions || []).map(v => v.nom_version)
  }));

  const logoDir = zone === 'jp' ? 'logos_jp' : 'logos_chn';
  const symbolDir = zone === 'jp' ? 'symboles_jp' : 'symboles_chn';

  const result = {
    shortName: s.shortName,
    zone,
    name: s.fullName,
    bloc,
    releaseDateFR: s.releaseDateFR,
    releaseDateUS: s.releaseDateUS,
    totalCards: s.totalCards,
    secretCards: s.secretCards,
    logo: `${IMG_CDN}/assets/images/${logoDir}/${short}.png`,
    symbol: `${IMG_CDN}/assets/images/${symbolDir}/${short}.png`,
    scrapedAt: new Date().toISOString(),
    cards
  };

  if (!existsSync('data/pokecardex')) mkdirSync('data/pokecardex');
  const fname = `${zone}_${short}.json`;
  writeFileSync(`data/pokecardex/${fname}`, JSON.stringify(result, null, 2));
  return { cards: cards.length, bloc: bloc.nameEN || bloc.nameFR || 'Autres', name: s.fullName, fname };
}

// Get full JP + CHN list from main /series
console.log('📡 Récupération liste JP + CHN depuis Pokecardex…');
const main = await fetchDecrypted('https://www.pokecardex.com/series');
const jpList = (main.seriesMenu?.blocksByRegion?.JP || []).flatMap(b => (b.series || []).map(s => s.shortName));
const chnList = (main.seriesMenu?.blocksByRegion?.CHN || []).flatMap(b => (b.series || []).map(s => s.shortName));

const existing = new Set(readdirSync('data/pokecardex').filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, '')));

const jpTodo = jpList.filter(s => !existing.has(`jp_${s}`));
const chnTodo = chnList.filter(s => !existing.has(`chn_${s}`));
const total = jpTodo.length + chnTodo.length;
console.log(`\n🎯 JP: ${jpList.length} (${jpTodo.length} à scraper)`);
console.log(`🎯 CHN: ${chnList.length} (${chnTodo.length} à scraper)`);
console.log(`⏱  ~${Math.round(total * DELAY / 1000 / 60)} min estimé`);
console.log();

const progressFile = 'data/pokecardex-batch-jpchn-progress.json';
const progress = { startedAt: new Date().toISOString(), done: [], failed: [], total };
writeFileSync(progressFile, JSON.stringify(progress, null, 2));

let i = 0;
const all = [...jpTodo.map(s => ({ short: s, zone: 'jp' })), ...chnTodo.map(s => ({ short: s, zone: 'chn' }))];
for (const m of all) {
  i++;
  const t0 = Date.now();
  try {
    const r = await scrapeOne(m.short, m.zone);
    progress.done.push({ shortName: m.short, zone: m.zone, name: r.name, bloc: r.bloc, cards: r.cards });
    console.log(`[${i}/${total}] ✅ ${m.zone.padEnd(3)} ${m.short.padEnd(10)} ${r.bloc.padEnd(22)} ${String(r.cards).padStart(4)} cartes  ${r.name}`);
  } catch (err) {
    progress.failed.push({ shortName: m.short, zone: m.zone, error: err.message });
    console.log(`[${i}/${total}] ❌ ${m.zone.padEnd(3)} ${m.short.padEnd(10)} ERROR: ${err.message}`);
  }
  writeFileSync(progressFile, JSON.stringify(progress, null, 2));
  const elapsed = Date.now() - t0;
  if (elapsed < DELAY) await sleep(DELAY - elapsed);
}

try { const now = new Date(); utimesSync('src/lib/pokecardexLocal.js', now, now); } catch {}

console.log(`\n✅ Batch JP+CHN terminé. Succès : ${progress.done.length} · Échecs : ${progress.failed.length}`);
