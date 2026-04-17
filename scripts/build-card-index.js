/**
 * Nuno — Agent de connaissance des cartes
 * Télécharge TOUTES les cartes Pokémon TCG et construit un index local.
 * Usage : node scripts/build-card-index.js
 * Durée estimée : 3-6 min (172 sets, ~25 000 cartes)
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POKEMON_API = 'https://api.pokemontcg.io/v2';
const API_KEY = process.env.POKEMON_API_KEY || '';
const headers = API_KEY ? { 'X-Api-Key': API_KEY } : {};
const OUT = join(__dirname, '../data/card-index.json');

const DELAY = API_KEY ? 50 : 150; // ms entre les requêtes

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchJSON(url) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${url}`);
  return r.json();
}

async function getAllSets() {
  const data = await fetchJSON(`${POKEMON_API}/sets?orderBy=releaseDate&pageSize=250`);
  return (data.data || []).map(s => ({ id: s.id, name: s.name, date: s.releaseDate }));
}

async function getSetCards(setId) {
  const cards = [];
  let page = 1;
  while (true) {
    const url = `${POKEMON_API}/cards?q=${encodeURIComponent(`set.id:${setId}`)}&pageSize=250&page=${page}&select=id,name,images,set,rarity,number`;
    const data = await fetchJSON(url);
    const batch = data.data || [];
    for (const c of batch) {
      if (c.images?.small) {
        cards.push({
          n: c.name,
          i: c.images.small,
          s: c.set?.name || '',
          r: c.rarity || '',
          nb: c.number || ''
        });
      }
    }
    if (cards.length >= (data.totalCount || 0) || !batch.length) break;
    page++;
    await sleep(DELAY);
  }
  return cards;
}

async function main() {
  console.log('\n🧠 Nuno — Construction de l\'index cartes\n');
  console.log(`   API Key : ${API_KEY ? '✓ présente' : '✗ absente (mode lent)'}`);
  console.log(`   Délai   : ${DELAY}ms entre les requêtes\n`);

  // 1. Récupère tous les sets
  process.stdout.write('📦 Récupération des sets… ');
  const sets = await getAllSets();
  console.log(`${sets.length} sets trouvés\n`);

  // Index principal : id → {n, i, s, r, nb}
  const cards = {};
  // Index par premier mot du nom (minuscules) → [id, ...]
  const byName = {};

  let done = 0;
  let totalCards = 0;

  for (const set of sets) {
    const pct = Math.round((++done / sets.length) * 100);
    process.stdout.write(`  [${String(done).padStart(3)}/${sets.length}] ${String(pct).padStart(3)}% ${set.id.padEnd(18)} `);

    try {
      const setCards = await getSetCards(set.id);

      for (const c of setCards) {
        const id = `${set.id}-${c.nb}`;
        cards[id] = c;

        // Index par premier mot
        const key = c.n.toLowerCase().split(' ')[0];
        if (!byName[key]) byName[key] = [];
        byName[key].push(id);

        // Index par nom complet (sans tirets, minuscules)
        const fullKey = c.n.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
        if (fullKey !== key) {
          if (!byName[fullKey]) byName[fullKey] = [];
          byName[fullKey].push(id);
        }
      }

      totalCards += setCards.length;
      console.log(`→ ${setCards.length} cartes`);
    } catch (e) {
      console.log(`→ ⚠ ${e.message}`);
    }

    await sleep(DELAY);
  }

  // Sauvegarde
  const index = {
    meta: {
      count: totalCards,
      sets: sets.length,
      updated: new Date().toISOString()
    },
    cards,
    byName
  };

  writeFileSync(OUT, JSON.stringify(index));
  const sizeMB = (JSON.stringify(index).length / 1024 / 1024).toFixed(1);

  console.log(`\n✅ Nuno est prêt !`);
  console.log(`   ${totalCards.toLocaleString()} cartes connues`);
  console.log(`   ${Object.keys(byName).length.toLocaleString()} clés de recherche`);
  console.log(`   Fichier : data/card-index.json (${sizeMB} MB)\n`);
}

main().catch(err => { console.error('\n❌', err.message); process.exit(1); });
