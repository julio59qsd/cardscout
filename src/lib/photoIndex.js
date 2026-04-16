import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const photosDir = join(__dirname, '../../../photos');

export const localPhotos = new Map();

try {
  for (const file of readdirSync(photosDir)) {
    if (!/\.(png|webp)$/i.test(file)) continue;
    const cardId = file.replace(/_.*/, '');
    // WebP prioritaire sur PNG si les deux existent
    if (!localPhotos.has(cardId) || file.endsWith('.webp')) {
      localPhotos.set(cardId, file);
    }
  }
  console.log(`📸 ${localPhotos.size} photos locales indexées`);
} catch {}
