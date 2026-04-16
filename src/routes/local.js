import { CARDS, SETS, SEALED } from '../lib/localData.js';

export function getLocalCards(req, res) {
  const { q = '', universe = 'onepiece', rarity = '' } = req.query;
  const filtered = CARDS.filter(c =>
    c.universe === universe &&
    (!q || c.name.toLowerCase().includes(q.toLowerCase()) ||
           c.set.toLowerCase().includes(q.toLowerCase())) &&
    (!rarity || c.rarity === rarity)
  );
  res.json({ cards: filtered, total: filtered.length, source: 'CardScout local' });
}

export function getLocalSets(req, res) {
  const { universe = '' } = req.query;
  const filtered = universe ? SETS.filter(s => s.universe === universe) : SETS;
  res.json({ sets: filtered, source: 'CardScout local' });
}

export function getSealed(req, res) {
  const { universe = '' } = req.query;
  const filtered = universe ? SEALED.filter(s => s.universe === universe) : SEALED;
  res.json({ sealed: filtered, source: 'CardScout local' });
}
