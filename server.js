import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { register, login, me, googleAuth, appleAuth } from './src/routes/auth.js';
import { searchPokemon, getPokemonSets } from './src/routes/pokemon.js';
import { searchYGO, getYGOSets } from './src/routes/yugioh.js';
import { getLocalCards, getLocalSets, getSealed } from './src/routes/local.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const photosDir = join(__dirname, '../photos');

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));
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

// ─── POKEMON ROUTES ───────────────────────────────────────────────
app.get('/api/pokemon/search', searchPokemon);
app.get('/api/pokemon/sets', getPokemonSets);

// ─── YU-GI-OH ROUTES ─────────────────────────────────────────────
app.get('/api/yugioh/search', searchYGO);
app.get('/api/yugioh/sets', getYGOSets);

// ─── LOCAL DATA ROUTES ────────────────────────────────────────────
app.get('/api/local/cards', getLocalCards);
app.get('/api/local/sets', getLocalSets);
app.get('/api/sealed', getSealed);

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
  console.log(`   Pokémon API  : api.pokemontcg.io ✓`);
  console.log(`   Yu-Gi-Oh API : db.ygoprodeck.com ✓`);
  console.log(`   Autres univers : base locale ✓\n`);
});
