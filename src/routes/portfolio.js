/**
 * Portfolio — snapshot quotidien de la valeur totale de la collection de chaque user.
 * Alimente le graphique d'évolution dans la page Collection (remplace les données fake).
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { priceById } from './priceAgent.js';
import { getPokecardexCardPrice } from '../lib/pokecardexLocal.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const USERS_FILE = join(__dirname, '../../data/users.json');
const HISTORY_FILE = join(__dirname, '../../data/portfolio-history.json');
const JWT_SECRET = process.env.JWT_SECRET || 'cardscout-secret-change-me';
const SNAPSHOT_INTERVAL = 1000 * 60 * 60 * 24; // 24h

// Map userId → [{ date: 'YYYY-MM-DD', total: number, cardCount: number }]
let _history = {};

function loadHistory() {
  if (!existsSync(HISTORY_FILE)) { _history = {}; return; }
  try { _history = JSON.parse(readFileSync(HISTORY_FILE, 'utf8')) || {}; }
  catch { _history = {}; }
}

function saveHistory() {
  try { writeFileSync(HISTORY_FILE, JSON.stringify(_history, null, 2)); }
  catch (e) { console.error('📊 Portfolio: erreur sauvegarde', e.message); }
}

function priceForCard(card) {
  // Vinicius (priceById) couvre les sets natifs pokemontcg.io
  const vp = priceById.get(card.id);
  if (vp > 0) return vp;
  // Pokécardex couvre les pcx_*
  const pp = getPokecardexCardPrice(card.id);
  if (pp > 0) return pp;
  // Fallback : prix embarqué dans la carte au moment de l'ajout (peut être périmé)
  const embed = card.prices?.cardmarket?.avg
             || card.prices?.cardmarket?.trend
             || card.p
             || 0;
  return embed > 0 ? embed : 0;
}

function totalForCollection(collection) {
  if (!Array.isArray(collection)) return { total: 0, cardCount: 0 };
  let total = 0;
  for (const c of collection) total += priceForCard(c);
  return { total: Math.round(total * 100) / 100, cardCount: collection.length };
}

function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export function snapshotAll() {
  if (!existsSync(USERS_FILE)) return 0;
  let users;
  try { users = JSON.parse(readFileSync(USERS_FILE, 'utf8')); }
  catch { return 0; }
  if (!Array.isArray(users)) return 0;

  const today = todayStr();
  let count = 0;
  for (const u of users) {
    if (!u?.id) continue;
    const { total, cardCount } = totalForCollection(u.collection || []);
    const userHist = _history[u.id] = _history[u.id] || [];
    // Si snapshot du jour existe déjà, on update (au cas où l'utilisateur a ajouté/enlevé)
    const existing = userHist.find(h => h.date === today);
    if (existing) {
      if (existing.total !== total || existing.cardCount !== cardCount) {
        existing.total = total;
        existing.cardCount = cardCount;
        count++;
      }
    } else {
      userHist.push({ date: today, total, cardCount });
      count++;
    }
    // On garde max 730 jours d'historique (2 ans)
    if (userHist.length > 730) userHist.splice(0, userHist.length - 730);
  }
  if (count > 0) saveHistory();
  return count;
}

export function startPortfolioSnapshot() {
  loadHistory();
  // Premier snapshot au démarrage (avec léger délai pour laisser Vinicius charger)
  setTimeout(() => {
    const n = snapshotAll();
    console.log(`📊 Portfolio : snapshot initial — ${n} entrée${n > 1 ? 's' : ''} mise${n > 1 ? 's' : ''} à jour`);
  }, 30 * 1000);
  // Puis toutes les 24h
  setInterval(() => {
    const n = snapshotAll();
    if (n > 0) console.log(`📊 Portfolio : snapshot quotidien — ${n} entrée${n > 1 ? 's' : ''}`);
  }, SNAPSHOT_INTERVAL);
}

function requireAuth(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.slice(7), JWT_SECRET); } catch { return null; }
}

// GET /api/portfolio/history?period=1m|3m|6m|1y|all
export function getPortfolioHistory(req, res) {
  const payload = requireAuth(req);
  if (!payload) return res.status(401).json({ error: 'Non authentifié' });
  const userId = payload.userId || payload.id || payload.sub;
  if (!userId) return res.status(400).json({ error: 'userId manquant' });

  // Snapshot live au moment de la requête (capture l'état actuel pour le point "aujourd'hui")
  snapshotAll();

  const all = _history[userId] || [];
  const period = String(req.query.period || '6m').toLowerCase();
  const days = period === '1m' ? 30 : period === '3m' ? 90 : period === '1y' ? 365 : period === 'all' ? 730 : 180;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const filtered = all.filter(h => h.date >= cutoff);
  res.json({ history: filtered, period, count: filtered.length });
}
