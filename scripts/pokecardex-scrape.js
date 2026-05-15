// Scrape une série Pokecardex (cartes, noms FR/EN, raretés, images, IDs cardmarket/tcgplayer)
// Usage: node scripts/pokecardex-scrape.js <SHORTNAME>   (ex: MEE)
import { readFileSync, writeFileSync, existsSync, mkdirSync, utimesSync } from 'fs';
import crypto from 'crypto';

const AES_KEY = 'oe61R0RgVTJm9omokoKuRem2N2GUbUZ8';
const IMG_CDN = 'https://pokecardex.b-cdn.net';

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

const SCAN_CDN = 'https://pokecardex-scans.b-cdn.net';

const short = (process.argv[2] || '').toUpperCase();
if (!short) { console.error('Usage: node scripts/pokecardex-scrape.js <SHORTNAME>'); process.exit(1); }

console.log(`🔎 Pokecardex scrape: ${short}`);
const fr = await fetchDecrypted(`https://www.pokecardex.com/series/${short}`);
const en = await fetchDecrypted(`https://www.pokecardex.com/en/series/${short}`);

const s = fr.currentSeries;
const raretesById = new Map((fr.raretes || []).map(r => [r.id_rarete, r.nom_rarete]));

// Bloc parent (ex: "Mega Evolution") via le menu des séries
function findBloc(menu, sid) {
  for (const b of (menu?.blocksByRegion?.FR || [])) {
    if ((b.series || []).some(x => x.shortName === sid)) return { nameFR: b.name, nameEN: b.nameUS };
  }
  return {};
}
const bloc = findBloc(fr.seriesMenu, short);

const cards = fr.cartes.map(c => ({
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
const outPath = `data/pokecardex/${short}.json`;
writeFileSync(outPath, JSON.stringify(result, null, 2));

// Touch le loader pour déclencher node --watch reload
try { const now = new Date(); utimesSync('src/lib/pokecardexLocal.js', now, now); } catch {}

console.log(`\n✅ ${short} — ${s.fullName}`);
console.log(`   Release FR: ${s.releaseDateFR}  |  Cartes: ${cards.length}/${s.totalCards}`);
console.log(`   Sauvegardé: ${outPath}`);
console.log(`\n   Aperçu:`);
cards.slice(0, 15).forEach(c => console.log(`   ${c.num}  ${c.rarity.padEnd(22)}  ${c.nameFR}  (EN: ${c.nameEN})`));
