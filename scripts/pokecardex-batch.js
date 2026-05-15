// Scrape batch de toutes les séries Pokecardex manquantes dans cardscout.
// Lit data/pokecardex-missing.json, scrape une par une, rate-limit 800ms.
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

function findBloc(menu, sid) {
  for (const b of (menu?.blocksByRegion?.FR || [])) {
    if ((b.series || []).some(x => x.shortName === sid)) return { nameFR: b.name, nameEN: b.nameUS };
  }
  return {};
}

async function scrapeOne(short) {
  const fr = await fetchDecrypted(`https://www.pokecardex.com/series/${short}`);
  const s = fr.currentSeries;
  if (!s) throw new Error(`no currentSeries for ${short}`);

  const raretesById = new Map((fr.raretes || []).map(r => [r.id_rarete, r.nom_rarete]));
  const bloc = findBloc(fr.seriesMenu, short);

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
    imageFR: `${SCAN_CDN}/sets/${short}/FR/${c.sort}.jpg?class=hd`,
    imageEN: `${SCAN_CDN}/sets/${short}/US/${c.sort}.jpg?class=hd`,
    versions: (c.versions || []).map(v => v.nom_version)
  }));

  const result = {
    shortName: s.shortName,
    name: s.fullName,
    bloc,
    releaseDateFR: s.releaseDateFR,
    releaseDateUS: s.releaseDateUS,
    totalCards: s.totalCards,
    secretCards: s.secretCards,
    logo: `${IMG_CDN}/assets/images/logos/${short}.png`,
    logoEN: `${IMG_CDN}/assets/images/logos/US/${short}.png`,
    symbol: `${IMG_CDN}/assets/images/symboles/${short}.png`,
    scrapedAt: new Date().toISOString(),
    cards
  };

  if (!existsSync('data/pokecardex')) mkdirSync('data/pokecardex');
  writeFileSync(`data/pokecardex/${short}.json`, JSON.stringify(result, null, 2));
  return { cards: cards.length, bloc: bloc.nameEN || bloc.nameFR || 'Autres', name: s.fullName };
}

const missingDoc = JSON.parse(readFileSync('data/pokecardex-missing.json', 'utf8'));
const missing = missingDoc.missing || [];
const existing = new Set(readdirSync('data/pokecardex').filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, '')));

const todo = missing.filter(m => !existing.has(m.shortName));
console.log(`\n🎯 Batch Pokecardex`);
console.log(`   Manquantes    : ${missing.length}`);
console.log(`   Déjà scrapées : ${missing.length - todo.length}`);
console.log(`   À scraper     : ${todo.length}`);
console.log();

const progressFile = 'data/pokecardex-batch-progress.json';
const progress = { startedAt: new Date().toISOString(), done: [], failed: [], todo: todo.map(t => t.shortName) };
writeFileSync(progressFile, JSON.stringify(progress, null, 2));

let i = 0;
for (const m of todo) {
  i++;
  const t0 = Date.now();
  try {
    const r = await scrapeOne(m.shortName);
    progress.done.push({ shortName: m.shortName, name: r.name, bloc: r.bloc, cards: r.cards });
    console.log(`[${i}/${todo.length}] ✅ ${m.shortName.padEnd(8)} ${r.bloc.padEnd(25)} ${String(r.cards).padStart(4)} cartes  ${r.name}`);
  } catch (err) {
    progress.failed.push({ shortName: m.shortName, error: err.message });
    console.log(`[${i}/${todo.length}] ❌ ${m.shortName.padEnd(8)} ERROR: ${err.message}`);
  }
  writeFileSync(progressFile, JSON.stringify(progress, null, 2));
  const elapsed = Date.now() - t0;
  if (elapsed < DELAY) await sleep(DELAY - elapsed);
}

// Touch loader pour reload auto
try { const now = new Date(); utimesSync('src/lib/pokecardexLocal.js', now, now); } catch {}

console.log(`\n✅ Batch terminé.`);
console.log(`   Succès : ${progress.done.length}`);
console.log(`   Échecs : ${progress.failed.length}`);
