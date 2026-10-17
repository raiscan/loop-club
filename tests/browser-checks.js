// Run from the app's browser console after clicking Play once:
// await (await import('./tests/browser-checks.js')).runBrowserChecks()
// These integration checks use actual Web Audio and DOM controls. The controller
// fixture replaces only the hardware boundary; no app code is bypassed.
import { AudioEngine, drumVoice, synthVoice, synthChord, tutorialCue } from '../audio.js?v=10';
import { createSong, PRESETS, SAVE_KEY, DRUM_SOUNDS, SYNTH_SOUNDS } from '../model.js?v=10';
import { TutorialSpeech } from '../tutorial.js?v=10';
import { TUTORIAL_RECORDINGS } from '../tutorial-voice.js?v=10';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const $ = selector => document.querySelector(selector);
function check(condition, name, results) {
  if (!condition) throw new Error(`FAIL: ${name}`);
  results.push(name);
}
const readSong = () => JSON.parse(localStorage.getItem(SAVE_KEY));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function render(build, seconds = 1.4) {
  const context = new OfflineAudioContext(1, Math.ceil(44100 * seconds), 44100);
  build(context, context.destination);
  const buffer = await context.startRendering();
  return buffer.getChannelData(0);
}
function energy(data, start = 0, end = data.length) {
  let sum = 0;
  for (let i = start; i < end; i++) sum += data[i] ** 2;
  return Math.sqrt(sum / Math.max(1, end - start));
}
function roughness(data) {
  let sum = 0;
  for (let i = 1; i < data.length; i++) sum += (data[i] - data[i - 1]) ** 2;
  return sum;
}

export async function runAudioChecks() {
  const results = [];
  const cue = await render((ctx, out) => tutorialCue(ctx, out, 0.02));
  check(cue.every(Number.isFinite) && energy(cue, 1000, 5000) > 0.001 && energy(cue, 22050) === 0, 'tutorial chime is audible, finite and releases to silence', results);
  for (const id of Object.keys(DRUM_SOUNDS)) {
    const data = await render((context, output) => drumVoice(context, output, id, 0.02));
    check(data.every(Number.isFinite) && energy(data, 1000, 3000) > 0.002, `${id} renders audible, finite samples`, results);
    check(energy(data, 22050) === 0, `${id} releases to silence`, results);
  }
  const soft = { brightness: 0, length: 40, wobble: 0 };
  const bright = { ...soft, brightness: 100 };
  const short = await render((ctx, out) => synthVoice(ctx, out, 0, 0.01, { ...bright, length: 0 }, 164));
  const long = await render((ctx, out) => synthVoice(ctx, out, 0, 0.01, { ...bright, length: 100 }, 164));
  check(energy(short, 10000, 18000) === 0 && energy(long, 10000, 18000) > 0.001, 'note length changes the audible release', results);
  const dull = await render((ctx, out) => synthVoice(ctx, out, 0, 0.01, soft, 164));
  const sharp = await render((ctx, out) => synthVoice(ctx, out, 0, 0.01, bright, 164));
  check(roughness(sharp) > roughness(dull) * 2, 'brightness changes the rendered spectrum', results);
  const wobbly = await render((ctx, out) => synthVoice(ctx, out, 0, 0.01, { ...bright, wobble: 100 }, 164));
  check(wobbly.some((value, i) => Math.abs(value - sharp[i]) > 0.01), 'wobble changes the rendered synth', results);
  const voices = [];
  for (const id of Object.keys(SYNTH_SOUNDS)) {
    const data = await render((ctx, out) => synthVoice(ctx, out, 0, 0.01, { brightness: 80, length: 60, wobble: 25 }, 164, id));
    check(data.every(Number.isFinite) && energy(data) > 0.001, `${id} synth renders audible, finite samples`, results);
    check(voices.every(other => data.some((value, i) => Math.abs(value - other[i]) > 0.01)), `${id} synth has a distinct waveform`, results);
    voices.push(data);
  }
  for (const preset of Object.keys(PRESETS)) {
    const song = createSong(preset);
    const seconds = 60 / song.tempo * 4 + 1;
    const data = await render((ctx, out) => {
      const gain = ctx.createGain(); gain.gain.value = 0.55 * 0.65; gain.connect(out);
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -12; compressor.ratio.value = 6; compressor.knee.value = 12; compressor.connect(gain);
      for (let step = 0; step < 16; step++) {
        const time = 0.04 + step * 60 / song.tempo / 4;
        song.drums.forEach((row, index) => { if (row[step]) drumVoice(ctx, compressor, song.drumSounds[index], time); });
        if (song.melody[step].length) synthChord(ctx, compressor, song.melody[step], time, song.sound, song.tempo, song.synth);
      }
    }, seconds);
    check(data.every(Number.isFinite) && energy(data) > 0.01 && data.every(value => Math.abs(value) < 1), `${preset}: full bar renders without silence, non-finite samples or clipping`, results);
  }
  const states = [];
  const engine = new AudioEngine(() => createSong(), () => {}, state => states.push(state), error => { throw new Error(error); });
  engine.ensureGraph();
  await engine.context.suspend();
  const resume = engine.context.resume.bind(engine.context);
  let release;
  engine.context.resume = () => new Promise(resolve => { release = resolve; });
  const starting = engine.start();
  engine.stop();
  await resume(); release(); await starting;
  check(!engine.playing && !engine.pending && engine.timer === null && engine.voices.size === 0 && states.at(-1) === 'stopped', 'stop cancels a pending audio start', results);
  engine.context.resume = resume;
  await engine.start(); await wait(90);
  check(engine.playing && engine.timer !== null, 'engine can restart after a cancelled start', results);
  engine.stop(); await wait(60);
  check(engine.visuals.size === 0 && engine.voices.size === 0, 'stop clears scheduled visuals and voices', results);
  await engine.context.close();
  return results;
}

export async function runInteractionChecks() {
  const results = [];
  const original = localStorage.getItem(SAVE_KEY);
  const originalGetPads = Object.getOwnPropertyDescriptor(navigator, 'getGamepads');
  let pad = null;
  const makePad = (pressed = []) => ({
    connected: true, mapping: 'standard', id: 'Xbox integration fixture', index: 0,
    axes: [0, 0, 0, 0], timestamp: performance.now(),
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), touched: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 }))
  });
  const press = async (button, duration = 45) => {
    pad = makePad([button]); await wait(duration); pad = makePad(); await wait(45);
  };
  try {
    if ($('#play').getAttribute('aria-pressed') === 'true') $('#play').click();
    $('[data-preset=breaks]').click(); $('#reset').click(); $('#tab-drums').click();
    const firstPage = $('[data-page="0"]'); if (firstPage) firstPage.click();
    const before = readSong();
    const kick = $('[data-drum="0"][data-step="0"]');
    kick.click();
    check(readSong().drums[0][0] === !before.drums[0][0] && kick.getAttribute('aria-pressed') === String(!before.drums[0][0]), 'mouse step edit updates UI and persisted song', results);
    $('#undo').click();
    check(same(readSong(), before), 'undo restores the complete saved song', results);
    const target = $('[data-drum="1"][data-step="1"]');
    target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', pointerId: 1 }));
    target.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', pointerId: 1 }));
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    check(readSong().drums[1][1] === !before.drums[1][1], 'touch gesture changes a step once', results);
    $('#undo').click();
    $('[data-preset=club]').click(); $('#undo').click();
    check(same(readSong(), before), 'choosing another groove can be undone', results);
    kick.click(); const edited = readSong(); $('#reset').click(); $('#undo').click();
    check(same(readSong(), edited), 'start over can be undone', results);
    $('#tab-melody').click();
    const note = $('[data-note="5"][data-step="0"]'); note.click();
    check(same(readSong().melody[0], [0, 5]) && document.querySelectorAll('#melody-grid [data-step="0"][aria-pressed=true]').length === 2, 'melody editing adds a note beside the existing pitch', results);
    note.click();
    check(same(readSong().melody[0], [0]), 'tapping an active melody note removes only that note', results);
    $('#tab-sound').click();
    const oldSound = readSong().sound;
    const slider = $('#brightness');
    const oldWave = $('#wave-path').getAttribute('d');
    slider.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    for (const value of [10, 40, 80]) { slider.value = value; slider.dispatchEvent(new Event('input', { bubbles: true })); }
    window.dispatchEvent(new PointerEvent('pointerup'));
    check(readSong().sound.brightness === 80 && $('#wave-path').getAttribute('d') !== oldWave, 'sound control updates both saved sound and illustration', results);
    $('#undo').click();
    check(same(readSong().sound, oldSound), 'a complete slider drag takes one undo', results);
    const storedWrite = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); };
    try {
      slider.value = 25; slider.dispatchEvent(new Event('input', { bubbles: true }));
      check($('#save-status').textContent.includes('Not saved'), 'unavailable storage is reported without breaking controls', results);
    } finally { Storage.prototype.setItem = storedWrite; }
    $('#undo').click();
    check($('#save-status').textContent.includes('Saved'), 'saving recovers when storage becomes available', results);
    $('#tab-drums').click();
    $('#play').click(); await wait(350);
    check($('#play-state').classList.contains('playing') && document.querySelectorAll('.loop-light.current').length === 1, 'play starts audio and the moving loop light', results);
    const playingStep = $('.loop-light.current').dataset.step;
    await wait(150);
    check($('.loop-light.current').dataset.step !== playingStep, 'playhead advances with the loop', results);
    $('#play').click(); await wait(60);
    check($('#play').getAttribute('aria-pressed') === 'false' && document.querySelectorAll('.current').length === 0, 'stop clears the playhead', results);
    $('#play').click(); $('#play').click(); await wait(120);
    check($('#play').getAttribute('aria-pressed') === 'false', 'two immediate play presses leave playback stopped', results);

    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => pad ? [pad] : [] });
    pad = makePad(); await wait(60);
    $('#tab-drums').click();
    const controllerStep = $('[data-drum="0"][data-step="0"]'); controllerStep.focus();
    const beforeA = readSong().drums[0][0];
    await press(0, 500);
    check(readSong().drums[0][0] === !beforeA && controllerStep.classList.contains('controller-focus'), 'held Xbox A edits exactly once and shows controller focus', results);
    await press(2);
    check(readSong().drums[0][0] === beforeA, 'Xbox X undoes the edit', results);
    const instrumentButton = $('[data-drum-choice="3"]');
    instrumentButton.focus();
    const beforeInstrument = readSong().drumSounds[3];
    await press(0);
    check(readSong().drumSounds[3] !== beforeInstrument && document.activeElement === instrumentButton, 'Xbox A changes a drum instrument without losing focus', results);
    await press(2);
    check(readSong().drumSounds[3] === beforeInstrument, 'Xbox X restores the previous drum instrument', results);
    controllerStep.focus();
    await press(15);
    check(document.activeElement.dataset.step === '1' && document.activeElement.dataset.drum === '0', 'D-pad moves to the neighbouring step', results);
    const columns = document.querySelectorAll('#drum-grid [data-drum="0"]').length;
    if (columns < 16) {
      $(`[data-drum="0"][data-step="${columns - 1}"]`).focus();
      await press(15);
      check(document.activeElement.dataset.step === String(columns), 'D-pad crosses into the next page of steps', results);
      await press(14); await press(14);
      check(document.activeElement.dataset.step === String(columns - 1), 'D-pad crosses back into the previous page of steps', results);
      $('[data-page="0"]').click();
    }
    await press(5);
    check($('#tab-melody').getAttribute('aria-selected') === 'true', 'RB switches to Tunes', results);
    const beforeChord = readSong().melody[0];
    for (const note of [1, 3]) { $(`[data-note="${note}"][data-step="0"]`).focus(); await press(0); }
    check(same(readSong().melody[0], [0, 1, 3]) && document.querySelectorAll('#melody-grid [data-step="0"][aria-pressed=true]').length === 3, 'Xbox A stacks notes into a chord without replacing existing notes', results);
    $('[data-note="1"][data-step="0"]').focus(); await press(0);
    check(same(readSong().melody[0], [0, 3]), 'Xbox A removes one chord note and leaves the others', results);
    await press(2);
    check(same(readSong().melody[0], [0, 1, 3]), 'Xbox X restores the removed chord note', results);
    await press(2); await press(2);
    check(same(readSong().melody[0], beforeChord), 'Xbox undo returns the column to its original notes', results);
    const beforeSynth = readSong().synth;
    $('[data-synth-choice="bell"]').focus(); await press(0);
    check(readSong().synth === 'bell', 'Xbox A selects a synth voice in Tunes', results);
    await press(2);
    check(readSong().synth === beforeSynth, 'Xbox X restores the previous synth voice', results);
    await press(5);
    check($('#tab-sound').getAttribute('aria-selected') === 'true', 'RB switches to Sounds', results);
    const oldValue = Number($('#brightness').value); $('#brightness').focus();
    await press(15);
    check(Number($('#brightness').value) === oldValue + 5, 'D-pad adjusts the focused sound slider', results);
    await press(1);
    check(document.activeElement === $('#tab-sound'), 'B returns focus to the active section', results);
    $('#help').click(); await press(1);
    check(!$('#help-dialog').open, 'Xbox B closes help', results);
    await press(9); await wait(120);
    check($('#play-state').classList.contains('playing'), 'Xbox Menu starts the loop', results);
    pad = null; await wait(100);
    check($('#play').getAttribute('aria-pressed') === 'false', 'controller disconnect stops playback', results);
    $('#play').click(); await wait(90); window.dispatchEvent(new Event('blur')); await wait(50);
    check($('#play').getAttribute('aria-pressed') === 'false', 'leaving the window stops playback', results);
    $('#tab-drums').click();
    const visibleSteps = [...document.querySelectorAll('#drum-grid .step')];
    check(visibleSteps.every(button => { const rect = button.getBoundingClientRect(); return rect.width >= 44 && rect.height >= 44; }), 'visible sequence targets are at least 44 pixels in both directions', results);
    check(document.documentElement.scrollWidth <= innerWidth, 'the interface has no horizontal page overflow', results);
  } finally {
    pad = null;
    if (originalGetPads) Object.defineProperty(navigator, 'getGamepads', originalGetPads); else delete navigator.getGamepads;
    if ($('#play').getAttribute('aria-pressed') === 'true') $('#play').click();
    if (original === null) localStorage.removeItem(SAVE_KEY); else localStorage.setItem(SAVE_KEY, original);
    // Reload after the run to restore the original song in the UI, too.
  }
  return results;
}

export async function runBrowserChecks() {
  const checks = [...runReadingChecks(), ...runPresetChecks(), ...await runAudioChecks(), ...await runChordChecks(), ...await runInteractionChecks(), ...await runPlayheadChecks(), ...await runInstrumentChecks(), ...await runTutorialChecks(), ...await runTutorialControllerChecks(), ...await runRecordedVoiceChecks()];
  return { passed: checks.length, checks };
}

export async function runRecordedVoiceChecks() {
  const results = [];
  for (const [id, recording] of Object.entries(TUTORIAL_RECORDINGS)) {
    const response = await fetch(recording.src);
    check(response.ok && response.headers.get('content-type').includes('audio/mpeg'), `${id}: bundled MP3 is served as audio`, results);
    const context = new OfflineAudioContext(1, 1, 24000);
    const buffer = await context.decodeAudioData(await response.arrayBuffer());
    const data = buffer.getChannelData(0);
    check(buffer.duration > 0.5 && data.every(Number.isFinite) && energy(data) > 0.005, `${id}: browser decodes finite, audible speech samples`, results);
  }
  const ducks = [];
  const speech = new TutorialSpeech({ synth: null, Utterance: null, volume: () => 0, duck: value => ducks.push(value) });
  try {
    check(speech.available, 'recorded narration is available with device speech APIs absent', results);
    speech.say(TUTORIAL_RECORDINGS.drum.text, false, 'drum');
    for (let i = 0; i < 40 && ducks.at(-1) !== true; i++) await wait(50);
    const first = speech.clip;
    check(first && !first.paused && ducks.at(-1), 'HTML audio plays a recording without an installed voice', results);
    const time = first.currentTime; await wait(120);
    check(first.currentTime > time, 'recording playback advances in real media time', results);
    const staleEnd = first.onended;
    speech.say(TUTORIAL_RECORDINGS.play.text, false, 'play');
    check(first.paused && !first.getAttribute('src'), 'a new prompt stops and releases the prior clip', results);
    staleEnd(); speech.stop();
    check(speech.clip === null && ducks.at(-1) === false, 'exit cancels recorded audio and restores music level', results);
  } finally { speech.stop(); }
  return results;
}

export async function runTutorialControllerChecks() {
  const results = [], original = localStorage.getItem(SAVE_KEY);
  const card = $('#tutorial-card');
  const descriptor = Object.getOwnPropertyDescriptor(navigator, 'getGamepads');
  let pressed = [], connected = true;
  const pad = () => ({ connected: true, mapping: 'standard', id: 'Xbox tutorial fixture', index: 0, axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 })) });
  const press = async button => { pressed = [button]; await wait(70); pressed = []; await wait(90); };
  try {
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => connected ? [pad()] : [] });
    await wait(60);
    $('#tutorial-start').click();
    const voiceState = $('#tutorial-voice').getAttribute('aria-pressed');
    $('#tutorial-voice').click();
    check($('#tutorial-voice').getAttribute('aria-pressed') !== voiceState && card.dataset.tutorialStep === '0', 'voice toggle changes speech without skipping a task', results);
    if ($('#tutorial-voice').getAttribute('aria-pressed') === 'true') $('#tutorial-voice').click();
    $('#tutorial-repeat').click();
    check(card.dataset.tutorialStep === '0', 'Say it repeats the prompt without advancing', results);
    // Put focus back on the target after toggling speech, as a user can do with the D-pad.
    $('[aria-describedby~="tutorial-title"]').focus();
    for (let step = 0; step < 8; step++) {
      if (step === 3) {
        const target = $('[aria-describedby~="tutorial-title"]');
        await press(15);
        check(document.activeElement === target || card.contains(document.activeElement), 'Xbox navigation stays in the bright tutorial controls', results);
        target.focus(); await press(5);
        check(card.dataset.tutorialStep === '3' && document.activeElement === target, 'Xbox shoulder buttons keep the current tutorial target', results);
      }
      await press(0);
      check(Number($('#tutorial-card').dataset.tutorialStep) === step + 1, `Xbox A advances tutorial action ${step + 1}`, results);
    }
    await press(15); await wait(500);
    check($('#tutorial-card').dataset.tutorialStep === '9', 'Xbox D-pad changes the highlighted tutorial slider', results);
    await press(0);
    check($('#tutorial-card').dataset.tutorialStep === '10', 'Xbox A finishes the final Play action', results);
    await press(1);
    check($('#tutorial-card').hidden && $('#tutorial-ring').hidden, 'Xbox B leaves the guide', results);
    $('#tutorial-start').click();
    window.dispatchEvent(new Event('blur'));
    check($('#tutorial-card').hidden && $('#tutorial-ring').hidden && $('#play').getAttribute('aria-pressed') === 'false', 'leaving the page cancels the guide and audio', results);
  } finally {
    if (!$('#tutorial-card').hidden) $('#tutorial-exit').click();
    connected = false; await wait(60);
    if (descriptor) Object.defineProperty(navigator, 'getGamepads', descriptor); else delete navigator.getGamepads;
    if (original === null) localStorage.removeItem(SAVE_KEY); else localStorage.setItem(SAVE_KEY, original);
  }
  return results;
}

export async function runTutorialChecks() {
  const results = [], original = localStorage.getItem(SAVE_KEY);
  const card = $('#tutorial-card');
  const waitForStep = async index => {
    for (let i = 0; i < 60; i++) {
      if (Number(card.dataset.tutorialStep) === index) return;
      await wait(40);
    }
    throw new Error(`Tutorial did not reach step ${index}`);
  };
  try {
    if (!card.hidden) $('#tutorial-exit').click();
    $('[data-preset=breaks]').click(); $('#reset').click();
    const before = readSong();
    $('#tutorial-start').click();
    if ($('#tutorial-voice').getAttribute('aria-pressed') === 'true') $('#tutorial-voice').click();
    check(!card.hidden && same(readSong(), before), 'tutorial opens without replacing the saved groove', results);
    for (let index = 0; index < 10; index++) {
      await waitForStep(index); await wait(60);
      const target = $('[aria-describedby~="tutorial-title"]');
      check(target && document.activeElement === target, `${innerWidth}px tutorial ${index}: focus follows the real control`, results);
      const rect = target.getBoundingClientRect(), ring = $('#tutorial-ring').getBoundingClientRect(), prompt = card.getBoundingClientRect();
      check(!$('#tutorial-ring').hidden && Math.abs(ring.left - rect.left + 7) < 1 && Math.abs(ring.top - rect.top + 7) < 1,
        `${innerWidth}px tutorial ${index}: the ring follows the target`, results);
      const overlap = rect.left < prompt.right && rect.right > prompt.left && rect.top < prompt.bottom && rect.bottom > prompt.top;
      check(!overlap && rect.top >= 0 && rect.bottom <= innerHeight && prompt.top >= 0 && prompt.bottom <= innerHeight,
        `${innerWidth}px tutorial ${index}: prompt and target remain visible without overlap`, results);
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      check(!$('#tutorial-shade').hidden && (hit === target || target.contains(hit)) && document.elementFromPoint(2, 2) === $('#tutorial-shade path'),
        `${innerWidth}px tutorial ${index}: screen is dimmed and the target opening remains clickable`, results);
      check(parseFloat(getComputedStyle($('#tutorial-title')).fontSize) >= 28 && parseFloat(getComputedStyle($('#tutorial-copy')).fontSize) >= 23 && getComputedStyle(card).fontFamily.includes('sans-serif'),
        `${innerWidth}px tutorial ${index}: large sans-serif words`, results);
      check(Boolean($('#tutorial-picture svg')) && [...card.querySelectorAll('button')].filter(node => !node.hidden).every(node => node.getBoundingClientRect().height >= 44),
        `${innerWidth}px tutorial ${index}: a visual and large buttons are available`, results);
      if (index === 8) {
        const picture = $('#tutorial-picture').innerHTML;
        target.value = Number(target.value) > 50 ? 20 : 80;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        check($('#tutorial-picture').innerHTML !== picture, 'sound diagram responds to the real slider', results);
      } else target.click();
      await waitForStep(index + 1);
      if (index === 6) check(readSong().melody[0].length >= 2, 'the tour builds a real chord in one column', results);
    }
    check(!$('#tutorial-done').hidden && $('#tutorial-ring').hidden, 'tutorial ends with a clear Done button', results);
    $('#tutorial-done').click();
    check(card.hidden && $('#tutorial-shade').hidden && !$('[aria-describedby~="tutorial-title"]'), 'Done clears the prompt, dimming and target description', results);
    $('#tutorial-start').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    check(card.contains(document.activeElement), 'Tab moves from the bright target into the helper', results);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    check(card.hidden && $('#tutorial-ring').hidden && $('#tutorial-shade').hidden, 'Escape leaves the tutorial and removes the ring and dimming', results);
  } finally {
    if (!card.hidden) $('#tutorial-exit').click();
    if ($('#play').getAttribute('aria-pressed') === 'true') $('#play').click();
    if (original === null) localStorage.removeItem(SAVE_KEY); else localStorage.setItem(SAVE_KEY, original);
  }
  return results;
}

export function runPresetChecks() {
  const results = [], original = localStorage.getItem(SAVE_KEY);
  try {
    $('#tab-drums').click(); $('[data-preset=breaks]').click(); $('#reset').click();
    const firstPage = $('[data-page="0"]'); if (firstPage) firstPage.click();
    $('[data-drum="0"][data-step="0"]').click();
    check(document.querySelectorAll('[data-preset]').length === Object.keys(PRESETS).length, 'every example has a starting-groove card', results);
    for (const id of Object.keys(PRESETS)) {
      const before = readSong();
      $(`[data-preset="${id}"]`).click();
      check(same(readSong(), createSong(id)), `${id}: card loads the complete beat, chords and instruments`, results);
      check(document.querySelectorAll('[data-preset][aria-pressed=true]').length === 1 && $(`[data-preset="${id}"]`).getAttribute('aria-pressed') === 'true', `${id}: only the chosen example is highlighted`, results);
      $('#undo').click();
      check(same(readSong(), before), `${id}: choosing an example is undoable`, results);
    }
  } finally {
    if (original === null) localStorage.removeItem(SAVE_KEY); else localStorage.setItem(SAVE_KEY, original);
  }
  return results;
}

export async function runChordChecks() {
  const results = [], notes = [0, 1, 3];
  const settings = { brightness: 70, length: 60, wobble: 30 };
  const rest = await render((ctx, out) => synthChord(ctx, out, [], 0.04, settings, 164));
  check(energy(rest) === 0, 'an empty chord renders silence', results);
  for (const instrument of Object.keys(SYNTH_SOUNDS)) {
    const singles = [];
    for (const note of notes) singles.push(await render((ctx, out) => synthVoice(ctx, out, note, 0.04, settings, 164, instrument)));
    const chord = await render((ctx, out) => synthChord(ctx, out, notes, 0.04, settings, 164, instrument));
    let maxError = 0;
    for (let i = 0; i < chord.length; i++) {
      const expected = (singles[0][i] + singles[1][i] + singles[2][i]) / Math.sqrt(3);
      maxError = Math.max(maxError, Math.abs(chord[i] - expected));
    }
    check(maxError < 0.0001 && energy(chord) > 0.001, `${instrument}: chord contains all three simultaneous notes with balanced gain`, results);
  }
  const stopped = await render((ctx, out) => {
    const chord = synthChord(ctx, out, notes, 0.04, settings, 164, 'bell');
    chord.stop(0.1);
  });
  check(energy(stopped, 8820) === 0, 'stopping a chord silences every note', results);
  const engine = new AudioEngine(() => createSong(), () => {}, () => {}, error => { throw new Error(error); });
  try {
    await engine.audition('chord', [0, 1, 3]);
    await engine.audition('chord', [0, 3]);
    await wait(60);
    check(engine.voices.size === 1, 'editing a stopped chord replaces its previous audition', results);
    await engine.audition('chord', []);
    await wait(60);
    check(engine.voices.size === 0, 'removing the last chord note stops its audition', results);
  } finally { engine.stop(); if (engine.context) await engine.context.close(); }
  for (const tempo of [30, 300]) {
    const data = await render((ctx, out) => {
      const gain = ctx.createGain(); gain.gain.value = 0.55 * 0.65; gain.connect(out);
      const compressor = ctx.createDynamicsCompressor(); compressor.threshold.value = -12; compressor.ratio.value = 6; compressor.knee.value = 12; compressor.connect(gain);
      for (let step = 0; step < 4; step++) synthChord(ctx, compressor, [0, 1, 2, 3, 4, 5], 0.04 + step * 60 / tempo / 4, { ...settings, length: 100 }, tempo, 'bell');
    }, 3);
    check(data.every(Number.isFinite) && data.every(value => Math.abs(value) < 1) && energy(data) > 0.001, `six-note chords render without clipping at ${tempo} BPM`, results);
  }
  return results;
}

export async function runInstrumentChecks() {
  const results = [], original = localStorage.getItem(SAVE_KEY);
  try {
    if ($('#play').getAttribute('aria-pressed') === 'true') $('#play').click();
    $('#tab-drums').click(); $('[data-preset=breaks]').click(); $('#reset').click();
    const firstPage = $('[data-page="0"]'); if (firstPage) firstPage.click();
    check(document.querySelectorAll('[data-drum-pad]').length === 4, 'four drum lanes are available', results);
    const extra = $('[data-drum="3"][data-step="0"]'); extra.click();
    check(readSong().drums[3][0] && extra.getAttribute('aria-pressed') === 'true', 'fourth drum lane can be sequenced', results);
    const before = readSong(), choices = new Set();
    for (let i = 0; i < 8; i++) {
      $('[data-drum-choice="3"]').click();
      const song = readSong(); choices.add(song.drumSounds[3]);
      check(same(song.drums, before.drums) && same(song.melody, before.melody), `drum sound change ${i + 1} preserves every pattern`, results);
    }
    check(choices.size === 8 && readSong().drumSounds[3] === before.drumSounds[3], 'drum selector cycles all eight sounds and returns to the start', results);
    $('[data-drum-choice="3"]').click(); $('#undo').click();
    check(readSong().drumSounds[3] === before.drumSounds[3], 'drum instrument choice is undoable', results);
    $('#tab-melody').click();
    for (const id of Object.keys(SYNTH_SOUNDS)) {
      $(`[data-synth-choice="${id}"]`).click();
      check(readSong().synth === id && $(`[data-synth-choice="${id}"]`).getAttribute('aria-pressed') === 'true', `${id} choice is saved and reflected in Tunes`, results);
    }
    $('#tab-sound').click();
    check($('[data-synth-choice="bell"]').getAttribute('aria-pressed') === 'true' && !$('#synth-picker').hidden, 'Sounds shares the instrument selected in Tunes', results);
    $('#undo').click();
    check(readSong().synth === 'arcade', 'synth instrument choice is undoable', results);
    await wait(100);
  } finally {
    if (original === null) localStorage.removeItem(SAVE_KEY); else localStorage.setItem(SAVE_KEY, original);
  }
  return results;
}

export function runLayoutChecks() {
  const results = [];
  check([...document.querySelectorAll('[data-preset]')].every(node => {
    const rect = node.getBoundingClientRect();
    return rect.width >= 44 && rect.height >= 44 && rect.left >= 0 && rect.right <= innerWidth;
  }), `${innerWidth}px: every groove card fits and retains a 44px target`, results);
  for (const name of ['drums', 'melody', 'sound']) {
    $(`#tab-${name}`).click();
    const machine = $('.machine').getBoundingClientRect();
    const visible = [...document.querySelectorAll('.machine button, .machine input')].filter(node => node.getClientRects().length);
    check(visible.every(node => {
      const rect = node.getBoundingClientRect();
      return rect.left >= machine.left && rect.right <= machine.right + 0.1;
    }), `${innerWidth}px ${name}: every control is inside the machine`, results);
    check(visible.every(node => {
      const rect = node.getBoundingClientRect();
      return rect.width >= 43.9 && rect.height >= 43.9;
    }), `${innerWidth}px ${name}: targets retain 44px sizing (subpixel tolerance)`, results);
  }
  $('#tab-drums').click();
  check(document.documentElement.scrollWidth <= innerWidth, `${innerWidth}px: no horizontal page overflow`, results);
  return results;
}

export async function runPlayheadChecks() {
  const results = [];
  $('#tab-melody').click();
  if ($('#play').getAttribute('aria-pressed') !== 'true') $('#play').click();
  try {
    let outlined;
    for (let i = 0; i < 40; i++) {
      await wait(50);
      const cells = [...document.querySelectorAll('#melody-grid .step.current')];
      if (cells.length === 6 && cells.every(cell => getComputedStyle(cell).boxShadow.includes('inset'))) {
        outlined = cells[0].dataset.step; break;
      }
    }
    check(outlined !== undefined, 'Tunes renders a white playhead outline on the current column', results);
    let advanced = false;
    for (let i = 0; i < 40; i++) {
      await wait(50);
      const cell = $('#melody-grid .step.current');
      if (cell && cell.dataset.step !== outlined && getComputedStyle(cell).boxShadow.includes('inset')) { advanced = true; break; }
    }
    check(advanced, 'Tunes white playhead moves to the next visible column', results);
    $('#tab-drums').click();
    check([...document.querySelectorAll('#drum-grid .step.current')].every(cell => getComputedStyle(cell).boxShadow.includes('inset')), 'Beats retains its outlined playhead after switching tabs', results);
  } finally { if ($('#play').getAttribute('aria-pressed') === 'true') $('#play').click(); }
  return results;
}

export function runReadingChecks() {
  const results = [];
  check([...document.querySelectorAll('[data-preset]')].every(node => node.textContent.trim().split(/\s+/).length === 1), 'song cards use one short name and a picture', results);
  for (const section of ['drums', 'melody', 'sound']) {
    $(`#tab-${section}`).click();
    const text = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT);
    const tooSmall = [];
    while (text.nextNode()) {
      const node = text.currentNode, parent = node.parentElement;
      if (!node.textContent.trim() || parent.closest('svg') || !parent.getClientRects().length) continue;
      if (parseFloat(getComputedStyle(parent).fontSize) < 18) tooSmall.push(node.textContent.trim());
    }
    check(tooSmall.length === 0, `${innerWidth}px ${section}: all visible words and numbers are at least 18px: ${tooSmall.join(', ')}`, results);
    check(!/envelope|filter|brightness|BPM|LC–01|column/i.test($('.machine').innerText), `${section}: detailed synth terms stay in grown-up help`, results);
  }
  $('#tab-drums').click();
  return results;
}
