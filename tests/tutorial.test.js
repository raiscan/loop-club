import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseTutorialVoice, TutorialSpeech, tutorialPicture, TUTORIAL_STEPS } from '../tutorial.js';
import { createSong } from '../model.js';

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
