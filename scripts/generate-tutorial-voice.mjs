// One-time build tool. Requires Node 22+, ffmpeg, ffprobe and an authorized OpenRouter key.
// The deployed instrument never calls OpenRouter or reads a credential.
import { readFileSync, writeFileSync, mkdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { TUTORIAL_STEPS } from '../tutorial.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const folder = join(root, 'assets/tutorial-voice');
const model = 'google/gemini-3.1-flash-tts-preview';
const voice = 'Sulafat';
const instructions = 'You are a warm, friendly female guide with a clear standard British English accent. Speak gently and naturally to a five-year-old, with a smile in your voice. Use a relaxed, easy-to-follow pace and short pauses between sentences. Be encouraging without a baby voice. Pronounce Zach as Zak. Read only the supplied words, exactly as written. No extra introduction, music or sound effects.';
const key = readFileSync(join(homedir(), '.config/openrouter/api-key'), 'utf8').trim();
if (!key.startsWith('sk-or-')) throw new Error('A valid shared OpenRouter key is required.');
const only = process.argv[2];
if (only && !TUTORIAL_STEPS.some(step => step.audio === only)) throw new Error('Unknown tutorial clip.');
mkdirSync(folder, { recursive: true });
const metadataPath = join(folder, 'generation.json');
const metadata = existsSync(metadataPath) ? JSON.parse(readFileSync(metadataPath, 'utf8'))
  : { model, voice, instructions, clips: {} };
if (metadata.model !== model || metadata.voice !== voice || metadata.instructions !== instructions) {
  throw new Error('Existing voice settings differ; preserve those clips before making a new voice bank.');
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
for (const step of TUTORIAL_STEPS) {
  if (only && step.audio !== only) continue;
  const text = step.spoken || `${step.title} ${step.copy}`;
  const destination = join(folder, `${step.audio}.mp3`);
  const previous = metadata.clips[step.audio];
  if (previous && previous.text === text && existsSync(destination) && hash(readFileSync(destination)) === previous.sha256) continue;
  if (existsSync(destination)) throw new Error(`Preserving existing clip ${step.audio}; archive it before regenerating.`);
  console.log(`Generating ${step.audio}…`);
  const response = await fetch('https://openrouter.ai/api/v1/audio/speech', {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, voice, input: text, instructions, response_format: 'pcm' }),
    signal: AbortSignal.timeout(120000)
  });
  if (!response.ok) {
    const detail = (await response.text()).replaceAll(key, '[redacted]').slice(0, 500);
    throw new Error(`Speech generation HTTP ${response.status}: ${detail}`);
  }
  if (!response.headers.get('content-type')?.startsWith('audio/')) throw new Error('Expected audio from voice generation.');
  const temporary = mkdtempSync(join(tmpdir(), 'loop-club-voice-'));
  try {
    const input = join(temporary, 'source.pcm'), output = join(temporary, 'normalised.mp3');
    writeFileSync(input, new Uint8Array(await response.arrayBuffer()));
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', input, '-af', 'loudnorm=I=-19:TP=-3:LRA=7', '-ac', '1', '-ar', '24000', '-b:a', '64k', '-map_metadata', '-1', output]);
    const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', output], { encoding: 'utf8' }).trim());
    if (!(seconds > 0.5 && seconds < 25)) throw new Error('Voice clip duration is outside the expected range.');
    const bytes = readFileSync(output); writeFileSync(destination, bytes, { flag: 'wx' });
    metadata.clips[step.audio] = { text, seconds, sha256: hash(bytes), generation_id: response.headers.get('x-generation-id') };
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
    console.log(`Saved ${step.audio}: ${seconds.toFixed(2)} seconds, ${bytes.length} bytes`);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}
const recordings = Object.fromEntries(Object.entries(metadata.clips).map(([id, clip]) => [id, {
  text: clip.text, src: `./assets/tutorial-voice/${id}.mp3?v=${clip.sha256.slice(0, 12)}`
}]));
writeFileSync(join(root, 'tutorial-voice.js'), '// Generated voice clips. See assets/tutorial-voice/generation.json for provenance.\nexport const TUTORIAL_RECORDINGS = ' + JSON.stringify(recordings, null, 2) + ';\n');
