// Liste les séries Pokecardex (FR + EN), les compare à cardscout, affiche les manquantes
import { readFileSync, writeFileSync } from 'fs';
import crypto from 'crypto';

const AES_KEY = 'oe61R0RgVTJm9omokoKuRem2N2GUbUZ8';

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

const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

function flatten(blocks) {
  const out = [];
  for (const b of blocks) for (const s of (b.series || [])) {
    out.push({ ...s, blocFR: b.name, blocEN: b.nameUS });
  }
  return out;
}

const fr = await fetchDecrypted('https://www.pokecardex.com/series');
const en = await fetchDecrypted('https://www.pokecardex.com/en/series');

const frList = flatten(fr.seriesMenu.blocksByRegion.FR || []);
const enList = flatten(en.seriesMenu.blocksByRegion.FR || []); // même region FR, champs traduits

// merge by id
const byId = new Map();
for (const s of frList) byId.set(s.id, { id: s.id, shortName: s.shortName, nameFR: s.fullName, blocFR: s.blocFR, blocEN: s.blocEN });
for (const s of enList) {
  const e = byId.get(s.id) || { id: s.id, shortName: s.shortName };
  e.nameEN = s.fullName;
  byId.set(s.id, e);
}
const all = [...byId.values()];

// cardscout names
const sc = JSON.parse(readFileSync('data/sets-cache.json','utf8'));
const ds = JSON.parse(readFileSync('data/didier-allsets.json','utf8'));
const scNames = new Set();
sc.result.sets.forEach(s => scNames.add(norm(s.name)));
Object.values(ds).forEach(s => scNames.add(norm(s.name)));

const missing = all.filter(s => {
  const candidates = [s.nameEN, s.nameFR].filter(Boolean).map(norm);
  return !candidates.some(c => scNames.has(c));
});

console.log('Pokecardex total series:', all.length);
console.log('Cardscout total names :', scNames.size);
console.log('Missing in cardscout  :', missing.length);
console.log('');
console.log('=== MISSING ===');
missing.forEach(s => {
  console.log(`- ${s.shortName.padEnd(8)} | ${(s.nameEN || '?').padEnd(40)} | ${s.nameFR || '?'}`);
});

writeFileSync('data/pokecardex-missing.json', JSON.stringify({ generatedAt: new Date().toISOString(), missing, all }, null, 2));
console.log('\nSaved: data/pokecardex-missing.json');
