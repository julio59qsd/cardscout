import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const photosDir = join(__dirname, '../../../photos');

export const localPhotos = new Map();

try {
  for (const file of readdirSync(photosDir)) {
    const cardId = file.replace(/_.*/, '');
    localPhotos.set(cardId, file);
  }
  console.log(`📸 ${localPhotos.size} photos locales indexées`);
} catch {}
