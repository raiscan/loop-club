import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { TUTORIAL_RECORDINGS } from '../tutorial-voice.js';
import { TUTORIAL_NARRATIONS } from '../tutorial.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'dist');
const assets = ['index.html', 'style.css', 'app.js', 'model.js', 'audio.js', 'gamepad.js', 'tutorial.js', 'tutorial-voice.js', 'icon.svg'];
const clips = TUTORIAL_NARRATIONS.map(step => {
  const clip = TUTORIAL_RECORDINGS[step.audio];
  const expected = `./assets/tutorial-voice/${step.audio}.mp3`;
  if (clip?.text !== (step.spoken || `${step.title} ${step.copy}`) || clip.src.split('?')[0] !== expected) {
    throw new Error(`Missing or outdated voice clip: ${step.audio}`);
  }
  const relative = expected.slice(2);
  if (statSync(join(root, relative)).size < 1000) throw new Error(`Invalid voice clip: ${step.audio}`);
  return relative;
});

// Keep the published bundle limited to the instrument, without repo or test data.
for (const name of [...assets, ...clips]) readFileSync(join(root, name));
if (existsSync(output)) {
  const unknown = readdirSync(output).filter(name => !assets.includes(name) && name !== 'assets');
  if (unknown.length) throw new Error(`Preserving unexpected files in dist: ${unknown.join(', ')}`);
  if (existsSync(join(output, 'assets'))) {
    if (readdirSync(join(output, 'assets')).some(name => name !== 'tutorial-voice')) throw new Error('Preserving unexpected dist assets.');
    const folder = join(output, 'assets/tutorial-voice');
    if (existsSync(folder) && readdirSync(folder).some(name => !clips.includes(`assets/tutorial-voice/${name}`))) throw new Error('Preserving unexpected voice assets.');
  }
}
mkdirSync(join(output, 'assets/tutorial-voice'), { recursive: true });
for (const name of [...assets, ...clips]) copyFileSync(join(root, name), join(output, name));
console.log(`Prepared ${assets.length} app assets and ${clips.length} voice clips in dist/`);
