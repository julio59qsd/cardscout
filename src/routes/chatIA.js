/**
 * Chat IA — Moteur de réponse contextuel basé sur les données CardScout
 * Analyse l'intention, agrège les données du site, génère une réponse rigoureuse
 * + propositions de questions de suivi contextuelles
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { priceById, priceByName } from './priceAgent.js';
import { kaneSupplementPrices } from './kaneQA.js';
import { didierPrices, didierTrends } from './didier.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_FILE = join(__dirname, '../../data/card-index.json');
const POKEMON_API = 'https://api.pokemontcg.io/v2';
const API_KEY = process.env.POKEMON_API_KEY || '';
const HEADERS = API_KEY ? { 'X-Api-Key': API_KEY } : {};

// ─── HELPERS ────────────────────────────────────────────────────────────────

function getPrice(cardId) {
  return priceById.get(cardId) || kaneSupplementPrices.get(cardId) || didierPrices.get(cardId) || 0;
}

function fmtPrice(p) {
  if (!p || p === 0) return '—';
  return p.toFixed(2).replace('.', ',') + ' €';
}

function loadIndex() {
  try {
    if (existsSync(INDEX_FILE)) return JSON.parse(readFileSync(INDEX_FILE, 'utf8'));
  } catch { }
  return { cards: {} };
}

function searchCards(query, limit = 10) {
  const idx = loadIndex();
  const q = query.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const results = [];
  for (const [id, c] of Object.entries(idx.cards || {})) {
    const name = (c.n || '').toLowerCase().replace(/[^a-z0-9 ]/g, '');
    if (name.includes(q) || q.includes(name.split(' ')[0])) {
      const price = getPrice(id);
      const trend = didierTrends[id] || null;
      results.push({ id, name: c.n, setId: c.s, number: c.num, rarity: c.r, price, trend });
    }
    if (results.length >= limit * 3) break;
  }
  results.sort((a, b) => {
    const na = (a.name || '').toLowerCase(), nb = (b.name || '').toLowerCase();
    const ea = na === q ? 0 : na.startsWith(q) ? 1 : 2;
    const eb = nb === q ? 0 : nb.startsWith(q) ? 1 : 2;
    return ea - eb || b.price - a.price;
  });
  return results.slice(0, limit);
}

async function fetchSets() {
  try {
    const r = await fetch(`${POKEMON_API}/sets?pageSize=20&orderBy=-releaseDate`, { headers: HEADERS });
    if (r.ok) return (await r.json()).data || [];
  } catch { }
  return [];
}

async function fetchSetDetail(setId) {
  try {
    const r = await fetch(`${POKEMON_API}/sets/${setId}`, { headers: HEADERS });
    if (r.ok) return (await r.json()).data;
  } catch { }
  return null;
}

function getTopMovers(limit = 8) {
  const entries = Object.entries(didierTrends)
    .filter(([id, t]) => didierPrices.has(id) && t.confidence >= 55 && Math.abs(t.trend7) > 1);
  const up = entries.filter(([, t]) => t.signal.includes('hausse'))
    .sort((a, b) => b[1].trend7 - a[1].trend7).slice(0, limit);
  const down = entries.filter(([, t]) => t.signal.includes('baisse'))
    .sort((a, b) => a[1].trend7 - b[1].trend7).slice(0, limit);
  return { up, down };
}

function collectionStats(collection) {
  if (!collection || !collection.length) return null;
  const withPrice = collection.filter(c => getPrice(c.id) > 0);
  const totalValue = withPrice.reduce((s, c) => s + getPrice(c.id), 0);
  const sorted = [...withPrice].sort((a, b) => getPrice(b.id) - getPrice(a.id));
  const top5 = sorted.slice(0, 5);
  const trending = withPrice.filter(c => didierTrends[c.id]?.signal.includes('hausse'))
    .sort((a, b) => (didierTrends[b.id]?.trend7 || 0) - (didierTrends[a.id]?.trend7 || 0))
    .slice(0, 3);
  return { total: collection.length, withPrice: withPrice.length, totalValue, top5, trending };
}

// ─── DÉTECTION D'INTENTION ───────────────────────────────────────────────────

function detectIntent(msg) {
  const low = msg.toLowerCase();
  const intents = [];

  if (/prix|combien|vaut|coûte|coute|valeur|valeur|tarif/.test(low)) intents.push('price');
  if (/tendance|hausse|baisse|monte|descend|progresse|évolution|evolution|progression/.test(low)) intents.push('trend');
  if (/collection|mes cartes|mon inventaire|portefeuille/.test(low)) intents.push('collection');
  if (/set|extension|booster|série|serie|sortie|nouvea/.test(low)) intents.push('sets');
  if (/marché|marche|stats|statistique|état|bilan|résumé|overview/.test(low)) intents.push('market');
  if (/prédiction|prediction|investir|investissement|acheter|vendre|recommand/.test(low)) intents.push('prediction');
  if (/rare|rareté|secret|ultra|golden|rainbow|full art/.test(low)) intents.push('rarity');

  // Intent par défaut : recherche de carte
  if (intents.length === 0) intents.push('search');

  return intents;
}

// ─── GÉNÉRATION DE RÉPONSE ───────────────────────────────────────────────────

async function buildReply(msg, collection = []) {
  const intents = detectIntent(msg);
  const sections = [];
  let suggestions = [];

  // ── PRIX D'UNE CARTE ────────────────────────────────────────────
  if (intents.includes('price') || intents.includes('search')) {
    // Nettoyer les mots-clés de la question pour isoler le nom de carte
    const cleaned = msg.replace(/prix|combien|vaut|coûte|coute|valeur|tarif|quel est le|c'est quoi|dis moi|de la carte|la carte/gi, '').trim();
    const cards = searchCards(cleaned || msg, 5);
    if (cards.length > 0) {
      const best = cards[0];
      if (best.price > 0) {
        let block = `💰 <b>${best.name}</b>`;
        if (best.rarity) block += ` <span style="opacity:.7;font-size:11px">(${best.rarity})</span>`;
        block += `<br>Prix actuel : <b>${fmtPrice(best.price)}</b>`;
        if (best.trend) {
          const t = best.trend;
          const arrow = t.signal.includes('hausse') ? '▲' : t.signal.includes('baisse') ? '▼' : '→';
          block += `<br>Tendance 7j : ${arrow} <b>${t.trend7 > 0 ? '+' : ''}${t.trend7}%</b> — ${t.signal} (confiance ${t.confidence}%)`;
          if (t.avg7) block += `<br>Moyenne 7j : ${fmtPrice(t.avg7)}`;
        }
        if (cards.length > 1 && cards[1].price > 0) {
          block += `<br><br>Variantes également trouvées :`;
          cards.slice(1, 4).forEach(c => {
            if (c.price > 0) block += `<br>• ${c.name} ${c.rarity ? `(${c.rarity})` : ''} — ${fmtPrice(c.price)}`;
          });
        }
        sections.push(block);
        suggestions.push(
          `Quelle est la tendance de ${best.name} sur 30 jours ?`,
          `Y a-t-il des cartes similaires qui montent en ce moment ?`,
          `Quel est le meilleur moment pour vendre ${best.name} ?`
        );
      } else {
        sections.push(`Je n'ai pas de prix disponible pour <b>${best.name}</b> en ce moment. Les données seront mises à jour lors du prochain cycle de Didier.`);
        suggestions.push('Quelles sont les cartes les plus chères en ce moment ?', 'Quelle est la tendance générale du marché ?');
      }
    }
  }

  // ── TENDANCES ───────────────────────────────────────────────────
  if (intents.includes('trend') && sections.length === 0) {
    const { up, down } = getTopMovers(5);
    let block = '📈 <b>Tendances du marché en ce moment</b><br><br>';
    if (up.length) {
      block += '🟢 <b>En hausse :</b><br>';
      block += up.map(([id, t]) => `• ${id} — ${t.signal}, +${t.trend7}% / 7j (${fmtPrice(t.cur)})`).join('<br>');
    }
    if (down.length) {
      block += '<br><br>🔴 <b>En baisse :</b><br>';
      block += down.map(([id, t]) => `• ${id} — ${t.signal}, ${t.trend7}% / 7j (${fmtPrice(t.cur)})`).join('<br>');
    }
    if (!up.length && !down.length) block += 'Pas encore assez de données historiques pour calculer les tendances. Didier collecte les prix depuis peu.';
    sections.push(block);
    suggestions.push(
      'Quel est le prix exact de la carte la plus en hausse ?',
      'Quelles extensions sortent prochainement ?',
      'Quelle est la valeur totale de ma collection ?'
    );
  }

  // ── COLLECTION ─────────────────────────────────────────────────
  if (intents.includes('collection')) {
    const stats = collectionStats(collection);
    if (stats && stats.total > 0) {
      let block = `🗂️ <b>Votre collection</b><br>`;
      block += `${stats.total} cartes au total, dont ${stats.withPrice} avec un prix connu.<br>`;
      block += `Valeur estimée totale : <b>${fmtPrice(stats.totalValue)}</b><br><br>`;
      if (stats.top5.length) {
        block += '🏆 <b>Vos 5 cartes les plus précieuses :</b><br>';
        stats.top5.forEach((c, i) => block += `${i + 1}. ${c.name || c.id} — ${fmtPrice(getPrice(c.id))}<br>`);
      }
      if (stats.trending.length) {
        block += '<br>📈 <b>Cartes de votre collection en hausse :</b><br>';
        stats.trending.forEach(c => {
          const t = didierTrends[c.id];
          block += `• ${c.name || c.id} — +${t.trend7}% / 7j<br>`;
        });
      }
      sections.push(block);
      suggestions.push(
        'Quelle carte de ma collection vaut le plus ?',
        'Y a-t-il des cartes de ma collection à vendre maintenant ?',
        'Quelles cartes devrais-je ajouter à ma collection ?'
      );
    } else {
      sections.push('Votre collection est vide pour le moment. Ajoutez des cartes via la recherche pour voir leur valeur ici.');
      suggestions.push('Comment ajouter des cartes à ma collection ?', 'Quelles sont les cartes Pokémon les plus chères ?');
    }
  }

  // ── SETS / EXTENSIONS ──────────────────────────────────────────
  if (intents.includes('sets') && sections.length === 0) {
    const sets = await fetchSets();
    if (sets.length) {
      let block = '📦 <b>Extensions Pokémon récentes</b><br><br>';
      sets.slice(0, 8).forEach(s => {
        block += `• <b>${s.name}</b> — ${s.releaseDate || '—'}, ${s.total || '—'} cartes<br>`;
      });
      sections.push(block);
      suggestions.push(
        'Quelles sont les cartes les plus chères de la dernière extension ?',
        'Quelle extension a le meilleur rapport qualité/prix ?',
        'Y a-t-il des nouvelles sorties prévues ?'
      );
    }
  }

  // ── MARCHÉ GÉNÉRAL ─────────────────────────────────────────────
  if (intents.includes('market') && sections.length === 0) {
    const totalCards = didierPrices.size;
    const totalTrends = Object.keys(didierTrends).length;
    const { up, down } = getTopMovers(3);
    const avgPrice = totalCards > 0
      ? [...didierPrices.values()].reduce((s, v) => s + v, 0) / totalCards
      : 0;
    let block = `📊 <b>État du marché Pokémon TCG</b><br><br>`;
    block += `Cartes suivies : <b>${totalCards.toLocaleString('fr-FR')}</b><br>`;
    block += `Prix moyen : <b>${fmtPrice(avgPrice)}</b><br>`;
    block += `Tendances actives : <b>${totalTrends.toLocaleString('fr-FR')}</b> cartes analysées<br><br>`;
    if (up.length) { block += `🟢 Top hausse : ${up[0][0]} (+${up[0][1].trend7}%)<br>`; }
    if (down.length) { block += `🔴 Top baisse : ${down[0][0]} (${down[0][1].trend7}%)`; }
    sections.push(block);
    suggestions.push(
      'Quelles sont les cartes qui montent le plus en ce moment ?',
      'Quel est le prix de Dracaufeu ex ?',
      'Quelle est la valeur de ma collection ?'
    );
  }

  // ── PRÉDICTION / INVESTISSEMENT ────────────────────────────────
  if (intents.includes('prediction') && sections.length === 0) {
    const { up } = getTopMovers(5);
    let block = `🔮 <b>Recommandations d'investissement</b><br><br>`;
    if (up.length) {
      block += 'Cartes avec le meilleur potentiel de hausse actuellement :<br>';
      up.forEach(([id, t]) => {
        block += `• <b>${id}</b> — ${t.signal}, +${t.trend7}% / 7j, confiance ${t.confidence}%<br>`;
      });
      block += '<br><small style="opacity:.6">Ces données sont basées sur l\'historique des prix. Elles ne constituent pas un conseil financier.</small>';
    } else {
      block += 'Pas encore assez de données historiques pour des recommandations fiables.';
    }
    sections.push(block);
    suggestions.push(
      'Quelle carte a le plus progressé cette semaine ?',
      'Y a-t-il des cartes rares à surveiller ?',
      'Quelle est la tendance du marché en ce moment ?'
    );
  }

  // ── FALLBACK ───────────────────────────────────────────────────
  if (sections.length === 0) {
    sections.push(`Je n'ai pas trouvé d'information précise pour "<b>${msg}</b>".<br>Essayez de me demander le prix d'une carte spécifique, les tendances du marché ou l'état de votre collection.`);
    suggestions = [
      'Quel est le prix de Pikachu ?',
      'Quelles cartes sont en hausse en ce moment ?',
      'Quelle est la valeur de ma collection ?',
      'Quelles sont les dernières extensions ?'
    ];
  }

  return {
    reply: sections.join('<br><br>'),
    suggestions: suggestions.slice(0, 3)
  };
}

// ─── ENDPOINT ────────────────────────────────────────────────────────────────

export async function chatMessage(req, res) {
  const { message = '', collection = [] } = req.body || {};
  if (!message.trim()) return res.json({ reply: 'Message vide.', suggestions: [] });
  try {
    const result = await buildReply(message.trim(), collection);
    res.json(result);
  } catch (e) {
    console.error('ChatIA erreur:', e.message);
    res.status(500).json({ reply: 'Une erreur est survenue.', suggestions: [] });
  }
}
