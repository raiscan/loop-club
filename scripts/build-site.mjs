import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'dist');
const assets = ['index.html', 'style.css', 'app.js', 'model.js', 'audio.js', 'gamepad.js', 'icon.svg'];

// Keep the published bundle limited to the instrument, without repo or test data.
for (const name of assets) readFileSync(join(root, name));
if (existsSync(output)) {
  const unknown = readdirSync(output).filter(name => !assets.includes(name));
  if (unknown.length) throw new Error(`Preserving unexpected files in dist: ${unknown.join(', ')}`);
}
mkdirSync(output, { recursive: true });
for (const name of assets) copyFileSync(join(root, name), join(output, name));
console.log(`Prepared ${assets.length} static assets in dist/`);
