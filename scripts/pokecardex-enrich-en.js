// Ajoute nameEN (nom anglais du set) à chaque pokecardex FR JSON, en requêtant /en/series/<short>
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import crypto from 'crypto';

const AES_KEY = 'oe61R0RgVTJm9omokoKuRem2N2GUbUZ8';
const DELAY = 700;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function decrypt({ iv, data }) {
  const k = Buffer.from(AES_KEY, 'utf8');
  const i = Buffer.from(iv, 'base64');
  const c = Buffer.from(data, 'base64');
  const d = crypto.createDecipheriv('aes-256-cbc', k, i);
  return JSON.parse(Buffer.concat([d.update(c), d.final()]).toString('utf8'));
}
async function fetchDecrypted(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await r.text();
  const m = html.match(/__INITIAL_DATA_ALL_ENCRYPTED__\s*=\s*(\{[\s\S]*?\});/)
         || html.match(/__INITIAL_DATA_ENCRYPTED__\s*=\s*(\{[\s\S]*?\});/);
  if (!m) throw new Error('no payload in ' + url);
  return decrypt(JSON.parse(m[1]));
}

const files = readdirSync('data/pokecardex')
  .filter(f => f.endsWith('.json') && !f.startsWith('jp_') && !f.startsWith('chn_'));

const todo = files.filter(f => {
  const d = JSON.parse(readFileSync(`data/pokecardex/${f}`, 'utf8'));
  return !d.nameEN;
});
console.log(`Enrich EN name : ${todo.length}/${files.length} à faire`);

let i = 0;
for (const f of todo) {
  i++;
  try {
    const d = JSON.parse(readFileSync(`data/pokecardex/${f}`, 'utf8'));
    const en = await fetchDecrypted(`https://www.pokecardex.com/en/series/${d.shortName}`);
    d.nameEN = en.currentSeries?.fullName || null;
    writeFileSync(`data/pokecardex/${f}`, JSON.stringify(d, null, 2));
    console.log(`[${i}/${todo.length}] ${d.shortName.padEnd(8)} ${d.nameEN}`);
  } catch (err) {
    console.log(`[${i}/${todo.length}] ${f} ERROR: ${err.message}`);
  }
  await sleep(DELAY);
}
console.log('\nFini.');
