import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseTutorialVoice, TutorialSpeech, tutorialPicture, TUTORIAL_STEPS, TUTORIAL_NARRATIONS, spotlightPath } from '../tutorial.js';
import { createSong, editSong } from '../model.js';
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
  assert.equal(Object.keys(TUTORIAL_RECORDINGS).length, TUTORIAL_NARRATIONS.length);
  for (const step of TUTORIAL_NARRATIONS) {
    const clip = TUTORIAL_RECORDINGS[step.audio], info = metadata.clips[step.audio];
    assert.equal(clip.text, step.spoken || `${step.title} ${step.copy}`);
    const bytes = readFileSync(new URL('../' + clip.src.split('?')[0], import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), info.sha256);
    assert.ok(info.seconds > 0.5 && info.seconds < 25);
    assert.match(clip.src, new RegExp(info.sha256.slice(0, 12)));
  }
});

test('voice selection prefers Scottish voices, then British female or another usable voice', () => {
  const us = { name: 'Google US English', lang: 'en-US', default: true };
  const male = { name: 'Google UK English Male', lang: 'en-GB' };
  const female = { name: 'Google UK English Female', lang: 'en-GB' };
  const scottish = { name: 'Scottish Female', lang: 'en-GB-scotland' };
  assert.equal(chooseTutorialVoice([us, male, female, scottish]), scottish);
  assert.equal(chooseTutorialVoice([us, male, female]), female);
  assert.equal(chooseTutorialVoice([us, male]), male);
  assert.equal(chooseTutorialVoice([us]), us);
  assert.equal(chooseTutorialVoice([]), null);
});

test('spotlight keeps the viewport shaded with a rounded opening around the real target', () => {
  const full = spotlightPath(null, 800, 600);
  assert.equal(full, 'M0 0H800V600H0Z');
  const path = spotlightPath({ left: 200, top: 100, right: 300, bottom: 150, width: 100, height: 50 }, 800, 600);
  assert.ok(path.startsWith(full)); assert.match(path, /M205 93H295Q307 93/);
  assert.equal(spotlightPath({ width: 0, height: 0 }, 800, 600), full);
  for (const step of TUTORIAL_STEPS.filter(step => step.action === 'playing')) {
    assert.ok(step.copy.includes("Let's play"));
    assert.ok(step.spoken.includes("Let's play button"));
  }
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
  const loop = tutorialPicture('loop', song, 3);
  assert.equal((loop.match(/<rect /g) || []).length, 4);
  assert.match(loop, /stroke-width="3"/);
  const chord = tutorialPicture('chord', song);
  assert.equal((chord.match(/fill="#91b943"/g) || []).length, song.melody.reduce((sum, notes) => sum + notes.length, 0));
  const bright = tutorialPicture('wave', { ...song, sound: { ...song.sound, brightness: 100 } });
  assert.notEqual(bright, tutorialPicture('wave', song));
  assert.equal(TUTORIAL_STEPS.filter(step => step.note).length, 2);
  assert.ok(TUTORIAL_STEPS.at(-1).done);
});

test('lesson tracks start empty without changing the saved song', async () => {
  const { blankTutorialSong } = await import('../tutorial.js');
  const original = createSong('liquid'), before = structuredClone(original);
  const lesson = blankTutorialSong(original);
  assert.ok(lesson.drums.every(row => row.every(hit => hit === false)));
  assert.ok(lesson.melody.every(notes => notes.length === 0));
  assert.equal(lesson.tempo, 120);
  lesson.drums[0][0] = true; lesson.melody[0].push(0, 2);
  assert.deepEqual(original, before);
});

test('musical lesson playback isolates the edited instrument and preserves chord notes', async () => {
  const { tutorialPlaybackSong } = await import('../tutorial.js');
  const original = createSong('liquid'), before = structuredClone(original);
  const beat = tutorialPlaybackSong(original, 'beat');
  assert.deepEqual(beat.drums[0], original.drums[0]);
  assert.ok(beat.drums.slice(1).every(row => row.every(hit => !hit)));
  assert.ok(beat.melody.every(notes => notes.length === 0));
  for (const kind of ['note', 'chord', 'slide']) {
    const solo = tutorialPlaybackSong(original, kind);
    assert.ok(solo.drums.every(row => row.every(hit => !hit)));
    assert.deepEqual(solo.melody, original.melody);
    assert.deepEqual(solo.sound, original.sound);
  }
  assert.deepEqual(original, before);
});

test('keeping a tutorial song repeats the learned phrase across the full loop', async () => {
  const { finishTutorialSong, blankTutorialSong } = await import('../tutorial.js');
  const lesson = blankTutorialSong(editSong(createSong(), { type: 'bars', value: 4 }));
  lesson.drums[0][0] = true; lesson.melody[0] = [0, 1];
  const result = finishTutorialSong(lesson);
  for (const step of [0, 4, 8, 12]) {
    assert.equal(result.drums[0][step], true);
    assert.deepEqual(result.melody[step], [0, 1]);
  }
  result.melody[4].push(3);
  assert.deepEqual(lesson.melody[0], [0, 1]);
  assert.deepEqual(result.melody[8], [0, 1]);
});

test('player names are opt-in and named greetings never leak into the default tour', async () => {
  const { tutorialPlayer, tutorialStepsFor } = await import('../tutorial.js');
  assert.equal(tutorialPlayer(''), null);
  assert.equal(tutorialPlayer('?marcie=no&name=Zach'), null);
  assert.equal(tutorialPlayer('?theme=space&zach=yes'), 'zach');
  assert.equal(tutorialPlayer('?theme=space&marcie=yes'), 'marcie');
  assert.equal(tutorialPlayer('?zach=yes&marcie=yes'), 'zach');
  for (const [mode,name] of [[null,null],['zach','Zach'],['marcie','Marcie']]) {
    const steps = tutorialStepsFor(mode);
    const text = JSON.stringify(steps);
    if (name) {
      assert.match(steps[0].title,new RegExp(name));
      assert.match(steps.at(-1).copy,new RegExp(name));
      assert.equal(steps[0].audio, `hello-${mode}`);
      assert.equal(steps.at(-1).audio, `done-${mode}`);
    } else assert.doesNotMatch(text,/Zach|Marcie/);
    assert.equal(steps.length,TUTORIAL_STEPS.length);
  }
});
