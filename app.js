import { createSong, editSong, clearSong, restoreSong, SongHistory, NOTES, STEPS, SAVE_KEY, DRUM_TRACKS, DRUM_COLORS, DRUM_SOUNDS, SYNTH_SOUNDS, PRESETS } from './model.js?v=24';
import { AudioEngine, normaliseVisualDelay } from './audio.js?v=24';
import { GamepadReader } from './gamepad.js?v=24';
import { ZachTutorial, TutorialSpeech, blankTutorialSong, tutorialPlaybackSong, tutorialPlayer } from './tutorial.js?v=24';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const sections = ['drums', 'melody', 'sound'];
const player = tutorialPlayer(location.search);
const helpLabel = player ? `Help ${player === 'zach' ? 'Zach' : 'Marcie'}` : 'Help';
$('#tutorial-start').innerHTML = `${helpLabel} <span aria-hidden="true">▶</span>`;
$('#tutorial-card').setAttribute('aria-label', helpLabel);
const songIcons = { breaks: 'jump', roller: 'skate', acid: 'ant', cloud: 'cloud' };
const songNames = { breaks: 'Jump', club: 'Robot', float: 'Moon', liquid: 'River', roller: 'Skate', acid: 'Ants', disco: 'Dance', pixel: 'Game', cloud: 'Cloud' };
const THEME_KEY = 'loop-club.theme.v1';
const THEMES = {
  sunny: { name: 'Sunny', icon: '☀️', colour: '#fff8e9' },
  pink: { name: 'Pink', icon: '🌸', colour: '#fff0f6' },
  space: { name: 'Space', icon: '🚀', colour: '#10182e' },
  dino: { name: 'Dino', icon: '🦕', colour: '#eef7d9' },
  race: { name: 'Race', icon: '🏎️', colour: '#ecf4ff' }
};
const playerThemeKey = player ? `${THEME_KEY}.${player}` : THEME_KEY;
let theme = player === 'zach' ? 'race' : player === 'marcie' ? 'pink' : 'sunny';
try { const stored = localStorage.getItem(playerThemeKey); if (Object.hasOwn(THEMES, stored)) theme = stored; } catch { /* Looks still work without storage. */ }
function applyTheme(id, persist = true) {
  if (!Object.hasOwn(THEMES, id)) return;
  theme = id; document.documentElement.dataset.theme = id;
  document.querySelector('meta[name="theme-color"]').content = THEMES[id].colour;
  $('#theme-symbol').textContent = THEMES[id].icon;
  $('#theme-mascot').textContent = THEMES[id].icon;
  $$('[data-theme-choice]').forEach(button => button.setAttribute('aria-pressed', button.dataset.themeChoice === id));
  if (persist) { try { localStorage.setItem(playerThemeKey, id); } catch { /* Keep the chosen look for this visit. */ } }
}
for (const [id, look] of Object.entries(THEMES)) {
  const button = document.createElement('button');
  button.dataset.themeChoice = id; button.type = 'button';
  button.innerHTML = `<span class="theme-picture" aria-hidden="true">${look.icon}</span><span>${look.name}</span><span class="theme-picked" aria-hidden="true">✓</span>`;
  button.addEventListener('click', () => applyTheme(id));
  $('#theme-choices').append(button);
}
applyTheme(theme, false);
let saved = null, invalidSave = false;
try {
  const raw = localStorage.getItem(SAVE_KEY);
  saved = restoreSong(raw);
  invalidSave = raw !== null && saved === null;
} catch { /* Saving remains optional; the instrument can still play. */ }
let history = new SongHistory(saved || createSong());
let section = 'drums', page = 0, visibleSteps = stepCount();
let renderedSteps = 0;
let currentStep = -1, controllerMode = false, connectedPad = null;
let messageTimer, previewTimer, groupTimer;
const reader = new GamepadReader();
let tutorial = null, originalHistory = null, lessonPreview = null;
const syncSong = clearSong(createSong()); syncSong.tempo = 120; syncSong.drums[0].fill(true); syncSong.drumSounds[0] = 'cowbell';
let syncTesting = false, syncFlashTimer = null;
const engine = new AudioEngine(() => syncTesting ? syncSong : lessonPreview ? tutorialPlaybackSong(history.song, lessonPreview) : history.song, showStep, showPlayback, message);

const SYNC_KEY = 'loop-club.visual-delay.v1';
let visualDelay = 0;
try { visualDelay = normaliseVisualDelay(Number(localStorage.getItem(SYNC_KEY))); } catch { /* Optional local preference. */ }
function applyVisualDelay(value, save = true) {
  visualDelay = normaliseVisualDelay(value); engine.setVisualDelay(visualDelay);
  $('#visual-delay').value = visualDelay; updateRange($('#visual-delay')); $('#visual-delay').setAttribute('aria-valuetext', `${visualDelay} milliseconds`); $('#sync-value').textContent = `${visualDelay} ms`;
  if (save) { try { localStorage.setItem(SYNC_KEY, String(visualDelay)); $('#sync-status').textContent = 'Saved on this browser.'; } catch { $('#sync-status').textContent = 'Used for this visit. Saving is unavailable.'; } }
}
applyVisualDelay(visualDelay, false);
$('#visual-delay').addEventListener('input', event => applyVisualDelay(Number(event.target.value)));
$('#sync-reset').addEventListener('click', () => applyVisualDelay(0));
$('#sync-test').addEventListener('click', () => {
  if (syncTesting) { engine.stop(); return; }
  engine.stop(); syncTesting = true;
  $('#sync-test').textContent = 'Stop test'; $('#sync-test').setAttribute('aria-pressed', 'true');
  engine.start({ steps: 4 });
});

function message(text) {
  clearTimeout(messageTimer);
  $('#message').textContent = text;
  $('#message').hidden = false;
  messageTimer = setTimeout(() => { $('#message').hidden = true; }, 6500);
}

function saveSong() {
  if (tutorial?.active) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(history.song));
    $('#save-status span').textContent = 'Saved';
  } catch {
    $('#save-status span').textContent = 'Not saved';
  }
}

function commit(next) {
  const resized = next.melody.length !== history.song.melody.length;
  const resume = resized && (engine.playing || engine.pending), previewKind = lessonPreview;
  if (resized) { if (lessonPreview) stopLessonPreview(); else engine.stop(); }
  if (!history.commit(next)) return;
  saveSong(); updateSong();
  if (resume) { if (previewKind) playLessonPreview(previewKind, true); else engine.start(); }
}

function undo() {
  if (!history.canUndo) return;
  const previousSteps = history.song.melody.length;
  const wasPlaying = engine.playing || engine.pending;
  history.undo(); saveSong(); updateSong();
  if (previousSteps !== history.song.melody.length) { engine.stop(); if (wasPlaying) engine.start(); }
  message('Try again!');
  if (document.activeElement === $('#undo') && $('#undo').disabled) focusControl($(`#tab-${section}`));
}

function stepCount() {
  const capacity = matchMedia('(max-width: 559px)').matches ? 4 : matchMedia('(max-width: 1249px)').matches ? 8 : 16;
  return Math.min(capacity, history.song.melody.length);
}

function focusControl(element) {
  if (!element) return;
  $$('.controller-focus').forEach(node => node.classList.remove('controller-focus'));
  element.focus({ preventScroll: true });
  if (controllerMode) element.classList.add('controller-focus');
  const rect = element.getBoundingClientRect();
  if (rect.top < 8 || rect.bottom > innerHeight - 8) element.scrollIntoView({ block: 'center', behavior: 'instant' });
}

function numberRow(root) {
  root.append(document.createElement('span'));
  for (let i = page * visibleSteps; i < (page + 1) * visibleSteps; i++) {
    const label = document.createElement('span');
    label.className = 'step-number' + (i % 4 === 0 ? ' beat-start' : '');
    label.dataset.step = i;
    label.textContent = i % STEPS + 1;
    root.append(label);
  }
}

function gridMetadata(button, row, col) {
  button.dataset.gridRow = row; button.dataset.gridCol = col;
}

function flash(element) {
  element.classList.add('sounding');
  setTimeout(() => element.classList.remove('sounding'), 180);
}

function buildGrids() {
  renderedSteps = history.song.melody.length;
  const firstStep = page * visibleSteps;
  visibleSteps = stepCount();
  page = Math.floor(Math.min(firstStep, renderedSteps - 1) / visibleSteps);
  $$('.sequence-grid').forEach(grid => grid.style.setProperty('--visible-steps', visibleSteps));
  const drumGrid = $('#drum-grid'), melodyGrid = $('#melody-grid');
  drumGrid.replaceChildren(); melodyGrid.replaceChildren();
  numberRow(drumGrid); numberRow(melodyGrid);
  for (let row = 0; row < DRUM_TRACKS; row++) {
    const drum = DRUM_SOUNDS[history.song.drumSounds[row]];
    const color = DRUM_COLORS[row];
    const pad = document.createElement('button');
    pad.className = 'drum-pad'; pad.style.setProperty('--row-color', color);
    pad.dataset.drumPad = row;
    pad.innerHTML = `${icon(drum.icon)}<span>${drum.name}</span>`;
    pad.setAttribute('aria-label', `Play ${drum.name}`);
    gridMetadata(pad, row, -1);
    pad.addEventListener('click', () => { flash(pad); engine.audition('drum', row); });
    drumGrid.append(pad);
    for (let col = 0; col < visibleSteps; col++) {
      const step = page * visibleSteps + col;
      const button = document.createElement('button');
      button.className = 'step' + (step % 4 === 0 ? ' beat-start' : '');
      button.style.setProperty('--row-color', color);
      button.dataset.step = step; button.dataset.drum = row;
      gridMetadata(button, row, col);
      button.setAttribute('aria-label', `${drum.name}, step ${step + 1}`);
      button.addEventListener('click', () => {
        commit(editSong(history.song, { type: 'drum', row, step }));
        if ((!engine.playing || tutorial?.active) && history.song.drums[row][step]) engine.audition('drum', row);
      });
      drumGrid.append(button);
    }
  }
  [...NOTES].reverse().forEach((note, row) => {
    const pitch = NOTES.length - 1 - row;
    const key = document.createElement('button');
    key.className = 'note-key'; key.style.setProperty('--row-color', note.color);
    key.innerHTML = `<span class="key-dot" aria-hidden="true"></span>${note.name}`;
    key.setAttribute('aria-label', `Play ${note.name}${pitch === 5 ? ', high' : ''}`);
    gridMetadata(key, row, -1);
    key.addEventListener('click', () => { flash(key); engine.audition('note', pitch); });
    melodyGrid.append(key);
    for (let col = 0; col < visibleSteps; col++) {
      const step = page * visibleSteps + col;
      const button = document.createElement('button');
      button.className = 'step' + (step % 4 === 0 ? ' beat-start' : '');
      button.style.setProperty('--row-color', note.color);
      button.dataset.step = step; button.dataset.note = pitch;
      gridMetadata(button, row, col);
      button.setAttribute('aria-label', `${note.name}, step ${step + 1}`);
      button.addEventListener('click', () => {
        commit(editSong(history.song, { type: 'note', step, note: pitch }));
        if (!engine.playing || tutorial?.active) engine.audition('chord', history.song.melody[step], history.song.noteSounds[step]);
      });
      melodyGrid.append(button);
    }
  });
  const picker = $('#page-picker'); picker.replaceChildren();
  picker.style.gridTemplateColumns = `repeat(${renderedSteps / visibleSteps}, minmax(0, 1fr))`;
  for (let p = 0; p < renderedSteps / visibleSteps; p++) {
    const firstBar = p * visibleSteps / STEPS + 1, lastBar = (p + 1) * visibleSteps / STEPS;
    const button = document.createElement('button');
    button.textContent = firstBar === lastBar ? `Bar ${firstBar}` : `Bars ${firstBar}–${lastBar}`;
    button.setAttribute('aria-label', button.textContent);
    button.setAttribute('aria-pressed', p === page);
    button.dataset.page = p;
    button.addEventListener('click', () => {
      changePage(p); focusControl($(`[data-page="${p}"]`));
    });
    picker.append(button);
  }
  $('#loop-lights').replaceChildren();
  $('#loop-lights').style.gridTemplateColumns = `repeat(${renderedSteps}, 1fr)`;
  for (let step = 0; step < renderedSteps; step++) {
    const light = document.createElement('i'); light.className = 'loop-light'; light.dataset.step = step;
    for (let row = 0; row < DRUM_TRACKS + 1; row++) {
      const dot = document.createElement('span'); dot.className = 'map-dot';
      dot.style.setProperty('--map-color', DRUM_COLORS[row] || '#b7a8e7'); light.append(dot);
    }
    $('#loop-lights').append(light);
  }
  updateSong(); showStep(currentStep);
}

function changePage(nextPage) {
  page = Math.max(0, Math.min(history.song.melody.length / visibleSteps - 1, nextPage));
  buildGrids();
}

function setSection(next, focusTab = false) {
  section = next;
  history.end();
  $$('[data-tab]').forEach(button => {
    const selected = button.dataset.tab === section;
    button.setAttribute('aria-selected', selected);
    button.tabIndex = selected ? 0 : -1;
  });
  sections.forEach(name => { $(`#panel-${name}`).hidden = name !== section; });
  $('#synth-picker').hidden = section === 'drums';
  const titles = {
    drums: ['Tap a box.', 'Make a beat!'],
    melody: ['Paint a tune.', 'Pick a sound. Tap a box.'],
    sound: ['Try a sound.', 'Slide and listen.']
  };
  $('#workspace-title').textContent = titles[section][0];
  $('#workspace-hint').textContent = titles[section][1];
  if (focusTab) focusControl($(`#tab-${section}`));
}

function updateRange(input) {
  input.style.setProperty('--fill', `${(Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`);
}

function updateSong() {
  const song = history.song;
  if (renderedSteps !== song.melody.length || visibleSteps !== stepCount()) { buildGrids(); return; }
  $$('[data-loop-bars]').forEach(button => button.setAttribute('aria-pressed', Number(button.dataset.loopBars) === song.bars));
  $$('[data-preset]').forEach(button => button.setAttribute('aria-pressed', button.dataset.preset === song.preset));
  $$('[data-drum]').forEach(button => button.setAttribute('aria-pressed', song.drums[button.dataset.drum][button.dataset.step]));
  $$('[data-drum-pad]').forEach(pad => {
    const row = Number(pad.dataset.drumPad), drum = DRUM_SOUNDS[song.drumSounds[row]];
    pad.innerHTML = `${icon(drum.icon)}<span>${drum.name}</span>`;
    pad.setAttribute('aria-label', `Play ${drum.name}, drum ${row + 1}`);
  });
  $$('[data-drum]').forEach(button => button.setAttribute('aria-label', `${DRUM_SOUNDS[song.drumSounds[button.dataset.drum]].name}, drum ${Number(button.dataset.drum) + 1}, bar ${Math.floor(Number(button.dataset.step) / STEPS) + 1}, step ${Number(button.dataset.step) % STEPS + 1}`));
  $$('[data-drum-choice]').forEach(button => {
    const row = Number(button.dataset.drumChoice), drum = DRUM_SOUNDS[song.drumSounds[row]];
    button.innerHTML = `${icon(drum.icon)}<span><small>${row + 1}</small>${drum.name}</span><span class="switch-icon" aria-hidden="true">↻</span>`;
    button.setAttribute('aria-label', `Change drum ${row + 1} sound, ${drum.name}`);
  });
  $$('[data-synth-choice]').forEach(button => button.setAttribute('aria-pressed', button.dataset.synthChoice === song.synth));
  $$('[data-note]').forEach(button => {
    const step = Number(button.dataset.step), pitch = Number(button.dataset.note), instrument = song.noteSounds[step][pitch];
    button.setAttribute('aria-pressed', Boolean(instrument));
    button.innerHTML = instrument ? icon(SYNTH_SOUNDS[instrument].icon) : '';
    if (instrument) button.dataset.instrument = instrument; else delete button.dataset.instrument;
    button.setAttribute('aria-label', `${NOTES[pitch].name}, bar ${Math.floor(step / STEPS) + 1}, beat ${step % STEPS + 1}${instrument ? `, ${SYNTH_SOUNDS[instrument].name}. Tap to repaint or clear` : ', empty. Tap to paint'}`);
  });
  $$('.loop-light').forEach(light => {
    const step = Number(light.dataset.step);
    [...light.children].forEach((dot, row) => dot.classList.toggle('on', row < DRUM_TRACKS ? song.drums[row][step] : song.melody[step].length > 0));
  });
  $('#tempo').value = song.tempo; $('#tempo-value').textContent = `${song.tempo}`;
  $$('[data-sound]').forEach(input => { input.value = song.sound[input.dataset.sound]; });
  $$('input[type=range]').forEach(updateRange);
  $('#undo').disabled = !history.canUndo;
  drawWave();
  tutorial?.draw();
}

function drawWave() {
  const { brightness, length, wobble } = history.song.sound;
  const points = [];
  for (let x = 0; x <= 400; x += 2) {
    const t = x / 400;
    const phase = t * 7 * Math.PI;
    const harmonic = brightness / 100;
    const wave = history.song.synth;
    const shape = wave === 'bell' ? Math.sin(phase) + Math.sin(phase * 2.76) * 0.3
      : wave === 'arcade' ? Math.tanh(Math.sin(phase) * (1 + harmonic * 4))
      : wave === 'pluck' ? Math.sin(phase) - harmonic * Math.sin(phase * 3) / 9
      : Math.sin(phase) + harmonic * Math.sin(phase * 2) / 2 + harmonic * Math.sin(phase * 3) / 3;
    const movement = 1 - wobble / 100 * 0.65 * (0.5 + 0.5 * Math.sin(t * 15));
    const decay = Math.exp(-t * (3 - length / 100 * 2.5));
    points.push(`${x === 0 ? 'M' : 'L'}${x} ${(75 - shape * 52 * movement * decay).toFixed(2)}`);
  }
  $('#wave-path').setAttribute('d', points.join(' '));
}

function showStep(step) {
  if (syncTesting) {
    clearTimeout(syncFlashTimer);
    $$('#sync-lights i').forEach((light, index) => light.classList.toggle('on', index === step));
    if (step >= 0) syncFlashTimer = setTimeout(() => $$('#sync-lights i').forEach(light => light.classList.remove('on')), 140);
    return;
  }
  currentStep = step;
  $$('[data-step]').forEach(element => element.classList.toggle('current', Number(element.dataset.step) === step));
  $$('[data-page]').forEach(button => {
    const playing = step >= 0 && Number(button.dataset.page) === Math.floor(step / visibleSteps);
    button.classList.toggle('playing', playing);
    button.setAttribute('aria-label', `${button.textContent}${playing ? ', playing' : ''}`);
  });
  tutorial?.draw();
  if (lessonPreview === 'drum' && step === 0) flash($('[data-drum-pad="0"]'));
}

function stopLessonPreview() { if (!lessonPreview) return; lessonPreview = null; engine.stop(); }
function playLessonPreview(kind, restart = false) {
  if (!restart && lessonPreview === kind && (engine.playing || engine.pending)) return;
  lessonPreview = null; engine.stop(); lessonPreview = kind;
  const steps = ['song', 'size', 'whole'].includes(kind) ? history.song.melody.length : 4;
  engine.start({ steps, cycles: 2 });
}

function showPlayback(state) {
  if (state === 'stopped' && syncTesting) {
    syncTesting = false; clearTimeout(syncFlashTimer);
    $$('#sync-lights i').forEach(light => light.classList.remove('on'));
    $('#sync-test').textContent = 'Test sound and lights'; $('#sync-test').setAttribute('aria-pressed', 'false');
  }
  const active = state === 'playing', starting = state === 'starting';
  $('#play').setAttribute('aria-pressed', active || starting);
  $('#play').innerHTML = `${icon(active || starting ? 'stop' : 'play')}<span>${starting ? 'Starting…' : active ? 'Stop' : "Let's play"}</span>`;
  $('#play-state').classList.toggle('playing', active);
  $('#play-state span').textContent = starting ? 'Wait…' : active ? 'Playing!' : 'Ready?';
  if (state === 'stopped' && lessonPreview) { lessonPreview = null; tutorial?.previewEnded(); }
  tutorial?.playback(state);
}

function togglePlay() {
  if (syncTesting) { engine.stop(); return; }
  clearTimeout(previewTimer);
  if (engine.playing || engine.pending) engine.stop(); else engine.start();
}

$('#play').addEventListener('click', togglePlay);
$('#undo').addEventListener('click', undo);
$$('[data-loop-bars]').forEach(button => button.addEventListener('click', () => {
  history.end(); commit(editSong(history.song, { type: 'bars', value: Number(button.dataset.loopBars) }));
}));
$('#clear').addEventListener('click', () => { history.end(); commit(clearSong(history.song)); message('All clear. Undo brings it back.'); });
$('#reset').addEventListener('click', () => {
  history.end(); commit(editSong(createSong(history.song.preset), { type: 'bars', value: history.song.bars }));
  message('Back to the start. Undo brings yours back.');
});
$('#song-details').textContent = Object.entries(PRESETS).map(([id, preset]) => `${songNames[id]}: ${preset.name} (${preset.genre.toLowerCase()})`).join('; ') + '.';
for (const [id, preset] of Object.entries(PRESETS)) {
  const button = document.createElement('button');
  button.className = `groove-card groove-${id}`;
  button.dataset.preset = id; button.dataset.nav = 'presets';
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-label', `${songNames[id]}, ${preset.bars * STEPS} beats, ${preset.bars} ${preset.bars === 1 ? 'bar' : 'bars'}`);
  const dots = `<span class="loop-size-dots" aria-hidden="true">${'<i></i>'.repeat(preset.bars * STEPS)}</span>`;
  button.innerHTML = `<span class="groove-art">${icon(songIcons[id] || preset.icon)}</span><span class="groove-label"><strong>${songNames[id]}</strong>${dots}</span><span class="chosen" aria-hidden="true">${icon('check')}</span>`;
  button.addEventListener('click', () => {
    history.end(); commit(createSong(id));
  });
  $('.groove-picker').append(button);
}
$$('[data-tab]').forEach(button => {
  button.addEventListener('click', () => setSection(button.dataset.tab));
  button.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (tutorial?.active) return;
    const index = sections.indexOf(section);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
    setSection(sections[next], true);
  });
});

let restoreVolume = Number($('#volume').value);
function setVolume(value) {
  if (value > 0) restoreVolume = value;
  $('#volume').value = value;
  engine.setVolume(value / 100); tutorial?.speech.updateVolume(); updateRange($('#volume'));
  const muted = value === 0;
  $('#mute').setAttribute('aria-pressed', muted);
  $('#mute').setAttribute('aria-label', muted ? 'Restore volume' : 'Mute');
  $('#mute use').setAttribute('href', muted ? '#i-muted' : '#i-volume');
}
$('#mute').addEventListener('click', () => setVolume(Number($('#volume').value) > 0 ? 0 : restoreVolume));

$$('input[type=range]').forEach(input => {
  if (input.id !== 'volume') {
    input.addEventListener('pointerdown', () => history.begin());
    input.addEventListener('keydown', event => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) history.begin();
    });
    input.addEventListener('keyup', () => history.end());
    input.addEventListener('blur', () => history.end());
  }
  input.addEventListener('input', () => {
    const value = Number(input.value);
    if (input.id === 'volume') { setVolume(value); return; }
    commit(editSong(history.song, input.id === 'tempo' ? { type: 'tempo', value } : { type: 'sound', key: input.dataset.sound, value }));
    if (input.dataset.sound && !engine.playing) {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(() => engine.audition('note', 0), 150);
    }
  });
});
window.addEventListener('pointerup', () => history.end());
window.addEventListener('pointercancel', () => history.end());
$('#hear-synth').addEventListener('click', () => engine.audition('note', 0));

const dialog = $('#help-dialog'), themeDialog = $('#theme-dialog');
const activeDialog = () => document.querySelector('dialog[open]');
const creditsDialog = $('#credits-dialog');
$('#credits-open').addEventListener('click', () => {
  if (tutorial?.active) tutorial.stop(false);
  creditsDialog.showModal(); focusControl($('#credits-close'));
});
$('#credits-close').addEventListener('click', () => creditsDialog.close());
$('#credits-done').addEventListener('click', () => creditsDialog.close());
creditsDialog.addEventListener('close', () => focusControl($('#credits-open')));

$('#theme-open').addEventListener('click', () => {
  if (tutorial?.active) tutorial.stop(false);
  themeDialog.showModal(); focusControl($(`[data-theme-choice="${theme}"]`));
});
$('#theme-close').addEventListener('click', () => themeDialog.close());
$('#theme-done').addEventListener('click', () => themeDialog.close());
themeDialog.addEventListener('close', () => focusControl($('#theme-open')));
let helpReturn;
function openHelp() {
  if (tutorial?.active) tutorial.stop(false);
  helpReturn = document.activeElement;
  dialog.showModal();
  if (controllerMode) focusControl($('#close-help'));
}
function closeHelp() { dialog.close(); }
$('#help').addEventListener('click', openHelp);
$('#controller-help').addEventListener('click', openHelp);
$('#close-help').addEventListener('click', closeHelp);
$('#help-done').addEventListener('click', closeHelp);
dialog.addEventListener('close', () => { if (syncTesting) engine.stop(); focusControl(helpReturn || $('#help')); });

document.addEventListener('pointerdown', () => {
  controllerMode = false;
  $$('.controller-focus').forEach(node => node.classList.remove('controller-focus'));
}, { capture: true });
document.addEventListener('focusin', event => {
  if (controllerMode) {
    $$('.controller-focus').forEach(node => node.classList.remove('controller-focus'));
    event.target.classList.add('controller-focus');
  }
});
document.addEventListener('keydown', event => {
  controllerMode = false;
  $$('.controller-focus').forEach(node => node.classList.remove('controller-focus'));
  const target = event.target;
  const typing = target instanceof Element && (target.isContentEditable || target.closest('input:not([type=range]), textarea, select'));
  if ((event.code === 'Space' || event.key === ' ') && !event.defaultPrevented &&
      !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && !event.isComposing &&
      !typing && !activeDialog() && !tutorial?.active) {
    event.preventDefault();
    if (!event.repeat) togglePlay();
    return;
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !activeDialog()) {
    event.preventDefault(); if (!tutorial?.active) undo();
  }
});

function controls() {
  return [...(activeDialog() || document).querySelectorAll('button, input[type=range]')]
    .filter(element => !element.disabled && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden')
    .filter(element => !tutorial?.active || tutorial.canExplore(element) || tutorial.card.contains(element));
}

function moveFocus(direction) {
  const available = controls();
  let current = document.activeElement;
  if (!available.includes(current)) { focusControl(tutorial?.active ? tutorial.preferredControl : available.includes($('#play')) ? $('#play') : available[0]); return; }
  const horizontal = direction === 'left' || direction === 'right';
  const sign = direction === 'left' || direction === 'up' ? -1 : 1;
  if (horizontal && current.matches('input[type=range]')) {
    if (!['volume', 'visual-delay'].includes(current.id)) history.begin();
    current.value = Number(current.value) + sign * (current.id === 'visual-delay' ? 10 : 5);
    current.dispatchEvent(new Event('input', { bubbles: true }));
    clearTimeout(groupTimer); groupTimer = setTimeout(() => history.end(), 250);
    return;
  }
  if (!tutorial?.active && current.hasAttribute('data-grid-row')) {
    const row = Number(current.dataset.gridRow), col = Number(current.dataset.gridCol);
    const root = current.closest('.sequence-grid');
    const nextRow = horizontal ? row : row + sign, nextCol = horizontal ? col + sign : col;
    const adjacent = root.querySelector(`[data-grid-row="${nextRow}"][data-grid-col="${nextCol}"]`);
    if (adjacent) { focusControl(adjacent); return; }
    if (horizontal && nextCol >= visibleSteps && page < history.song.melody.length / visibleSteps - 1) {
      changePage(page + 1);
      focusControl(root.querySelector(`[data-grid-row="${row}"][data-grid-col="0"]`)); return;
    }
    if (horizontal && nextCol < -1 && page > 0) {
      changePage(page - 1);
      focusControl(root.querySelector(`[data-grid-row="${row}"][data-grid-col="${visibleSteps - 1}"]`)); return;
    }
  }
  const box = current.getBoundingClientRect();
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  let best, bestScore = Infinity;
  for (const element of available) {
    if (element === current) continue;
    const rect = element.getBoundingClientRect();
    const dx = rect.x + rect.width / 2 - center.x, dy = rect.y + rect.height / 2 - center.y;
    const primary = (horizontal ? dx : dy) * sign;
    const secondary = Math.abs(horizontal ? dy : dx);
    if (primary < 8) continue;
    const score = primary + secondary * 3;
    if (score < bestScore) { best = element; bestScore = score; }
  }
  focusControl(best);
}

function controllerAction(action) {
  controllerMode = true;
  if (tutorial?.active && (action === 'undo' || (action === 'play' && !['playing', 'stopped'].includes(tutorial.step.action)))) return;
  if (tutorial?.active && action === 'back') { tutorial.stop(); return; }
  if (tutorial?.active && ['next-section', 'previous-section'].includes(action)) { tutorial.refresh(!tutorial.reviewing); return; }
  const available = controls();
  if (!available.includes(document.activeElement)) focusControl(tutorial?.active ? (tutorial.preferredControl || available[0]) : activeDialog() ? available[0] : $('#play'));
  else focusControl(document.activeElement);
  if (['up', 'down', 'left', 'right'].includes(action)) moveFocus(action);
  else if (action === 'activate') document.activeElement.click();
  else if (action === 'back') {
    if (activeDialog()) activeDialog().close(); else focusControl($(`#tab-${section}`));
  } else if (!activeDialog()) {
    if (action === 'play') togglePlay();
    if (action === 'undo') undo();
    if (action === 'next-section' || action === 'previous-section') {
      const index = (sections.indexOf(section) + (action === 'next-section' ? 1 : 2)) % 3;
      setSection(sections[index], true);
    }
  }
}

function pollController(now) {
  let pad = null;
  try {
    if (!document.hidden && document.hasFocus()) {
      const pads = [...(navigator.getGamepads?.() || [])].filter(item => item?.connected);
      pad = pads.find(item => item.index === connectedPad && item.mapping === 'standard') || pads.find(item => item.mapping === 'standard');
      if (!pad && pads.length) $('#controller-status').textContent = 'Use touch or mouse';
    }
  } catch { $('#controller-status').textContent = 'Use touch or mouse'; }
  if (pad) {
    if (connectedPad !== pad.index) {
      connectedPad = pad.index;
      $('#controller-status').textContent = 'Xbox ready';
    }
  } else if (connectedPad !== null) {
    connectedPad = null; engine.stop();
    $('#controller-status').textContent = 'Xbox help';
    if (!document.hidden && document.hasFocus()) message('Xbox left. Your song is here.');
    controllerMode = false;
    $$('.controller-focus').forEach(node => node.classList.remove('controller-focus'));
  }
  for (const action of reader.read(pad, now)) controllerAction(action);
  requestAnimationFrame(pollController);
}

function leavePage() {
  tutorial?.stop(false);
  clearTimeout(previewTimer); history.end(); engine.stop(); reader.read(null, 0);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) leavePage(); });
window.addEventListener('blur', leavePage);
window.addEventListener('pagehide', leavePage);
window.addEventListener('resize', () => {
  const next = stepCount();
  if (next === visibleSteps) return;
  const focused = document.activeElement;
  const selectedStep = focused?.hasAttribute('data-step') ? Number(focused.dataset.step) : page * visibleSteps;
  const row = focused?.dataset.gridRow, col = focused?.dataset.gridCol;
  visibleSteps = next; page = Math.floor(selectedStep / next);
  buildGrids();
  if (row !== undefined) {
    const nextCol = Number(col) === -1 ? -1 : selectedStep % next;
    focusControl($(`#panel-${section} [data-grid-row="${row}"][data-grid-col="${nextCol}"]`));
  }
});

for (let row = 0; row < DRUM_TRACKS; row++) {
  const button = document.createElement('button');
  button.dataset.drumChoice = row;
  button.style.setProperty('--instrument-color', DRUM_COLORS[row]);
  button.addEventListener('click', () => {
    history.end();
    const choices = Object.keys(DRUM_SOUNDS), index = choices.indexOf(history.song.drumSounds[row]);
    commit(editSong(history.song, { type: 'drumSound', row, value: choices[(index + 1) % choices.length] }));
    engine.audition('drum', row);
  });
  $('#drum-picker').append(button);
}
for (const [id, synth] of Object.entries(SYNTH_SOUNDS)) {
  const button = document.createElement('button');
  button.dataset.synthChoice = id;
  button.innerHTML = `${icon(synth.icon)}<span>${synth.name}</span>`;
  button.setAttribute('aria-label', `${synth.name} brush`);
  button.addEventListener('click', () => {
    history.end(); commit(editSong(history.song, { type: 'synth', value: id }));
    engine.audition('note', 0);
  });
  $('#synth-picker').append(button);
}
buildGrids(); saveSong();
tutorial = new ZachTutorial({
  getSong: () => history.song,
  getStep: () => currentStep,
  focus: focusControl,
  cue: () => engine.feedback(),
  playPreview: playLessonPreview, stopPreview: stopLessonPreview,
  onStop(keepSong) {
    engine.stop();
    const made = history.song;
    history = originalHistory || history; originalHistory = null;
    if (keepSong) { history.commit(made); saveSong(); }
    buildGrids(); setSection('drums');
  },
  speech: new TutorialSpeech({ volume: () => engine.volume, duck: value => engine.setDucked(value) }),
  onStart() {
    if (activeDialog()) activeDialog().close();
    clearTimeout(previewTimer); engine.stop(); history.end();
    originalHistory = history; history = new SongHistory(editSong(history.song, { type: 'bars', value: 1 }));
    setSection('drums'); changePage(0);
  },
  prepare(step, initial) {
    if (initial && step.id === 'drum') { history.commit(editSong(blankTutorialSong(editSong(history.song, { type: 'bars', value: 1 })), { type: 'synth', value: 'bass' })); buildGrids(); }

    if (step.section && section !== step.section) setSection(step.section);
    if (step.section && step.section !== 'sound' && page !== 0) changePage(0);
    if (step.note && initial) {
      const column = ['chord', 'paint'].includes(step.id) ? Math.max(0, history.song.melody.slice(0, 4).findIndex(notes => notes.length)) : 0;
      if (['chord', 'paint'].includes(step.id) && !history.song.melody[column].length) {
        history.commit(editSong(history.song, { type: 'note', step: column, note: 0, instrument: 'bass' })); updateSong();
      }
      const notes = history.song.melody[column];
      const pitch = step.id === 'paint' ? notes[0] : NOTES.findIndex((_, index) => !notes.includes(index));
      return `[data-note="${pitch < 0 ? NOTES.length - 1 : pitch}"][data-step="${column}"]`;
    }
    return step.target || null;
  }
});
if (invalidSave) message('That saved groove could not be opened. Here’s a fresh one to play with.');
requestAnimationFrame(pollController);

const wideLayout = matchMedia('(min-width: 1400px)');
function arrangeControls() {
  const tabs = document.querySelector('.tabs'), presets = document.querySelector('.groove-picker'), size = document.querySelector('.loop-size');
  const sidebar = document.querySelector('#music-sidebar');
  sidebar.hidden = !wideLayout.matches;
  if (wideLayout.matches) { document.querySelector('#sidebar-tabs').append(tabs); document.querySelector('#sidebar-size').append(size); document.querySelector('#sidebar-songs').append(presets); }
  else { document.querySelector('.workspace-bar').prepend(tabs); document.querySelector('.workspace').prepend(size); document.querySelector('.machine').after(presets); }
  buildGrids(); tutorial?.refresh();
}
wideLayout.addEventListener('change', arrangeControls); arrangeControls();
