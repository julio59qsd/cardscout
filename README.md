# 🃏 CardScout

Estimateur de prix de cartes TCG — Pokémon, One Piece, Yu-Gi-Oh!, Magic, Lorcana, Dragon Ball Super.

## 🚀 Installation & lancement

### Prérequis
- Node.js 18+ installé → https://nodejs.org

### 1. Installer les dépendances
```bash
cd cardscout
npm install
```

### 2. Lancer le serveur
```bash
# Mode production
npm start

# Mode développement (redémarre automatiquement)
npm run dev
```

### 3. Ouvrir dans le navigateur
```
http://localhost:3000
```

---

## 🔑 Clé API Pokémon (optionnelle mais recommandée)

L'app fonctionne sans clé, mais avec une clé gratuite tu passes de 1 000 à illimité requêtes/jour.

1. Crée un compte sur https://dev.pokemontcg.io
2. Copie ta clé API
3. Lance avec la clé :
```bash
POKEMON_API_KEY=ta_cle_ici node server.js
```

Ou crée un fichier `.env` :
```
POKEMON_API_KEY=ta_cle_ici
PORT=3000
```

---

## 📁 Structure du projet

```
cardscout/
├── server.js              ← Serveur Express principal
├── package.json
├── public/
│   └── index.html         ← Frontend complet (HTML/CSS/JS)
└── src/
    ├── routes/
    │   ├── pokemon.js     ← API api.pokemontcg.io
    │   ├── yugioh.js      ← API db.ygoprodeck.com
    │   └── local.js       ← Données locales (One Piece, MTG, Lorcana, DBS)
    └── lib/
        └── localData.js   ← Base de données cartes & sets
```

---

## 🌐 APIs utilisées

| Univers | Source | Gratuit |
|---------|--------|---------|
| Pokémon | api.pokemontcg.io | ✅ (clé optionnelle) |
| Yu-Gi-Oh! | db.ygoprodeck.com | ✅ sans clé |
| One Piece | Base locale CardScout | ✅ |
| Magic: TG | Base locale CardScout | ✅ |
| Lorcana | Base locale CardScout | ✅ |
| Dragon Ball | Base locale CardScout | ✅ |

---

## 🚢 Déploiement en ligne (gratuit)

### Railway (recommandé)
```bash
# Installer Railway CLI
npm install -g @railway/cli

# Se connecter
railway login

# Déployer
railway up
```

### Render
1. Push ton code sur GitHub
2. Crée un compte sur render.com
3. "New Web Service" → connecte ton repo
4. Build command : `npm install`
5. Start command : `npm start`

---

## ✨ Fonctionnalités

- 🔍 Recherche live Pokémon & Yu-Gi-Oh! via API
- 🎴 Illustrations de cartes générées dynamiquement (Canvas 2D)
- 💰 Prix Cardmarket (EUR) + TCGPlayer (USD) en temps réel
- 📊 Historique 6 mois / 1 an
- 🏆 Score de côte IA
- 📦 Produits scellés avec analyse d'investissement
- 🗂️ Gestion de collection personnelle
- 🔔 Alertes de prix
- 📱 Design responsive mobile-first

---

## 🛣️ Prochaines étapes

- [ ] Brancher CSV Cardmarket pour One Piece & MTG en temps réel
- [ ] Ajouter l'authentification utilisateur (Supabase)
- [ ] Implémenter le scanner IA (photo → identification)
- [ ] Intégrer Stripe pour les abonnements Pro
- [ ] App React Native (iOS + Android)

---

## 📝 Licence

MIT — fait avec ❤️ et CardScout
