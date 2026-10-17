import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseTutorialVoice, TutorialSpeech, tutorialPicture, TUTORIAL_STEPS } from '../tutorial.js';
import { createSong } from '../model.js';
import { TUTORIAL_RECORDINGS } from '../tutorial-voice.js';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

class Clip {
  constructor(src) { this.src = src; Clip.instances.push(this); }
  play() { return Promise.resolve(); }
  pause() { this.paused = true; }
  removeAttribute() { this.src = ''; }
  load() {}
  static instances = [];
}

test('bundled speech works without device voices, respects volume and stops stale clips', () => {
  const duck = []; let volume = 0.4;
  const recordings = { first: { text: 'First', src: './assets/tutorial-voice/hello.mp3' } };
  const speech = new TutorialSpeech({ synth: null, Utterance: null, Audio: Clip, recordings, volume: () => volume, duck: value => duck.push(value) });
  assert.equal(speech.available, true);
  speech.say('First', false, 'first'); const first = speech.clip, stale = first.onplaying;
  first.onplaying(); assert.equal(duck.at(-1), true); assert.equal(first.volume, 0.4);
  volume = 0.2; speech.updateVolume(); assert.equal(first.volume, 0.2);
  speech.say('First', false, 'first');
  assert.equal(first.paused, true); assert.equal(first.src, '');
  stale(); assert.equal(duck.at(-1), false, 'cancelled playback cannot duck the next prompt');
  speech.clip.onplaying(); speech.clip.onended();
  assert.equal(speech.clip, null); assert.equal(duck.at(-1), false);
  speech.enabled = false; speech.say('First', false, 'first'); assert.equal(speech.clip, null);
  speech.say('First', true, 'first'); assert.ok(speech.clip); speech.stop();
});

test('a failed recording falls back once; cancellation prevents a late fallback', async () => {
  const spoken = [];
  let rejectPlay;
  class PendingClip extends Clip { play() { return new Promise((_, reject) => { rejectPlay = reject; }); } }
  const synth = { cancel() {}, getVoices() { return []; }, speak(words) { spoken.push(words.text); } };
  const speech = new TutorialSpeech({ synth, Utterance: class { constructor(text) { this.text = text; } }, Audio: PendingClip,
    recordings: { test: { text: 'Test', src: './missing.mp3' } } });
  speech.say('Test', false, 'test'); const fail = speech.clip.onerror;
  fail(); rejectPlay(new Error('Failed to load')); await Promise.resolve();
  assert.deepEqual(spoken, ['Test']);
  speech.say('Test', false, 'test'); speech.stop(); rejectPlay(new Error('Aborted')); await Promise.resolve();
  assert.deepEqual(spoken, ['Test']); speech.stop();
});

test('outdated recordings never read a different task aloud', () => {
  const spoken = [];
  const speech = new TutorialSpeech({ Audio: Clip, recordings: { test: { text: 'Old task', src: './old.mp3' } },
    synth: { cancel() {}, getVoices() { return []; }, speak(words) { spoken.push(words.text); } }, Utterance: class { constructor(text) { this.text = text; } } });
  speech.say('New task', false, 'test');
  assert.equal(speech.clip, null); assert.deepEqual(spoken, ['New task']); speech.stop();
});

test('all tutorial prompts have matching, intact bundled MP3 recordings', () => {
  const metadata = JSON.parse(readFileSync(new URL('../assets/tutorial-voice/generation.json', import.meta.url)));
  assert.equal(Object.keys(TUTORIAL_RECORDINGS).length, TUTORIAL_STEPS.length);
  for (const step of TUTORIAL_STEPS) {
    const clip = TUTORIAL_RECORDINGS[step.audio], info = metadata.clips[step.audio];
    assert.equal(clip.text, step.spoken || `${step.title} ${step.copy}`);
    const bytes = readFileSync(new URL('../' + clip.src.split('?')[0], import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), info.sha256);
    assert.ok(info.seconds > 0.5 && info.seconds < 25);
    assert.match(clip.src, new RegExp(info.sha256.slice(0, 12)));
  }
});

test('voice selection prefers British female voices, then British or another usable voice', () => {
  const us = { name: 'Google US English', lang: 'en-US', default: true };
  const male = { name: 'Google UK English Male', lang: 'en-GB' };
  const female = { name: 'Google UK English Female', lang: 'en-GB' };
  assert.equal(chooseTutorialVoice([us, male, female]), female);
  assert.equal(chooseTutorialVoice([us, male]), male);
  assert.equal(chooseTutorialVoice([us]), us);
  assert.equal(chooseTutorialVoice([]), null);
});

test('spoken prompts replace prior speech, respect mute and volume, and release music ducking', () => {
  let cancellations = 0;
  const words = [], duck = [];
  const synth = { cancel() { cancellations++; }, getVoices() { return []; }, speak(value) { words.push(value); } };
  const speech = new TutorialSpeech({ synth, Utterance: class { constructor(text) { this.text = text; } }, volume: () => 0.25, duck: value => duck.push(value) });
  speech.say('Hi Zach!'); words[0].onstart();
  assert.equal(duck.at(-1), true);
  assert.equal(words[0].lang, 'en-GB'); assert.equal(words[0].volume, 0.25);
  speech.say('Tap Play.'); words[1].onstart(); words[0].onend();
  assert.equal(duck.at(-1), true, 'a stale voice callback cannot unduck the next prompt');
  words[1].onerror(); assert.equal(duck.at(-1), false);
  speech.enabled = false; speech.say('No speech'); assert.equal(words.length, 2);
  speech.say('Read just this one.', true); assert.equal(words.length, 3);
  assert.equal(speech.enabled, false, 'Say it does not enable automatic speech');
  speech.stop(); assert.ok(cancellations >= 3); assert.equal(duck.at(-1), false);
});

test('speech failures and missing device APIs leave visual guidance usable', () => {
  const speech = new TutorialSpeech({ synth: null, Utterance: null });
  assert.equal(speech.available, false); assert.doesNotThrow(() => speech.say('Hi!'));
  const broken = new TutorialSpeech({ synth: { cancel() {}, getVoices() { throw new Error('No voices'); } }, Utterance: class {} });
  assert.doesNotThrow(() => broken.say('Hi!')); broken.stop();
});

test('tutorial pictures show the actual beat, chord notes and sound settings', () => {
  const song = createSong('cloud');
  const loop = tutorialPicture('loop', song, 15);
  assert.equal((loop.match(/<rect /g) || []).length, 16);
  assert.match(loop, /stroke-width="3"/);
  const chord = tutorialPicture('chord', song);
  assert.equal((chord.match(/fill="#91b943"/g) || []).length, 3);
  const bright = tutorialPicture('wave', { ...song, sound: { ...song.sound, brightness: 100 } });
  assert.notEqual(bright, tutorialPicture('wave', song));
  assert.equal(TUTORIAL_STEPS.filter(step => step.note).length, 2);
  assert.ok(TUTORIAL_STEPS.at(-1).done);
});
