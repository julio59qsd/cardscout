import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { priceById, priceByName } from './priceAgent.js';
import { kaneSupplementPrices } from './kaneQA.js';
import { didierPrices, didierTrends } from './didier.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_FILE = join(__dirname, '../../data/card-index.json');

const MODEL_VISION = 'meta-llama/llama-4-scout-17b-16e-instruct';
const MODEL_TEXT   = 'llama-3.3-70b-versatile';
const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions';

function hasImages(messages) {
  return messages.some(m => Array.isArray(m.content) && m.content.some(p => p.type === 'image_url'));
}

async function groqCall(systemText, messages, maxTokens = 4096) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY manquante');
  const model = hasImages(messages) ? MODEL_VISION : MODEL_TEXT;
  const body = {
    model,
    max_tokens: maxTokens,
    temperature: 0.7,
    messages: [{ role: 'system', content: systemText }, ...messages]
  };
  const resp = await fetch(GROQ_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Groq ${resp.status}: ${err}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

function toGroqContent(content) {
  if (typeof content === 'string') return content;
  return content.map(item => {
    if (item.type === 'text') return { type: 'text', text: item.text };
    if (item.type === 'image') return { type: 'image_url', image_url: { url: `data:${item.source.media_type};base64,${item.source.data}` } };
    return null;
  }).filter(Boolean);
}

// ─── SYSTEM PROMPT ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es un expert en support client et en analyse de données, doté d'une rigueur analytique et d'une maîtrise technique approfondie.

## Rôle
Tu combines deux missions complémentaires :
1. **Support client** : tu traites les demandes avec précision, empathie professionnelle et efficacité. Tu identifies rapidement la nature du problème et fournis des solutions claires, vérifiées et actionnables.
2. **Analyse de données / recherche** : tu explores, interprètes et synthétises des données complexes. Tu produis des insights fiables, sourcés quand possible, avec un raisonnement transparent.

## Ton & Style
- Ton expert et technique : vocabulaire précis, pas de simplification excessive
- Structuré : utilise des titres, listes ou tableaux quand cela clarifie
- Direct : va à l'essentiel, sans remplissage inutile

## Priorités absolues
- **Exactitude avant tout** : si tu n'es pas certain, dis-le explicitement
- **Transparence du raisonnement** : explique comment tu arrives à une conclusion
- **Prix et tendances** : pour les chiffres précis (prix, % de tendance), utilise UNIQUEMENT les données CardScout fournies dans le contexte. Si aucune donnée n'est disponible pour une carte, dis-le clairement mais reste utile : explique ce que tu sais sur la carte (set, rareté, popularité, méta) et suggère de vérifier sur Cardmarket
- **Connaissances TCG générales** : pour tout le reste (règles, stratégie, méta, histoire des cartes, conseils d'achat/vente), tu peux utiliser tes connaissances générales sans restriction
- En cas d'ambiguïté, pose UNE question ciblée avant de répondre

## Format des réponses
- Formate tes réponses en HTML simple : \`<b>\`, \`<br>\`, \`<span style="...">\`, \`<ul>\`, \`<li>\`
- Commence par une réponse directe à la question posée
- Développe ensuite avec le raisonnement ou les détails techniques si nécessaire
- Termine par une action recommandée ou un résumé si pertinent
- **À la toute fin de ta réponse**, inclus sur une nouvelle ligne exactement ce bloc JSON (ne le modifie pas, ne l'omets pas) :
{"suggestions":["<question de suivi 1>","<question de suivi 2>","<question de suivi 3>"]}

## Ce que tu ne dois JAMAIS faire
- Dire "données insuffisantes", "je n'ai pas assez d'informations", "je ne peux pas répondre" — c'est interdit
- Si tu n'as pas le prix exact d'une carte, donne quand même une estimation basée sur tes connaissances du marché TCG, en précisant que c'est une estimation générale
- Bloquer ou refuser de répondre sous prétexte qu'il n'y a pas de données CardScout disponibles

## Ce que tu n'es pas
Tu n'es pas un assistant généraliste bavard. Tu es un outil de précision.

## Contexte CardScout
Tu opères sur la plateforme CardScout — un estimateur de prix et gestionnaire de collections TCG (Pokémon, Yu-Gi-Oh!, One Piece, Magic: The Gathering, Lorcana, Dragon Ball Super).
- Les prix sont collectés en temps réel depuis Cardmarket (EUR) et TCGPlayer (USD)
- L'agent **Vinicius** met à jour les prix toutes les 24h
- L'agent **Kane** comble les prix manquants (QA)
- L'agent **Didier** maintient un historique 90 jours et calcule les tendances (signal, confiance, volatilité)
- L'index couvre 20 000+ cartes Pokémon TCG
- Si aucune donnée de prix n'est disponible pour une carte demandée, dis-le honnêtement et apporte quand même de la valeur : contexte de la carte, son importance dans le méta, conseils généraux sur sa valeur sur le marché TCG
- **Si une image est envoyée et que tu ne reconnais pas de carte TCG valide** : réponds exactement <b>Cette carte n'existe pas ou n'est pas reconnue.</b> suivi d'une suggestion (meilleure photo, meilleur éclairage, etc.)`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getPrice(cardId) {
  return priceById.get(cardId) || kaneSupplementPrices.get(cardId) || didierPrices.get(cardId) || 0;
}

function fmtPrice(p) {
  if (!p || p === 0) return '—';
  return p.toFixed(2).replace('.', ',') + ' €';
}

function fmtPct(v) {
  if (v === undefined || v === null) return '—';
  return (v > 0 ? '+' : '') + v + '%';
}

function sourceLabel() {
  const sources = [];
  if (priceById.size > 0) sources.push(`Vinicius (${priceById.size.toLocaleString('fr-FR')} entrées)`);
  if (kaneSupplementPrices.size > 0) sources.push(`Kane (${kaneSupplementPrices.size.toLocaleString('fr-FR')})`);
  if (didierPrices.size > 0) sources.push(`Didier (${didierPrices.size.toLocaleString('fr-FR')})`);
  return sources.length ? sources.join(', ') : 'données locales';
}

function loadIndex() {
  try {
    if (existsSync(INDEX_FILE)) return JSON.parse(readFileSync(INDEX_FILE, 'utf8'));
  } catch { }
  return { cards: {} };
}

function searchCards(query, limit = 8) {
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

function getTopMovers(limit = 6) {
  const entries = Object.entries(didierTrends)
    .filter(([id, t]) => didierPrices.has(id) && t.confidence >= 55 && Math.abs(t.trend7) > 1);
  const up = entries.filter(([, t]) => t.signal.includes('hausse'))
    .sort((a, b) => b[1].trend7 - a[1].trend7).slice(0, limit);
  const down = entries.filter(([, t]) => t.signal.includes('baisse'))
    .sort((a, b) => a[1].trend7 - b[1].trend7).slice(0, limit);
  return { up, down };
}

function collectionContext(collection) {
  if (!collection || !collection.length) return null;
  const withPrice = collection.filter(c => getPrice(c.id) > 0);
  const totalValue = withPrice.reduce((s, c) => s + getPrice(c.id), 0);
  const sorted = [...withPrice].sort((a, b) => getPrice(b.id) - getPrice(a.id));
  const top5 = sorted.slice(0, 5).map(c => ({
    name: c.name || c.id,
    price: getPrice(c.id),
    trend: didierTrends[c.id] || null
  }));
  const trending = withPrice
    .filter(c => didierTrends[c.id]?.signal.includes('hausse'))
    .sort((a, b) => (didierTrends[b.id]?.trend7 || 0) - (didierTrends[a.id]?.trend7 || 0))
    .slice(0, 3)
    .map(c => ({ name: c.name || c.id, trend7: didierTrends[c.id].trend7, confidence: didierTrends[c.id].confidence }));
  return { total: collection.length, withPrice: withPrice.length, totalValue, top5, trending };
}

const STOP_WORDS = /\b(le|la|les|un|une|des|du|de|au|aux|en|et|ou|est|sont|a|y|il|elle|ils|elles|je|tu|nous|vous|me|te|se|ce|cet|cette|ces|mon|ma|mes|ton|ta|tes|son|sa|ses|notre|votre|leur|leurs|qui|que|quoi|dont|où|quand|comment|combien|quel|quelle|quels|quelles|sur|sous|dans|par|pour|avec|sans|entre|vers|chez|puis|mais|car|donc|or|ni|si|ne|pas|plus|très|bien|tout|tous|toute|toutes|plus|moins|aussi|même|autre|autres|encore|déjà|jamais|rien|quelque|chaque|plusieurs|aucun|aucune|peu|beaucoup|assez|trop|vraiment|parle|moi|dis|voir|veux|peux|peut|faire|avoir|être|aller|venir|savoir|vouloir|pouvoir|quelle|quel|est|le|prix|du|marché|marche|état|etat|général|general|actuellement|moment|maintenant|actuels|actuel|actuelle|info|infos|donne|donne-moi|montre|montre-moi|carte|cartes|tcg|pokemon|pokémon|yugioh|magic|lorcana|onepiece)\b/gi;

function extractCardQuery(message) {
  return message
    .replace(/prix|combien|vaut|coûte|coute|valeur|tarif|tendance|hausse|baisse|monte|descend|investir|acheter|vendre|prédiction|prediction|de la carte|la carte|du pokémon|du pokemon/gi, ' ')
    .replace(STOP_WORDS, ' ')
    .replace(/[^a-zàâäéèêëîïôùûüÿç0-9\- ]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildContext(message, collection) {
  const parts = [];
  const isPriceOrTrendQuery = /prix|combien|vaut|coûte|coute|valeur|tarif|tendance|hausse|baisse|monte|descend|évolution|evolution|investir|acheter|vendre|prédiction|prediction/i.test(message);

  if (isPriceOrTrendQuery) {
    const cardQuery = extractCardQuery(message);
    if (cardQuery.length >= 3) {
      const cards = searchCards(cardQuery, 5);
      const relevant = cards.filter(c => {
        const n = (c.name || '').toLowerCase().replace(/[^a-z0-9 ]/g, '');
        const q = cardQuery.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(w => w.length >= 3);
        return q.some(word => n.includes(word));
      });
      if (relevant.length > 0) {
        parts.push('### Cartes correspondantes dans l\'index CardScout :');
        relevant.forEach(c => {
          let line = `- **${c.name}**`;
          if (c.rarity) line += ` (${c.rarity})`;
          line += ` | Prix : ${fmtPrice(c.price)}`;
          if (c.trend) {
            const arrow = c.trend.signal.includes('hausse') ? '▲' : c.trend.signal.includes('baisse') ? '▼' : '→';
            line += ` | Tendance 7j : ${arrow} ${fmtPct(c.trend.trend7)} | Confiance : ${c.trend.confidence}%`;
            if (c.trend.volatility > 15) line += ` | ⚠️ Volatilité : ${c.trend.volatility}%`;
          }
          parts.push(line);
        });
      }
    }
  }

  const totalCards = didierPrices.size;
  const totalTrends = Object.keys(didierTrends).length;
  if (totalCards > 0) {
    const { up, down } = getTopMovers(3);
    parts.push(`\n### État du marché CardScout :`);
    parts.push(`- Cartes suivies : ${totalCards.toLocaleString('fr-FR')}`);
    parts.push(`- Cartes avec tendances : ${totalTrends.toLocaleString('fr-FR')}`);
    parts.push(`- Sources actives : ${sourceLabel()}`);
    if (up.length) parts.push(`- Meilleure hausse 7j : ${up[0][0]} (${fmtPct(up[0][1].trend7)})`);
    if (down.length) parts.push(`- Meilleure baisse 7j : ${down[0][0]} (${fmtPct(down[0][1].trend7)})`);
  }

  const colStats = collectionContext(collection);
  if (colStats) {
    const coverage = Math.round((colStats.withPrice / colStats.total) * 100);
    parts.push(`\n### Collection de l'utilisateur :`);
    parts.push(`- Total : ${colStats.total} cartes | Avec prix : ${colStats.withPrice} (${coverage}%)`);
    parts.push(`- Valeur estimée : ${fmtPrice(colStats.totalValue)}`);
    if (colStats.top5.length) parts.push(`- Top 5 valeur : ${colStats.top5.map(c => `${c.name} (${fmtPrice(c.price)})`).join(', ')}`);
    if (colStats.trending.length) parts.push(`- En hausse : ${colStats.trending.map(c => `${c.name} +${c.trend7}% (confiance ${c.confidence}%)`).join(', ')}`);
  }

  return parts.length > 0
    ? `\n\n---\n## Données CardScout disponibles :\n${parts.join('\n')}\n---`
    : '';
}

function cleanReply(text) {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/\*\*Note\s*:.*?\*\*/gi, '')
    .replace(/^\s*\(Note[^)]*\)\s*/i, '')
    .replace(/^\s*\([^)]{0,120}\)\s*\n/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseReply(raw) {
  const cleaned = cleanReply(raw);
  const jsonMatch = cleaned.match(/\{"suggestions":\s*\[.*?\]\s*\}/s);
  let suggestions = [];
  let reply = cleaned;
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      suggestions = parsed.suggestions || [];
      reply = cleaned.slice(0, jsonMatch.index).trim();
    } catch { }
  }
  return { reply, suggestions: suggestions.slice(0, 3) };
}

// ─── SCAN PROMPT ─────────────────────────────────────────────────────────────

const SCAN_PROMPT = `Tu es un expert en identification de cartes TCG (Pokémon, Yu-Gi-Oh!, Magic, One Piece, Lorcana, Dragon Ball Super).

Quand tu reçois une image de carte, tu identifies avec précision :
- Le nom exact de la carte (en anglais si possible, sinon dans la langue d'origine)
- Le set/extension
- Le numéro de carte
- La rareté

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour :
{"name":"<nom exact>","set":"<nom du set>","number":"<numéro>","rarity":"<rareté>","query":"<terme de recherche optimal pour trouver la carte>"}

Le champ "query" doit être le meilleur terme de recherche court pour retrouver la carte (nom + numéro si pertinent).
Si tu ne peux pas identifier la carte, réponds : {"name":"","set":"","number":"","rarity":"","query":"","error":"Carte non identifiée"}`;

// ─── SCAN ENDPOINT ────────────────────────────────────────────────────────────

export async function scanCard(req, res) {
  const { image } = req.body || {};
  if (!image?.base64 || !image?.mediaType?.startsWith('image/')) {
    return res.status(400).json({ error: 'Image manquante ou invalide' });
  }
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'Clé API Groq manquante (GROQ_API_KEY)' });
  }
  try {
    const messages = [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${image.mediaType};base64,${image.base64}` } },
        { type: 'text', text: 'Identifie cette carte TCG.' }
      ]
    }];
    const text = await groqCall(SCAN_PROMPT, messages, 256);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ error: 'Réponse IA non parseable', raw: text });
    res.json(JSON.parse(jsonMatch[0]));
  } catch (e) {
    console.error('Scan erreur:', e.message);
    res.status(500).json({ error: e.message });
  }
}

// ─── CHAT ENDPOINT ────────────────────────────────────────────────────────────

export async function chatMessage(req, res) {
  const { message = '', collection = [], image = null, history = [], _rawContent = null } = req.body || {};
  const trimmed = message.trim();
  if (!trimmed && !image && !_rawContent) return res.json({ reply: 'Message vide.', suggestions: [] });

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ reply: 'Clé API Groq manquante. Ajoute GROQ_API_KEY dans le fichier .env', suggestions: [] });
  }

  try {
    const context = buildContext(trimmed, collection);
    const textContent = (trimmed || 'Analyse cette carte TCG.') + context;

    const pastMessages = (Array.isArray(history) ? history : [])
      .filter(h => h.role && h.content)
      .map(h => ({ role: h.role, content: h.content }));

    let userContent;
    if (_rawContent && Array.isArray(_rawContent)) {
      userContent = toGroqContent(_rawContent);
      if (Array.isArray(userContent)) {
        const lastTextIdx = [...userContent].map((p, i) => p.type === 'text' ? i : -1).filter(i => i >= 0).pop();
        if (lastTextIdx !== undefined) userContent[lastTextIdx].text += context;
        else userContent.push({ type: 'text', text: context });
      } else {
        userContent += context;
      }
    } else if (image?.base64) {
      userContent = [
        { type: 'image_url', image_url: { url: `data:${image.mediaType};base64,${image.base64}` } },
        { type: 'text', text: textContent }
      ];
    } else {
      userContent = textContent;
    }

    const messages = [...pastMessages, { role: 'user', content: userContent }];
    const rawText = await groqCall(SYSTEM_PROMPT, messages);
    const { reply, suggestions } = parseReply(rawText);
    res.json({ reply, suggestions });
  } catch (e) {
    console.error('ChatIA erreur:', e.message);
    res.status(500).json({ reply: 'Une erreur est survenue : ' + e.message, suggestions: [] });
  }
}
