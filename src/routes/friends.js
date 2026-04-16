import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

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

function requireAuth(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.slice(7), JWT_SECRET); } catch { return null; }
}

function genCode(users) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code, tries = 0;
  do {
    code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    tries++;
  } while (users.some(u => u.friendCode === code) && tries < 100);
  return code;
}

function ensureCode(user, users) {
  if (!user.friendCode) user.friendCode = genCode(users);
  return user.friendCode;
}

export function getMyCode(req, res) {
  const payload = requireAuth(req);
  if (!payload) return res.status(401).json({ error: 'Non authentifié' });
  const users = loadUsers();
  const user = users.find(u => u.id === payload.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  ensureCode(user, users);
  saveUsers(users);
  res.json({ code: user.friendCode });
}

export function addFriend(req, res) {
  const payload = requireAuth(req);
  if (!payload) return res.status(401).json({ error: 'Non authentifié' });
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code manquant' });

  const users = loadUsers();
  const me = users.find(u => u.id === payload.id);
  if (!me) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const friend = users.find(u => u.friendCode === code.toUpperCase().replace(/\s/g, ''));
  if (!friend) return res.status(404).json({ error: 'Aucun compte avec ce code' });
  if (friend.id === me.id) return res.status(400).json({ error: 'Tu ne peux pas t\'ajouter toi-même' });

  if (!me.friends) me.friends = [];
  if (me.friends.includes(friend.id)) return res.status(409).json({ error: 'Déjà ami avec cet utilisateur' });

  me.friends.push(friend.id);
  if (!friend.friends) friend.friends = [];
  if (!friend.friends.includes(me.id)) friend.friends.push(me.id);

  saveUsers(users);
  res.json({
    ok: true,
    friend: { id: friend.id, name: friend.name, code: friend.friendCode, collectionCount: (friend.collection || []).length }
  });
}

export function getFriends(req, res) {
  const payload = requireAuth(req);
  if (!payload) return res.status(401).json({ error: 'Non authentifié' });
  const users = loadUsers();
  const me = users.find(u => u.id === payload.id);
  if (!me) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const friends = (me.friends || []).map(fid => {
    const f = users.find(u => u.id === fid);
    if (!f) return null;
    return {
      id: f.id,
      name: f.name || f.email.split('@')[0],
      code: f.friendCode || '—',
      collectionCount: (f.collection || []).length
    };
  }).filter(Boolean);

  res.json({ friends });
}

export function removeFriend(req, res) {
  const payload = requireAuth(req);
  if (!payload) return res.status(401).json({ error: 'Non authentifié' });
  const users = loadUsers();
  const me = users.find(u => u.id === payload.id);
  if (!me) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const friendId = req.params.id;
  me.friends = (me.friends || []).filter(id => id !== friendId);
  const friend = users.find(u => u.id === friendId);
  if (friend) friend.friends = (friend.friends || []).filter(id => id !== me.id);

  saveUsers(users);
  res.json({ ok: true });
}

export function getFriendCollection(req, res) {
  const payload = requireAuth(req);
  if (!payload) return res.status(401).json({ error: 'Non authentifié' });
  const users = loadUsers();
  const me = users.find(u => u.id === payload.id);
  if (!me) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const friendId = req.params.id;
  if (!(me.friends || []).includes(friendId)) {
    return res.status(403).json({ error: 'Cet utilisateur n\'est pas dans ta liste d\'amis' });
  }

  const friend = users.find(u => u.id === friendId);
  if (!friend) return res.status(404).json({ error: 'Ami introuvable' });

  res.json({ collection: friend.collection || [], name: friend.name });
}

export function syncCollection(req, res) {
  const payload = requireAuth(req);
  if (!payload) return res.status(401).json({ error: 'Non authentifié' });
  const { collection } = req.body;
  if (!Array.isArray(collection)) return res.status(400).json({ error: 'Collection invalide' });

  const users = loadUsers();
  const user = users.find(u => u.id === payload.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  user.collection = collection;
  saveUsers(users);
  res.json({ ok: true, synced: collection.length });
}
