// Run from the app's browser console after clicking Play once:
// await (await import('./tests/browser-checks.js')).runBrowserChecks()
// These integration checks use actual Web Audio and DOM controls. The controller
// fixture replaces only the hardware boundary; no app code is bypassed.
import { AudioEngine, drumVoice, synthVoice, synthChord, tutorialCue } from '../audio.js?v=19';
import { createSong, editSong, PRESETS, SAVE_KEY, DRUM_SOUNDS, SYNTH_SOUNDS } from '../model.js?v=19';
import { TutorialSpeech, blankTutorialSong, tutorialPlaybackSong, tutorialPicture } from '../tutorial.js?v=19';
import { TUTORIAL_RECORDINGS } from '../tutorial-voice.js?v=19';

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
    const seconds = 60 / song.tempo * song.melody.length + 1.3;
    const data = await render((ctx, out) => {
      const gain = ctx.createGain(); gain.gain.value = 0.55 * 0.65; gain.connect(out);
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -12; compressor.ratio.value = 6; compressor.knee.value = 12; compressor.connect(gain);
      for (let step = 0; step < song.melody.length; step++) {
        const time = 0.04 + step * 60 / song.tempo;
        song.drums.forEach((row, index) => { if (row[step]) drumVoice(ctx, compressor, song.drumSounds[index], time); });
        if (song.melody[step].length) synthChord(ctx, compressor, song.melody[step], time, song.sound, song.tempo, song.synth, song.noteSounds[step]);
      }
    }, seconds);
    check(data.every(Number.isFinite) && energy(data) > 0.01 && data.every(value => Math.abs(value) < 1), `${preset}: full phrase renders without silence, non-finite samples or clipping`, results);
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
    await wait(420);
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
    if (columns < readSong().melody.length) {
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
  const checks = [...await runLoopSizeChecks(), ...await runThemeChecks(), ...await runTutorialThemeChecks(), ...runMapAndVolumeChecks(), ...await runMuteChecks(), ...runReadingChecks(), ...runPresetChecks(), ...await runAudioChecks(), ...await runChordChecks(), ...await runBrushChecks(), ...await runInteractionChecks(), ...await runPlayheadChecks(), ...await runInstrumentChecks(), ...await runLessonAudioChecks(), ...await runTutorialChecks(), ...await runTutorialControllerChecks(), ...await runRecordedVoiceChecks()];
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
        await press(2);
        check(!document.querySelector('[data-drum][aria-pressed="true"]'), 'Xbox Undo cannot bring preset notes into blank practice', results);
        await press(9);
        check($('#play').getAttribute('aria-pressed') === 'false' && card.dataset.tutorialStep === '3', 'Xbox Menu cannot bypass the listen-and-try lesson', results);
      }
      await press(0);
      if ([2, 3, 5, 6].includes(step)) {
        for (let i = 0; i < 90 && $('#tutorial-next').disabled; i++) await wait(40);
        check(!$('#tutorial-next').disabled && document.activeElement === $('#tutorial-next'), `Xbox lesson ${step}: focus moves to Next after playback`, results);
        await press(5);
        check(document.activeElement === $('#tutorial-next'), `Xbox lesson ${step}: shoulder buttons preserve the bright Next control`, results);
        await press(0);
      }
      check(Number($('#tutorial-card').dataset.tutorialStep) === step + 1, `Xbox A advances tutorial action ${step + 1}`, results);
    }
    await press(15); await wait(750);
    for (let i = 0; i < 90 && $('#tutorial-next').disabled; i++) await wait(40);
    await press(0);
    check($('#tutorial-card').dataset.tutorialStep === '9', 'Xbox D-pad changes the highlighted tutorial slider', results);
    await press(0);
    check($('#tutorial-card').dataset.tutorialStep === '10', 'Xbox A finishes the final Play action', results);
    await press(1);
    check($('#tutorial-card').hidden && $('#tutorial-ring').hidden, 'Xbox B leaves the guide', results);
    const oldTheme = document.documentElement.dataset.theme, oldThemeSaved = localStorage.getItem('loop-club.theme.v1');
    $('#theme-open').focus(); await press(0);
    check($('#theme-dialog').open && $('#theme-dialog').contains(document.activeElement), 'Xbox A opens Look and focuses the selected theme', results);
    $('[data-theme-choice="sunny"]').focus(); await press(15);
    check(document.activeElement === $('[data-theme-choice="pink"]'), 'Xbox D-pad moves between pictured looks', results);
    await press(0);
    check(document.documentElement.dataset.theme === 'pink' && $('#theme-dialog').open, 'Xbox A can try a new theme inside the picker', results);
    await press(1);
    check(!$('#theme-dialog').open && document.activeElement === $('#theme-open'), 'Xbox B closes Look and returns to its button', results);
    $('#theme-open').click(); $(`[data-theme-choice="${oldTheme}"]`).click(); $('#theme-done').click(); await wait(40);
    if (oldThemeSaved === null) localStorage.removeItem('loop-club.theme.v1'); else localStorage.setItem('loop-club.theme.v1', oldThemeSaved);
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
    $('[data-preset=club]').click(); $('[data-preset=breaks]').click(); $('#reset').click();
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
      if (index === 2 && $('#tutorial-voice').getAttribute('aria-pressed') !== 'true') $('#tutorial-voice').click();
      if (index === 2 || index === 3) check(!document.querySelector('[data-drum][aria-pressed="true"]') && !document.querySelector('[data-note][aria-pressed="true"]'), 'drum practice starts with blank tracks', results);
      if (index === 5) check(!document.querySelector('[data-note][aria-pressed="true"]'), 'tune practice starts with no existing notes', results);
      if (index === 8) {
        check($('#play').getAttribute('aria-pressed') === 'true' && Boolean($('.step.current')), 'the sound lesson plays the learned notes while the slider moves', results);
        const picture = $('#tutorial-picture').innerHTML;
        target.value = Number(target.value) > 50 ? 20 : 80;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        check($('#tutorial-picture').innerHTML !== picture, 'sound diagram responds to the real slider', results);
      } else target.click();
      if ([2, 3, 5, 6, 8].includes(index)) {
        for (let i = 0; i < 30 && card.dataset.tutorialPhase !== 'hear'; i++) await wait(40);
        check(card.dataset.tutorialPhase === 'hear' && Number(card.dataset.tutorialStep) === index,
          `lesson ${index}: the action pauses for musical playback`, results);
        check($('#tutorial-next').disabled, `lesson ${index}: listen before Next becomes available`, results);
        const reviewRing = $('#tutorial-ring').getBoundingClientRect(), helper = card.getBoundingClientRect();
        const covered = reviewRing.left < helper.right && reviewRing.right > helper.left && reviewRing.top < helper.bottom && reviewRing.bottom > helper.top;
        check(!covered && reviewRing.top >= 0 && reviewRing.bottom <= innerHeight && helper.top >= 0 && helper.bottom <= innerHeight, `lesson ${index}: the playback highlight and helper both fit ${JSON.stringify({ring:reviewRing.toJSON(),helper:helper.toJSON(),width:innerWidth,height:innerHeight})}`, results);
        if (index === 3) {
          const cells = [...document.querySelectorAll('[data-drum="0"][data-step]')].filter(cell => Number(cell.dataset.step) < 4);
          check(cells.every(cell => { const r = cell.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === cell; }), 'the whole four-step drum phrase is selectively lit during playback', results);
        }
        if (index === 6) check(document.querySelectorAll('#melody-grid [data-step="0"][aria-pressed="true"]').length === 2, 'the tour builds a real chord in one column', results);
        let observedStep = null, moved = false;
        for (let i = 0; i < 90 && $('#tutorial-next').disabled; i++) {
          const current = $('.step.current');
          if (current) {
            if (observedStep !== null && current.dataset.step !== observedStep) moved = true;
            observedStep = current.dataset.step;
          }
          await wait(40);
        }
        check(!$('#tutorial-next').disabled && moved, `lesson ${index}: audible phrase has a moving playhead before Next`, results);
        check(same(readSong(), before), `lesson ${index}: practice does not overwrite the saved song`, results);
        if (index === 3) {
          $('#tutorial-repeat').click();
          check(!$('#tutorial-next').disabled && card.dataset.tutorialPhase === 'hear' && card.dataset.tutorialStep === '3', 'Hear again replays the beat while Next remains available', results);
          for (let i = 0; i < 90 && $('#tutorial-next').disabled; i++) await wait(40);
          check(!$('#tutorial-next').disabled, 'Next returns after hearing the same beat again', results);
        }
        if (index === 2) {
          for (let i = 0; i < 20 && !$('audio[data-tutorial-narration]')?.currentSrc.includes('reward-drum'); i++) await wait(30);
          const praise = $('audio[data-tutorial-narration]');
          check(praise && !praise.paused && praise.currentSrc.includes('reward-drum'), 'the drum reward speaks its praise and Tap Next after playback', results);
          if ($('#tutorial-voice').getAttribute('aria-pressed') === 'true') $('#tutorial-voice').click();
          $('[data-drum-pad="0"]').click(); await wait(80);
          check(!$('#tutorial-next').disabled && card.dataset.tutorialStep === '2' && $('#play').getAttribute('aria-pressed') === 'true', 'the highlighted drum can be tapped again without leaving the lesson or locking Next', results);
          check(!$('audio[data-tutorial-narration]'), 'trying the drum again stops the reminder so the music can be heard', results);
        }
        if (index === 3) {
          $('[data-drum="0"][data-step="1"]').click(); await wait(80);
          check($('[data-drum="0"][data-step="1"]').getAttribute('aria-pressed') === 'true' && !$('#tutorial-next').disabled, 'Zach can keep changing the highlighted beat before choosing Next', results);
        }
        if (index === 5) {
          $('[data-note="5"][data-step="1"]').click(); await wait(80);
          check($('[data-note="5"][data-step="1"]').getAttribute('aria-pressed') === 'true' && !$('#tutorial-next').disabled, 'Zach can try a different note and step before choosing Next', results);
        }
        if (index === 8) {
          const length = $('#length'); length.value = 80; length.dispatchEvent(new Event('input', { bubbles: true })); await wait(100);
          check(!$('#tutorial-next').disabled && $('#play').getAttribute('aria-pressed') === 'true', 'all sound sliders remain playable after the first try without locking Next', results);
        }
        $('#tutorial-next').click();
      }
      await waitForStep(index + 1);
    }
    check(!$('#tutorial-done').hidden && $('#tutorial-ring').hidden, 'tutorial ends with a clear Done button', results);
    $('#tutorial-done').click();
    check(readSong().melody[0].length === 2 && readSong().drums[0].every((hit,step) => step % 4 !== 0 || hit), 'Keep it saves the learned phrase as a full loop', results);
    $('#undo').click();
    check(same(readSong(), before), 'one Undo restores the original song after keeping a lesson', results);
    check(card.hidden && $('#tutorial-shade').hidden && !$('[aria-describedby~="tutorial-title"]'), 'Done clears the prompt, dimming and target description', results);
    $('#tutorial-start').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    check(card.contains(document.activeElement), 'Tab moves from the bright target into the helper', results);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    check(card.hidden && $('#tutorial-ring').hidden && $('#tutorial-shade').hidden, 'Escape leaves the tutorial and removes the ring and dimming', results);
    $('#tutorial-start').click(); $('#play').click(); await wait(60); $('#play').click();
    $('[aria-describedby~="tutorial-title"]').click(); await wait(60);
    check(card.dataset.tutorialPhase === 'hear', 'cancel scenario reaches an active musical reward', results);
    $('#tutorial-exit').click(); await wait(100);
    check(same(readSong(), before) && card.hidden && !$('.step.current') && $('#play').getAttribute('aria-pressed') === 'false', 'Bye restores the saved song and stops reward playback', results);
    const expectedHits = before.drums.reduce((sum, row) => sum + row.slice(0, document.querySelectorAll('[data-drum="0"]').length).filter(Boolean).length, 0);
    check(document.querySelectorAll('[data-drum][aria-pressed="true"]').length === expectedHits, 'the original drum pattern is restored visibly after leaving practice', results);
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
  for (const tempo of [30, 600]) {
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
    check($('[data-synth-choice="chime"]').getAttribute('aria-pressed') === 'true' && !$('#synth-picker').hidden, 'Sounds shares the instrument selected in Tunes', results);
    $('#undo').click();
    check(readSong().synth === 'bell', 'synth instrument choice is undoable', results);
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
    check(outlined !== undefined, 'Tunes renders a playhead outline on the current column', results);
    let advanced = false;
    for (let i = 0; i < 40; i++) {
      await wait(50);
      const cell = $('#melody-grid .step.current');
      if (cell && cell.dataset.step !== outlined && getComputedStyle(cell).boxShadow.includes('inset')) { advanced = true; break; }
    }
    check(advanced, 'Tunes playhead moves to the next visible column', results);
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

export async function runLessonAudioChecks() {
  const results = [], steps = [], states = [], errors = [];
  const song = blankTutorialSong(createSong()); song.drums[0][0] = true;
  const engine = new AudioEngine(() => tutorialPlaybackSong(song, 'beat'), step => steps.push(step), state => states.push(state), error => errors.push(error));
  try {
    await engine.start({ steps: 4, cycles: 2 });
    for (let i = 0; i < 85 && engine.playing; i++) await wait(50);
    check(errors.length === 0 && states.includes('playing') && states.at(-1) === 'stopped', 'musical reward starts real Web Audio and ends automatically', results);
    check(same(steps.filter(step => step >= 0), [0, 1, 2, 3, 0, 1, 2, 3]), 'reward playback visits only its four highlighted steps for the requested cycles', results);
    check(!engine.playing && engine.visuals.size === 0 && engine.voices.size === 0, 'a completed reward leaves no scheduled sound or highlight', results);
    await engine.start({ steps: 4, cycles: 4 }); await wait(60);
    engine.stop(); const count = steps.length;
    await wait(220);
    check(steps.length === count && !engine.playing && engine.visuals.size === 0 && engine.voices.size === 0, 'leaving a musical reward cancels sound and stale visual callbacks', results);
  } finally { engine.stop(); await engine.context?.close(); }
  return results;
}

export async function runThemeChecks() {
  const results = [], original = document.documentElement.dataset.theme;
  const stored = localStorage.getItem('loop-club.theme.v1'), song = localStorage.getItem(SAVE_KEY);
  try {
    $('#theme-open').click();
    check($('#theme-dialog').open && document.querySelectorAll('[data-theme-choice]').length === 5, 'Look opens five pictured theme choices', results);
    const colours = new Set();
    const luminance = hex => {
      const rgb = hex.trim().replace('#', '').match(/../g).map(c => parseInt(c, 16) / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    };
    const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
    for (const id of ['sunny', 'pink', 'space', 'dino', 'race']) {
      const choice = $(`[data-theme-choice="${id}"]`); choice.click();
      const palette = getComputedStyle(document.documentElement);
      colours.add(palette.getPropertyValue('--paper').trim());
      check(document.documentElement.dataset.theme === id && localStorage.getItem('loop-club.theme.v1') === id && choice.getAttribute('aria-pressed') === 'true', `${id}: the chosen theme applies, saves and shows its selected mark`, results);
      check(document.querySelectorAll('[data-theme-choice][aria-pressed="true"]').length === 1 && choice.querySelector('.theme-picture').textContent.trim(), `${id}: one pictured choice is selected`, results);
      check(palette.colorScheme === (id === 'space' ? 'dark' : 'light'), `${id}: browser controls use the correct light or dark scheme`, results);
      check(localStorage.getItem(SAVE_KEY) === song, `${id}: changing the look leaves the saved music untouched`, results);
      const rgbLuminance = colour => {
        const channels = colour.match(/[\d.]+/g).slice(0,3).map(Number).map(c=>c/255).map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4);
        return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
      };
      for (const section of ['drums','melody','sound']) {
        $(`#tab-${section}`).click();
        const tab = getComputedStyle($(`#tab-${section}`));
        const a = rgbLuminance(tab.color), b = rgbLuminance(tab.backgroundColor);
        check((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5, `${id} ${section}: selected tab text and icon contrast exceeds 4.5`,results);
      }
      const colour = name => palette.getPropertyValue(name).trim();
      check(contrast(colour('--ink'), colour('--surface')) >= 4.5 && contrast(colour('--muted'), colour('--paper')) >= 4.5 && contrast(colour('--action-ink'), colour('--action')) >= 4.5, `${id}: main text, quiet labels and action buttons retain readable contrast`, results);
    }
    check(colours.size === 5, 'all five themes have distinct page palettes', results);
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('Storage unavailable'); };
    try { $('[data-theme-choice="pink"]').click(); check(document.documentElement.dataset.theme === 'pink', 'looks still work when storage is unavailable', results); }
    finally { Storage.prototype.setItem = write; }
    $('#theme-done').click(); await wait(40);
    check(!$('#theme-dialog').open && document.activeElement === $('#theme-open'), 'Done closes the picker and returns focus to Look', results);
  } finally {
    if (!$('#theme-dialog').open) $('#theme-open').click();
    $(`[data-theme-choice="${original || 'sunny'}"]`).click(); $('#theme-done').click(); await wait(40);
    if (stored === null) localStorage.removeItem('loop-club.theme.v1'); else localStorage.setItem('loop-club.theme.v1', stored);
  }
  return results;
}

export async function runThemeLayoutChecks() {
  const results = [], original = document.documentElement.dataset.theme;
  const stored = localStorage.getItem('loop-club.theme.v1');
  try {
    for (const id of ['sunny', 'pink', 'space', 'dino', 'race']) {
      $('#theme-open').click(); $(`[data-theme-choice="${id}"]`).click();
      const picker = $('#theme-dialog').getBoundingClientRect();
      check(picker.left >= 0 && picker.right <= innerWidth && picker.top >= 0 && picker.bottom <= innerHeight, `${id}: theme picker stays on screen`, results);
      $('#theme-done').click(); await wait(40);
      results.push(...runLayoutChecks(), ...runReadingChecks());
    }
  } finally {
    if (!$('#theme-dialog').open) $('#theme-open').click();
    $(`[data-theme-choice="${original || 'sunny'}"]`).click(); $('#theme-done').click(); await wait(40);
    if (stored === null) localStorage.removeItem('loop-club.theme.v1'); else localStorage.setItem('loop-club.theme.v1', stored);
  }
  return results;
}

export async function runLoopSizeChecks() {
  const results = [], original = localStorage.getItem(SAVE_KEY);
  const descriptor = Object.getOwnPropertyDescriptor(navigator, 'getGamepads');
  let pad = null;
  const press = async button => {
    pad = { connected: true, mapping: 'standard', id: 'Xbox loop fixture', index: 0, axes: [0,0,0,0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === button, value: i === button ? 1 : 0 })) };
    await wait(60); pad = { ...pad, buttons: pad.buttons.map(() => ({ pressed: false, value: 0 })) }; await wait(60);
  };
  const columns = () => document.querySelectorAll('#drum-grid .step').length / 4;
  try {
    if ($('#play').getAttribute('aria-pressed') === 'true') $('#play').click();
    $('[data-preset="club"]').click(); $('#reset').click(); $('[data-loop-bars="1"]').click(); $('#tab-drums').click();
    const small = readSong();
    check(small.melody.length === 4 && columns() === 4, 'Small shows exactly four beat boxes per row', results);
    const smallWidth = $('#drum-grid .step').getBoundingClientRect().width;
    for (const bars of [2,4]) {
      $(`[data-loop-bars="${bars}"]`).click();
      check(readSong().bars === bars && readSong().melody.length === bars * 4, `${bars} bars: loop contains four beats per bar`, results);
      check(same(readSong().melody.slice(4,8), small.melody), `${bars} bars: new bars begin with the original pattern`, results);
    }
    const largeColumns = columns();
    check(largeColumns >= 4 && largeColumns <= 16 && $('#drum-grid .step').getBoundingClientRect().width <= smallWidth, 'larger loops use more columns where there is room; Small pads fill the available width', results);
    $(`[data-page="${Math.floor(12 / largeColumns)}"]`)?.click();
    check($('#drum-grid [data-step="12"]'), 'bar four opens editable beats 13 onward', results);
    const before = readSong();
    $('[data-drum="0"][data-step="12"]').click();
    check(readSong().drums[0][12] !== before.drums[0][12] && readSong().drums[0][0] === before.drums[0][0], 'editing the last bar leaves the first bar alone', results);
    $('#tab-melody').click(); $('[data-note="5"][data-step="12"]').click();
    check(!same(readSong().melody[12],before.melody[12]) && same(readSong().melody[0],before.melody[0]), 'chords in the last bar edit independently and save', results);
    const large = readSong(); $('[data-loop-bars="1"]').click();
    check(readSong().bars === 1 && document.querySelectorAll('#page-picker button').length === 1 && $('#melody-grid [data-step="0"]'), 'shrinking from a late bar returns to the one-bar grid', results);
    check(columns() === 4 && [...document.querySelectorAll('.sequence-grid [data-step], #loop-lights [data-step]')].every(cell => Number(cell.dataset.step) < 4), 'Small renders only four beats with no leftover boxes or lights', results);
    $('#undo').click(); check(same(readSong(),large) && $('[data-loop-bars="4"]').getAttribute('aria-pressed') === 'true', 'Undo restores removed bars, chords and the size choice', results);
    $('[data-preset="pixel"]').click(); $('#reset').click();
    check(readSong().bars === 4 && readSong().melody.length === 16, 'the Game preset loads its authored size and Start over keeps that size', results);
    $('#tab-drums').click(); $('[data-page="0"]')?.click();
    const tempo = $('#tempo'); tempo.value = 300; tempo.dispatchEvent(new Event('input',{bubbles:true}));
    $('#play').click(); await wait(950);
    check(Number($('.loop-light.current')?.dataset.step) >= 4 && $('#drum-grid [data-step="0"]'), 'playback reaches the next bar while leaving the chosen editing page stable', results);
    $('[data-loop-bars="2"]').click(); await wait(120);
    check($('#play').getAttribute('aria-pressed') === 'true' && readSong().bars === 2, 'resizing during playback restarts safely at the new length', results);
    $('#undo').click(); await wait(120);
    check($('#play').getAttribute('aria-pressed') === 'true' && readSong().bars === 4, 'Undoing a playing resize resumes the restored loop', results);
    $('#play').click();
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>pad?[pad]:[]});
    $('[data-loop-bars="2"]').focus(); await press(0);
    check(readSong().bars === 2, 'Xbox A selects a loop size', results);
    $('[data-page="0"]')?.click();
    $('#drum-grid [data-drum="0"][data-step="3"]').focus(); await press(15);
    check(document.activeElement.dataset.step === '4', 'D-pad crosses from the last beat of bar one into bar two', results);
    pad = null; await wait(60);
    const saved = localStorage.getItem(SAVE_KEY); $('#tutorial-start').click(); $('#tutorial-exit').click();
    check(localStorage.getItem(SAVE_KEY) === saved && $('[data-loop-bars="2"]').getAttribute('aria-pressed') === 'true', 'leaving the tutorial restores the longer song and loop size', results);
    for (const bars of [1,2,4]) {
      const song = editSong(createSong(), {type:'bars',value:bars}); song.tempo = 600;
      const visited = [], errors = [];
      const engine = new AudioEngine(()=>song,step=>{if(step>=0)visited.push(step);},()=>{},error=>errors.push(error)); engine.setVolume(0);
      try {
        await engine.start({cycles:1}); await wait(bars*400+180);
        check(!errors.length && !engine.playing && same(visited,Array.from({length:bars*4},(_,i)=>i)), `${bars} bars: actual audio engine visits every beat once at the selected BPM and stops cleanly`, results);
      } finally {engine.stop(); await engine.context?.close();}
    }
  } finally {
    pad = null;
    if (descriptor) Object.defineProperty(navigator,'getGamepads',descriptor); else delete navigator.getGamepads;
    if ($('#play').getAttribute('aria-pressed') === 'true') $('#play').click();
    $('[data-loop-bars="1"]').click(); $('[data-preset="breaks"]').click(); $('#reset').click(); $('#tab-drums').click(); $('[data-page="0"]')?.click();
    if(original===null)localStorage.removeItem(SAVE_KEY); else localStorage.setItem(SAVE_KEY,original);
  }
  return results;
}

export function runMapAndVolumeChecks() {
  const results = [], old = $('[data-loop-bars][aria-pressed="true"]').dataset.loopBars;
  check([1,2,4].every(n=>document.querySelectorAll(`[data-loop-bars="${n}"] .loop-size-dots i`).length===n*4) && [...document.querySelectorAll('[data-loop-bars]')].every(b=>!b.innerText.includes('bar') && b.getAttribute('aria-label').includes('beats')), 'size choices show four, eight and sixteen pills with accessible beat counts',results);
  try {
    $('[data-loop-bars="4"]').click(); $('#tab-drums').click();
    const map = $('.loop-map'), picker = $('#page-picker');
    check(map.contains(picker) && !$('#pattern-controls').contains(picker), 'page controls are on the loop map beneath the grid',results);
    const pages = [...picker.querySelectorAll('button')];
    pages.at(-1).click();
    check(pages.length === 16 / (document.querySelectorAll('#drum-grid .step').length/4) && document.querySelectorAll('#page-picker [aria-pressed="true"]').length === 1, 'the map highlights exactly the visible part of the loop',results);
    check([...document.querySelectorAll('#page-picker button')].every(button=>{const r=button.getBoundingClientRect(),m=map.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.left>=m.left&&r.right<=m.right+.1;}), 'every highlighted map section is a large target inside the loop map',results);
    check($('.loop-light .map-dot.on') && document.querySelectorAll('.loop-light .map-dot').length===16*5, 'the map shows a miniature of drum and tune hits',results);
    const volume = $('.volume-section'), row = volume.getBoundingClientRect(), transport = $('.transport').getBoundingClientRect(), ruler = $('.beat-ruler').getBoundingClientRect();
    check(row.top>=ruler.bottom && row.bottom<=transport.top+.1 && volume.contains($('#volume')) && !$('.transport').contains($('#volume')), 'the standalone volume row sits between the loop map and playback controls',results);
    check(!volume.textContent.trim() && volume.querySelector('svg') && $('#volume').getAttribute('aria-label')==='Volume', 'volume has a speaker, no visible text and an accessible name',results);
    check($('#volume').getBoundingClientRect().width>=row.width*.65 && $('#volume').getBoundingClientRect().height>=60, 'volume uses a wide, large slider',results);
    const prior = $('#volume').value;
    $('#volume').value=23;$('#volume').dispatchEvent(new Event('input',{bubbles:true}));
    check($('#volume').value==='23','the moved volume slider still accepts input',results);
    $('#volume').value=prior;$('#volume').dispatchEvent(new Event('input',{bubbles:true}));
  } finally { $(`[data-loop-bars="${old}"]`).click(); $('[data-page="0"]')?.click(); }
  return results;
}

export async function runMuteChecks() {
  const results = [], button = $('#mute'), slider = $('#volume');
  check(button?.tagName === 'BUTTON', 'the speaker is an accessible mute button', results);
  const original = slider.value, saved = localStorage.getItem(SAVE_KEY);
  const set = value => { slider.value=value;slider.dispatchEvent(new Event('input',{bubbles:true})); };
  const descriptor=Object.getOwnPropertyDescriptor(navigator,'getGamepads');
  const gainCalls=[], schedule=AudioParam.prototype.setTargetAtTime;
  AudioParam.prototype.setTargetAtTime=function(value,...args){gainCalls.push(value);return schedule.call(this,value,...args);};
  let pad=null;
  try {
    set(37);button.click();
    check(slider.value==='0' && button.getAttribute('aria-pressed')==='true' && button.getAttribute('aria-label')==='Restore volume' && button.querySelector('use').getAttribute('href')==='#i-muted', 'mute sets zero volume and shows a crossed speaker with restore action',results);
    button.click();
    check(slider.value==='37' && button.getAttribute('aria-pressed')==='false' && button.getAttribute('aria-label')==='Mute', 'a second press restores the previous volume',results);
    set(12);set(0);button.click();
    check(slider.value==='12', 'restoring after dragging to zero remembers the last nonzero level',results);
    button.click();set(21);
    check(button.getAttribute('aria-pressed')==='false' && button.querySelector('use').getAttribute('href')==='#i-volume', 'raising the slider unmutes and restores the speaker icon',results);
    const wasPlaying=$('#play').getAttribute('aria-pressed')==='true';
    if(!wasPlaying)$('#play').click();await wait(120);button.click();
    check($('#play').getAttribute('aria-pressed')==='true' && slider.value==='0','muting leaves the loop running',results);
    button.click();
    check(gainCalls.includes(0) && gainCalls.some(value=>Math.abs(value-0.21*0.65)<1e-6), 'mute and restore update the actual Web Audio master gain',results);
    if(!wasPlaying)$('#play').click();
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>pad?[pad]:[]});
    button.focus();
    pad={connected:true,mapping:'standard',index:0,id:'Xbox mute fixture',axes:[0,0,0,0],buttons:Array.from({length:17},(_,i)=>({pressed:i===0,value:i===0?1:0}))};
    await wait(500);
    check(slider.value==='0' && document.activeElement===button, 'held Xbox A toggles mute only once and keeps speaker focus',results);
    pad=null;await wait(70);
    check(localStorage.getItem(SAVE_KEY)===saved,'mute and restore leave the saved music unchanged',results);
  } finally {
    pad=null;AudioParam.prototype.setTargetAtTime=schedule;if(descriptor)Object.defineProperty(navigator,'getGamepads',descriptor);else delete navigator.getGamepads;
    set(original);
  }
  return results;
}

export async function runBrushChecks() {
  const results=[], stored=localStorage.getItem(SAVE_KEY);
  const descriptor=Object.getOwnPropertyDescriptor(navigator,'getGamepads');let pad=null;
  const tap=async()=>{
    pad={connected:true,mapping:'standard',id:'Xbox brush fixture',index:0,axes:[0,0,0,0],buttons:Array.from({length:17},(_,i)=>({pressed:i===0,value:i===0?1:0}))};
    await wait(70);pad=null;await wait(70);
  };
  try {
    if($('#play').getAttribute('aria-pressed')==='true')$('#play').click();
    $('[data-loop-bars="1"]').click();$('[data-preset="club"]').click();$('[data-preset="breaks"]').click();$('#reset').click();$('#tab-melody').click();
    const original=readSong(), cell=$('[data-note="3"][data-step="0"]');
    $('[data-synth-choice="arcade"]').click();
    check(same(readSong().noteSounds,original.noteSounds),'choosing a brush leaves painted instruments unchanged',results);
    cell.click();
    check(readSong().noteSounds[0][3]==='arcade'&&readSong().noteSounds[0][0]==='bass'&&cell.dataset.instrument==='arcade'&&cell.querySelector('use').getAttribute('href')==='#i-robot','Game paints a robot at G1 beside the existing bass note',results);
    $('[data-synth-choice="bell"]').click();cell.click();
    check(same(readSong().melody[0],[0,3])&&readSong().noteSounds[0][3]==='bell'&&cell.querySelectorAll('svg').length===1&&cell.querySelector('use').getAttribute('href')==='#i-bell','a different brush replaces one box with one instrument',results);
    $('#undo').click();check(readSong().noteSounds[0][3]==='arcade'&&cell.dataset.instrument==='arcade','Undo restores the previous painted sound and icon',results);
    $('[data-synth-choice="arcade"]').click();cell.click();
    check(!readSong().melody[0].includes(3)&&readSong().noteSounds[0][3]===null&&!cell.children.length,'the same brush clears its own painted box',results);
    $('[data-synth-choice="pluck"]').click();
    cell.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:5}));cell.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:5}));cell.click();
    check(readSong().noteSounds[0][3]==='pluck'&&cell.querySelector('use').getAttribute('href')==='#i-notes','touch painting puts the selected instrument icon in the box',results);
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>pad?[pad]:[]});
    $('[data-synth-choice="bell"]').focus();await tap();cell.focus();await tap();
    check(readSong().noteSounds[0][3]==='bell'&&readSong().noteSounds[0][0]==='bass','Xbox selects a brush and paints a box without replacing its chord neighbour',results);
    const painted=readSong();$('[data-loop-bars="4"]').click();
    check(readSong().noteSounds[4][3]==='bell','growing a loop copies painted instruments with the notes',results);
    $('[data-loop-bars="1"]').click();
    check(same(readSong().noteSounds,painted.noteSounds),'shrinking preserves instruments in retained bars',results);
    const settings={brightness:80,length:65,wobble:0}, notes=[0,3,5], instruments=['bass',null,null,'arcade',null,'bell'];
    const mixed=await render((ctx,out)=>synthChord(ctx,out,notes,.04,settings,164,'bass',instruments));
    const solos=[];for(const pitch of notes)solos.push(await render((ctx,out)=>synthVoice(ctx,out,pitch,.04,settings,164,instruments[pitch])));
    const expected=mixed.map((_,i)=>solos.reduce((sum,samples)=>sum+samples[i],0)/Math.sqrt(notes.length));
    check(mixed.every((value,i)=>Math.abs(value-expected[i])<.00001),'a mixed-instrument chord renders the exact normalized sum of its three painted voices',results);
    const homogeneous=await render((ctx,out)=>synthChord(ctx,out,notes,.04,settings,164,'bass'));
    check(mixed.some((value,i)=>Math.abs(value-homogeneous[i])>.01),'mixed painting audibly changes the waveform from a single-instrument chord',results);
    const song=editSong(editSong(createSong(),{type:'synth',value:'arcade'}),{type:'note',step:0,note:3});
    const types=[], engine=new AudioEngine(()=>song,()=>{},()=>{},error=>{throw new Error(error)});
    engine.ensureGraph();const oscillator=engine.context.createOscillator.bind(engine.context);
    engine.context.createOscillator=()=>{const node=oscillator();types.push(node);return node;};engine.setVolume(0);
    try {
      await engine.audition('chord',song.melody[0],song.noteSounds[0]);await wait(30);
      check(types.some(node=>node.type==='sawtooth')&&types.some(node=>node.type==='square'),'stopped chord preview uses both painted instrument types',results);
      engine.stop();types.length=0;await engine.start();await wait(90);
      check(types.some(node=>node.type==='sawtooth')&&types.some(node=>node.type==='square'),'scheduled loop playback uses both painted instrument types',results);
    } finally {engine.stop();await engine.context.close();}
  } finally {
    pad=null;if(descriptor)Object.defineProperty(navigator,'getGamepads',descriptor);else delete navigator.getGamepads;
    if($('#play').getAttribute('aria-pressed')==='true')$('#play').click();
    $('[data-loop-bars="1"]').click();$('[data-preset="club"]').click();$('[data-preset="breaks"]').click();$('#reset').click();$('#tab-drums').click();
    if(stored===null)localStorage.removeItem(SAVE_KEY);else localStorage.setItem(SAVE_KEY,stored);
  }
  return results;
}

export async function runTutorialThemeChecks() {
  const results = [], original = document.documentElement.dataset.theme;
  const fixture = document.createElement('figure');
  fixture.className = 'tutorial-picture'; document.body.append(fixture);
  const colour = value => { const node = document.createElement('span'); node.style.color = value; document.body.append(node); const result = getComputedStyle(node).color; node.remove(); return result; };
  try {
    for (const theme of ['sunny', 'pink', 'space', 'dino', 'race']) {
      document.documentElement.dataset.theme = theme;
      const palette = getComputedStyle(document.documentElement);
      for (const kind of ['beat', 'notes', 'chord']) {
        fixture.innerHTML = tutorialPicture(kind, createSong('cloud'), 0);
        const current = fixture.querySelector('.tutorial-pill.current');
        check(current && getComputedStyle(current).stroke === colour(palette.getPropertyValue('--playhead')), `${theme} ${kind}: tutorial playback outline matches sequencer`, results);
        const pills = [...fixture.querySelectorAll('.tutorial-pill')];
        check(pills.length && pills.every(pill => {
          const row = getComputedStyle(pill).getPropertyValue('--row-color').trim();
          return getComputedStyle(pill).fill === colour(pill.classList.contains('on') ? row : `color-mix(in srgb, ${row} 13%, ${palette.getPropertyValue('--control')})`);
        }), `${theme} ${kind}: lit and resting tutorial pills use sequencer row colours and themed surfaces`, results);
      }
      check(getComputedStyle(fixture.querySelector('.tutorial-chord')).stroke === colour(palette.getPropertyValue('--playhead')), `${theme}: chord stack outline follows theme`, results);
      fixture.innerHTML = tutorialPicture('wave', createSong());
      check(getComputedStyle(fixture.querySelector('.tutorial-wave')).stroke === colour(palette.getPropertyValue('--wave')) && getComputedStyle(fixture.querySelector('.tutorial-axis')).stroke === colour(palette.getPropertyValue('--border')), `${theme}: tutorial wave and axis follow theme`, results);
    }
  } finally { fixture.remove(); if (original) document.documentElement.dataset.theme = original; else delete document.documentElement.dataset.theme; }
  return results;
}
