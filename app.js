import { createSong, editSong, restoreSong, SongHistory, NOTES, STEPS, SAVE_KEY, DRUM_TRACKS, DRUM_COLORS, DRUM_SOUNDS, SYNTH_SOUNDS, PRESETS } from './model.js?v=8';
import { AudioEngine } from './audio.js?v=8';
import { GamepadReader } from './gamepad.js?v=8';
import { ZachTutorial, TutorialSpeech } from './tutorial.js?v=8';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const sections = ['drums', 'melody', 'sound'];
let saved = null, invalidSave = false;
try {
  const raw = localStorage.getItem(SAVE_KEY);
  saved = restoreSong(raw);
  invalidSave = raw !== null && saved === null;
} catch { /* Saving remains optional; the instrument can still play. */ }
const history = new SongHistory(saved || createSong());
let section = 'drums', page = 0, visibleSteps = stepCount();
let currentStep = -1, controllerMode = false, connectedPad = null;
let messageTimer, previewTimer, groupTimer;
const reader = new GamepadReader();
let tutorial = null;
const engine = new AudioEngine(() => history.song, showStep, showPlayback, message);

function message(text) {
  clearTimeout(messageTimer);
  $('#message').textContent = text;
  $('#message').hidden = false;
  messageTimer = setTimeout(() => { $('#message').hidden = true; }, 6500);
}

function saveSong() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(history.song));
    $('#save-status span').textContent = 'Saved on this device';
  } catch {
    $('#save-status span').textContent = 'Saving unavailable in this browser';
  }
}

function commit(next) {
  if (!history.commit(next)) return;
  saveSong(); updateSong();
}

function undo() {
  if (!history.canUndo) return;
  history.undo(); saveSong(); updateSong();
  message('Undone. Keep exploring.');
  if (document.activeElement === $('#undo') && $('#undo').disabled) focusControl($(`#tab-${section}`));
}

function stepCount() {
  return matchMedia('(max-width: 559px)').matches ? 4 : matchMedia('(max-width: 1249px)').matches ? 8 : 16;
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
    label.textContent = i + 1;
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
        if (!engine.playing && history.song.drums[row][step]) engine.audition('drum', row);
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
        if (!engine.playing) engine.audition('chord', history.song.melody[step]);
      });
      melodyGrid.append(button);
    }
  });
  const picker = $('#page-picker'); picker.replaceChildren();
  for (let p = 0; p < STEPS / visibleSteps; p++) {
    const button = document.createElement('button');
    button.textContent = `${p * visibleSteps + 1}–${(p + 1) * visibleSteps}`;
    button.setAttribute('aria-label', `Steps ${button.textContent}`);
    button.setAttribute('aria-pressed', p === page);
    button.dataset.page = p;
    button.addEventListener('click', () => {
      const keepFocus = document.activeElement === button;
      changePage(p);
      if (keepFocus) focusControl($(`[data-page="${p}"]`));
    });
    picker.append(button);
  }
  updateSong(); showStep(currentStep);
}

function changePage(nextPage) {
  page = Math.max(0, Math.min(STEPS / visibleSteps - 1, nextPage));
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
  $('#page-picker').hidden = section === 'sound';
  $('#synth-picker').hidden = section === 'drums';
  const titles = {
    drums: ['Tap a square. Make a beat.', 'Try the big drums, too.'],
    melody: ['Draw a tune. Stack a chord.', 'Put notes in the same column to play them together.'],
    sound: ['What does your synth sound like?', 'Three little changes. Lots of new sounds.']
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
  $$('[data-preset]').forEach(button => button.setAttribute('aria-pressed', button.dataset.preset === song.preset));
  $$('[data-drum]').forEach(button => button.setAttribute('aria-pressed', song.drums[button.dataset.drum][button.dataset.step]));
  $$('[data-drum-pad]').forEach(pad => {
    const row = Number(pad.dataset.drumPad), drum = DRUM_SOUNDS[song.drumSounds[row]];
    pad.innerHTML = `${icon(drum.icon)}<span>${drum.name}</span>`;
    pad.setAttribute('aria-label', `Play ${drum.name}, drum ${row + 1}`);
  });
  $$('[data-drum]').forEach(button => button.setAttribute('aria-label', `${DRUM_SOUNDS[song.drumSounds[button.dataset.drum]].name}, drum ${Number(button.dataset.drum) + 1}, step ${Number(button.dataset.step) + 1}`));
  $$('[data-drum-choice]').forEach(button => {
    const row = Number(button.dataset.drumChoice), drum = DRUM_SOUNDS[song.drumSounds[row]];
    button.innerHTML = `${icon(drum.icon)}<span><small>DRUM ${row + 1}</small>${drum.name}</span><span class="switch-icon" aria-hidden="true">↻</span>`;
    button.setAttribute('aria-label', `Change drum ${row + 1} sound, ${drum.name}`);
  });
  $$('[data-synth-choice]').forEach(button => button.setAttribute('aria-pressed', button.dataset.synthChoice === song.synth));
  $$('[data-note]').forEach(button => button.setAttribute('aria-pressed', song.melody[button.dataset.step].includes(Number(button.dataset.note))));
  $('#tempo').value = song.tempo; $('#tempo-value').textContent = `${song.tempo} BPM`;
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
  currentStep = step;
  $$('[data-step]').forEach(element => element.classList.toggle('current', Number(element.dataset.step) === step));
  tutorial?.draw();
}

function showPlayback(state) {
  const active = state === 'playing', starting = state === 'starting';
  $('#play').setAttribute('aria-pressed', active || starting);
  $('#play').innerHTML = `${icon(active || starting ? 'stop' : 'play')}<span>${starting ? 'Starting…' : active ? 'Stop' : "Let's play"}</span>`;
  $('#play-state').classList.toggle('playing', active);
  $('#play-state span').textContent = starting ? 'WAKING UP…' : active ? 'MAKING MUSIC' : 'READY TO PLAY';
  tutorial?.playback(state);
}

function togglePlay() {
  clearTimeout(previewTimer);
  if (engine.playing || engine.pending) engine.stop(); else engine.start();
}

$('#play').addEventListener('click', togglePlay);
$('#undo').addEventListener('click', undo);
$('#reset').addEventListener('click', () => {
  history.end(); commit(createSong(history.song.preset));
  message('Back to the starting groove. Undo can bring yours back.');
});
for (const [id, preset] of Object.entries(PRESETS)) {
  const button = document.createElement('button');
  button.className = `groove-card groove-${id}`;
  button.dataset.preset = id; button.dataset.nav = 'presets';
  button.setAttribute('aria-pressed', 'false');
  button.innerHTML = `<span class="groove-art">${icon(preset.icon)}</span><span><small>${preset.genre}</small><strong>${preset.name}</strong></span><span class="chosen" aria-hidden="true">${icon('check')}</span>`;
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
    const index = sections.indexOf(section);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
    setSection(sections[next], true);
  });
});

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
    if (input.id === 'volume') { engine.setVolume(value / 100); updateRange(input); return; }
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

const dialog = $('#help-dialog');
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
dialog.addEventListener('close', () => focusControl(helpReturn || $('#help')));

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
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !dialog.open) {
    event.preventDefault(); undo();
  }
});

function controls() {
  return [...(dialog.open ? dialog : document).querySelectorAll('button, input[type=range]')]
    .filter(element => !element.disabled && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
}

function moveFocus(direction) {
  const available = controls();
  let current = document.activeElement;
  if (!available.includes(current)) { focusControl(available.includes($('#play')) ? $('#play') : available[0]); return; }
  const horizontal = direction === 'left' || direction === 'right';
  const sign = direction === 'left' || direction === 'up' ? -1 : 1;
  if (horizontal && current.matches('input[type=range]')) {
    if (current.id !== 'volume') history.begin();
    current.value = Number(current.value) + sign * 5;
    current.dispatchEvent(new Event('input', { bubbles: true }));
    clearTimeout(groupTimer); groupTimer = setTimeout(() => history.end(), 250);
    return;
  }
  if (current.hasAttribute('data-grid-row')) {
    const row = Number(current.dataset.gridRow), col = Number(current.dataset.gridCol);
    const root = current.closest('.sequence-grid');
    const nextRow = horizontal ? row : row + sign, nextCol = horizontal ? col + sign : col;
    const adjacent = root.querySelector(`[data-grid-row="${nextRow}"][data-grid-col="${nextCol}"]`);
    if (adjacent) { focusControl(adjacent); return; }
    if (horizontal && nextCol >= visibleSteps && page < STEPS / visibleSteps - 1) {
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
  if (tutorial?.active && action === 'back') { tutorial.stop(); return; }
  const available = controls();
  if (!available.includes(document.activeElement)) focusControl(dialog.open ? $('#close-help') : $('#play'));
  else focusControl(document.activeElement);
  if (['up', 'down', 'left', 'right'].includes(action)) moveFocus(action);
  else if (action === 'activate') document.activeElement.click();
  else if (action === 'back') {
    if (dialog.open) closeHelp(); else focusControl($(`#tab-${section}`));
  } else if (!dialog.open) {
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
      if (!pad && pads.length) $('#controller-status').textContent = 'Controller mapping unavailable · touch / mouse ready';
    }
  } catch { $('#controller-status').textContent = 'Controller unavailable here · touch / mouse ready'; }
  if (pad) {
    if (connectedPad !== pad.index) {
      connectedPad = pad.index;
      $('#controller-status').textContent = 'Xbox ready · A select · X undo · LB/RB sections · ☰ play';
    }
  } else if (connectedPad !== null) {
    connectedPad = null; engine.stop();
    $('#controller-status').textContent = 'Xbox on PC · press a button to connect';
    if (!document.hidden && document.hasFocus()) message('Controller disconnected. Your groove is still here.');
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
  button.setAttribute('aria-label', `${synth.name} synth`);
  button.addEventListener('click', () => {
    history.end(); commit(editSong(history.song, { type: 'synth', value: id }));
    engine.audition('note', 0);
  });
  $('#synth-picker').append(button);
}
for (let step = 0; step < STEPS; step++) {
  const light = document.createElement('i'); light.className = 'loop-light'; light.dataset.step = step;
  $('#loop-lights').append(light);
}
buildGrids(); saveSong();
tutorial = new ZachTutorial({
  getSong: () => history.song,
  getStep: () => currentStep,
  focus: focusControl,
  cue: () => engine.feedback(),
  speech: new TutorialSpeech({ volume: () => engine.volume, duck: value => engine.setDucked(value) }),
  onStart() {
    if (dialog.open) dialog.close();
    clearTimeout(previewTimer); engine.stop(); history.end(); setSection('drums'); changePage(0);
  },
  prepare(step, initial) {
    if (step.section && section !== step.section) setSection(step.section);
    if (step.section && step.section !== 'sound' && page !== 0) changePage(0);
    if (step.note && initial) {
      const notes = history.song.melody[0];
      const pitch = NOTES.findIndex((_, index) => !notes.includes(index));
      return `[data-note="${pitch < 0 ? NOTES.length - 1 : pitch}"][data-step="0"]`;
    }
    return step.target || null;
  }
});
if (invalidSave) message('That saved groove could not be opened. Here’s a fresh one to play with.');
requestAnimationFrame(pollController);
