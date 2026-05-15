import { readFileSync } from 'fs';
const js = readFileSync('pcx-js.js', 'utf8');

// Find function that builds sets URLs
const idx = js.indexOf('`${ku}/sets/');
console.log('ctx:', js.substring(Math.max(0, idx - 600), idx + 300));
