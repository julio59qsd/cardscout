/**
 * Alertes prix — wishlist avec seuils.
 * L'utilisateur ajoute une carte (par cardId ou par nom), définit un seuil et une direction (lt/gt).
 * Un cron vérifie toutes les 6h via priceById/priceByName et marque l'alerte "fired" si déclenchée.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { priceById, priceByName } from './priceAgent.js';
import { getPokecardexCardPrice } from '../lib/pokecardexLocal.js';
import { sendAlertEmail } from '../lib/email.js';
import { getUserPlan } from './auth.js';
const FREE_ALERT_LIMIT = 3;

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORE_FILE = join(__dirname, '../../data/alerts.json');
const USERS_FILE = join(__dirname, '../../data/users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'cardscout-secret-change-me';
const CHECK_INTERVAL = 1000 * 60 * 60 * 6; // 6h

function getUserEmail(userId) {
  if (!existsSync(USERS_FILE)) return null;
  try {
    const users = JSON.parse(readFileSync(USERS_FILE, 'utf8'));
    return users.find(u => u?.id === userId)?.email || null;
  } catch { return null; }
}

// Map userId → [{ id, cardId?, cardName, threshold, dir, plat, createdAt, fired, firedAt, firedPrice, currentPrice, lastChecked }]
let _alerts = {};

function loadStore() {
  if (!existsSync(STORE_FILE)) { _alerts = {}; return; }
  try { _alerts = JSON.parse(readFileSync(STORE_FILE, 'utf8')) || {}; }
  catch { _alerts = {}; }
}
function saveStore() {
  try { writeFileSync(STORE_FILE, JSON.stringify(_alerts, null, 2)); }
  catch (e) { console.error('🔔 Alerts: erreur sauvegarde', e.message); }
}

function requireAuth(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.slice(7), JWT_SECRET); } catch { return null; }
}
function uid(payload) { return payload.userId || payload.id || payload.sub; }

const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

function lookupPrice(alert) {
  if (alert.cardId) {
    const v = priceById.get(alert.cardId);
    if (v > 0) return v;
    const p = getPokecardexCardPrice(alert.cardId);
    if (p > 0) return p;
  }
  if (alert.cardName) {
    const k = norm(alert.cardName);
    const v = priceByName.get(k);
    if (v > 0) return v;
  }
  return 0;
}

function evaluateAlert(alert, userId = null) {
  const price = lookupPrice(alert);
  alert.currentPrice = price;
  alert.lastChecked = Date.now();
  let justFired = false;
  if (price > 0) {
    const wasUnder = alert.dir === 'lt' && price <= alert.threshold;
    const wasOver = alert.dir === 'gt' && price >= alert.threshold;
    if ((wasUnder || wasOver) && !alert.fired) {
      alert.fired = true;
      alert.firedAt = Date.now();
      alert.firedPrice = price;
      justFired = true;
    }
  }
  // Envoi d'email uniquement à la transition false→true, et uniquement depuis le cron (userId fourni)
  if (justFired && userId && !alert.emailSentAt) {
    const email = getUserEmail(userId);
    if (email) {
      sendAlertEmail(email, alert).then(r => {
        if (r?.ok) {
          alert.emailSentAt = Date.now();
          saveStore();
          console.log(`📧 Alerte envoyée à ${email} : ${alert.cardName} (${alert.dir} ${alert.threshold}€, prix=${price}€)`);
        }
      }).catch(e => console.error('📧 Erreur sendAlertEmail:', e.message));
    }
  }
  return alert;
}

export function checkAllAlerts() {
  let changed = 0;
  for (const [userId, userAlerts] of Object.entries(_alerts)) {
    for (const a of userAlerts) {
      const before = JSON.stringify(a);
      evaluateAlert(a, userId);
      if (JSON.stringify(a) !== before) changed++;
    }
  }
  if (changed > 0) saveStore();
  return changed;
}

export function startAlertsChecker() {
  loadStore();
  // Premier check 60s après le boot (laisse Vinicius charger)
  setTimeout(() => {
    const n = checkAllAlerts();
    if (n > 0) console.log(`🔔 Alertes : ${n} alerte${n > 1 ? 's' : ''} mise${n > 1 ? 's' : ''} à jour`);
  }, 60 * 1000);
  setInterval(() => {
    const n = checkAllAlerts();
    if (n > 0) console.log(`🔔 Alertes : check 6h — ${n} maj`);
  }, CHECK_INTERVAL);
}

// GET /api/alerts
export function listAlerts(req, res) {
  const payload = requireAuth(req);
  if (!payload) return res.status(401).json({ error: 'Non authentifié' });
  const userId = uid(payload);
  const list = _alerts[userId] || [];
  // Re-évalue à chaque liste pour avoir le prix actuel à jour
  // (passe userId pour déclencher l'email si transition juste détectée et pas encore envoyé)
  list.forEach(a => evaluateAlert(a, userId));
  res.json({ alerts: list });
}

// POST /api/alerts  body: { cardId?, cardName, threshold, dir: 'lt'|'gt', plat? }
export function createAlertRoute(req, res) {
  const payload = requireAuth(req);
  if (!payload) return res.status(401).json({ error: 'Non authentifié' });
  const userId = uid(payload);
  const { cardId, cardName, threshold, dir, plat } = req.body || {};
  if (!cardName || !threshold || !['lt', 'gt'].includes(dir)) {
    return res.status(400).json({ error: 'Champs invalides' });
  }
  // Restriction : Free → max 3 alertes
  const planInfo = getUserPlan(req);
  const existing = (_alerts[userId] || []).length;
  if (!planInfo?.isPremium && existing >= FREE_ALERT_LIMIT) {
    return res.status(403).json({
      error: `Limite atteinte : ${FREE_ALERT_LIMIT} alertes max en Free. Passe Premium ou Ultra pour en créer plus.`,
      requiresPlan: 'premium',
      limit: FREE_ALERT_LIMIT,
    });
  }
  const alert = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    cardId: cardId || null,
    cardName,
    threshold: Number(threshold),
    dir,
    plat: plat || 'cardmarket',
    createdAt: Date.now(),
    fired: false,
    currentPrice: 0,
  };
  evaluateAlert(alert);
  _alerts[userId] = _alerts[userId] || [];
  _alerts[userId].push(alert);
  saveStore();
  res.json({ alert });
}

// DELETE /api/alerts/:id
export function deleteAlertRoute(req, res) {
  const payload = requireAuth(req);
  if (!payload) return res.status(401).json({ error: 'Non authentifié' });
  const userId = uid(payload);
  const list = _alerts[userId] || [];
  const idx = list.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Alerte introuvable' });
  list.splice(idx, 1);
  saveStore();
  res.json({ ok: true });
}

// POST /api/alerts/:id/dismiss — marque l'alerte comme vue après firing
export function dismissAlertRoute(req, res) {
  const payload = requireAuth(req);
  if (!payload) return res.status(401).json({ error: 'Non authentifié' });
  const userId = uid(payload);
  const list = _alerts[userId] || [];
  const a = list.find(x => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Alerte introuvable' });
  a.fired = false;
  a.firedAt = null;
  a.firedPrice = null;
  a.emailSentAt = null; // permet le renvoi d'email lors du prochain firing
  saveStore();
  res.json({ ok: true, alert: a });
}
