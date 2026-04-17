import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { register, login, me, googleAuth, appleAuth, changePassword, updateName, deleteAccount } from './src/routes/auth.js';
import { getMyCode, addFriend, getFriends, removeFriend, getFriendCollection, syncCollection } from './src/routes/friends.js';
import { searchPokemon, getPokemonSets, getTrending } from './src/routes/pokemon.js';
import { searchYGO, getYGOSets } from './src/routes/yugioh.js';
import { getLocalCards, getLocalSets, getSealed } from './src/routes/local.js';
import { getCardImg, searchFast, indexStatus } from './src/routes/cardIndex.js';
import { startVinicius, getCardPrice, getBatchPrices, pricesStatus } from './src/routes/priceAgent.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const photosDir = join(__dirname, '../photos');

app.set('etag', false);
app.use(compression());
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(express.static(join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) res.setHeader('Cache-Control', 'no-store');
  }
}));
app.use('/photos', express.static(photosDir, {
  maxAge: '7d',
  immutable: true,
  setHeaders: (res) => res.setHeader('Vary', 'Accept')
}));

// ─── AUTH ROUTES ──────────────────────────────────────────────────
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.get('/api/auth/me', me);
app.post('/api/auth/google', googleAuth);
app.post('/api/auth/apple', appleAuth);
app.put('/api/auth/password', changePassword);
app.put('/api/auth/name', updateName);
app.delete('/api/auth/account', deleteAccount);

// ─── FRIENDS ROUTES ───────────────────────────────────────────────
app.get('/api/friends/code', getMyCode);
app.post('/api/friends/add', addFriend);
app.get('/api/friends', getFriends);
app.delete('/api/friends/:id', removeFriend);
app.get('/api/friends/:id/collection', getFriendCollection);
app.post('/api/user/collection/sync', syncCollection);

// ─── POKEMON ROUTES ───────────────────────────────────────────────
app.get('/api/pokemon/search', searchPokemon);
app.get('/api/pokemon/sets', getPokemonSets);
app.get('/api/pokemon/trending', getTrending);

// ─── YU-GI-OH ROUTES ─────────────────────────────────────────────
app.get('/api/yugioh/search', searchYGO);
app.get('/api/yugioh/sets', getYGOSets);

// ─── LOCAL DATA ROUTES ────────────────────────────────────────────
app.get('/api/local/cards', getLocalCards);
app.get('/api/local/sets', getLocalSets);
app.get('/api/sealed', getSealed);

// ─── CARD INDEX (images + recherche rapide) ───────────────────────
app.get('/api/cards/img', getCardImg);
app.get('/api/cards/search-fast', searchFast);
app.get('/api/cards/status', indexStatus);

// ─── VINICIUS (prix temps réel) ──────────────────────────────────
app.get('/api/prices/card', getCardPrice);
app.post('/api/prices/batch', getBatchPrices);
app.get('/api/prices/status', pricesStatus);

// ─── UNIFIED SEARCH ──────────────────────────────────────────────
app.get('/api/search', async (req, res) => {
  const { q = '', universe = 'pokemon', rarity = '' } = req.query;
  try {
    if (universe === 'pokemon') {
      return searchPokemon(req, res);
    } else if (universe === 'yugioh') {
      return searchYGO(req, res);
    } else {
      return getLocalCards(req, res);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── SERVE FRONTEND ───────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🃏 CardScout lancé sur http://localhost:${PORT}`);
  fetch(`http://localhost:${PORT}/api/pokemon/trending`).catch(()=>{});
  console.log(`   Pokémon API  : api.pokemontcg.io ✓`);
  console.log(`   Yu-Gi-Oh API : db.ygoprodeck.com ✓`);
  console.log(`   Autres univers : base locale ✓\n`);
  // Lance Vinicius en arrière-plan
  startVinicius().catch(e => console.error('Vinicius erreur fatale:', e.message));
});
