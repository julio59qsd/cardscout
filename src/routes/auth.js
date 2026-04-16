import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const USERS_FILE = join(__dirname, '../../data/users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'cardscout_secret_2024';

function loadUsers() {
  try { return JSON.parse(readFileSync(USERS_FILE, 'utf8')); }
  catch { return []; }
}
function saveUsers(users) {
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export async function register(req, res) {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Email invalide' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Mot de passe trop court (6 caractères min.)' });

  const users = loadUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase()))
    return res.status(409).json({ error: 'Cet email est déjà utilisé' });

  const hash = await bcrypt.hash(password, 10);
  const user = { id: Date.now().toString(), email: email.toLowerCase(), name: name || email.split('@')[0], hash, createdAt: new Date().toISOString() };
  users.push(user);
  saveUsers(users);

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

  const users = loadUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

  const ok = await bcrypt.compare(password, user.hash);
  if (!ok) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
}

export async function googleAuth(req, res) {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: 'Token Google manquant' });
  try {
    const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!r.ok) return res.status(401).json({ error: 'Token Google invalide' });
    const info = await r.json();
    if (!info.email) return res.status(401).json({ error: 'Email Google introuvable' });

    const users = loadUsers();
    let user = users.find(u => u.email.toLowerCase() === info.email.toLowerCase());
    if (!user) {
      user = { id: Date.now().toString(), email: info.email.toLowerCase(), name: info.name || info.email.split('@')[0], provider: 'google', createdAt: new Date().toISOString() };
      users.push(user);
      saveUsers(users);
    }
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e) {
    res.status(500).json({ error: 'Erreur vérification Google' });
  }
}

export async function appleAuth(req, res) {
  const { id_token, user: appleUser } = req.body;
  if (!id_token) return res.status(400).json({ error: 'Token Apple manquant' });
  try {
    // Décode le JWT Apple sans vérification de signature (ok pour MVP)
    const payload = JSON.parse(Buffer.from(id_token.split('.')[1], 'base64url').toString());
    const email = payload.email || appleUser?.email;
    if (!email) return res.status(401).json({ error: 'Email Apple introuvable' });

    const users = loadUsers();
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      const name = appleUser?.name ? `${appleUser.name.firstName||''} ${appleUser.name.lastName||''}`.trim() : email.split('@')[0];
      user = { id: Date.now().toString(), email: email.toLowerCase(), name, provider: 'apple', createdAt: new Date().toISOString() };
      users.push(user);
      saveUsers(users);
    }
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e) {
    res.status(500).json({ error: 'Erreur vérification Apple' });
  }
}

export function me(req, res) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Non authentifié' });
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    res.json({ id: payload.id, email: payload.email, name: payload.name });
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
}
