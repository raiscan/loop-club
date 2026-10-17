import { NOTES, DRUM_COLORS, clearSong } from './model.js?v=31';
import { TUTORIAL_RECORDINGS } from './tutorial-voice.js?v=31';

// Device speech is a fallback when a bundled recording cannot play.
export function chooseTutorialVoice(voices) {
  const british = voice => /^en[-_]GB$/i.test(voice.lang);
  const female = voice => /female|Sonia|Libby|Hazel|Susan|Serena|Martha|\bKate\b/i.test(voice.name);
  const scottish = voice => /^en\b/i.test(voice.lang) && /scottish|scotland/i.test(`${voice.name} ${voice.lang}`);
  return voices.find(voice => scottish(voice) && female(voice)) || voices.find(scottish)
    || voices.find(voice => british(voice) && female(voice)) || voices.find(british)
    || voices.find(voice => /^en\b/i.test(voice.lang)) || voices.find(voice => voice.default) || voices[0] || null;
}

export class TutorialSpeech {
  constructor({ synth = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance,
    Audio = globalThis.Audio, recordings = TUTORIAL_RECORDINGS,
    volume = () => 0.55, duck = () => {} } = {}) {
    this.synth = synth; this.Utterance = Utterance; this.volume = volume; this.duck = duck;
    this.enabled = true; this.generation = 0;
    this.Audio = Audio; this.recordings = recordings; this.clip = null; this.warmed = new Map();
    this.available = Boolean(Audio || (synth && Utterance));
  }
  preload() {
    if (!this.Audio) return;
    for (const recording of Object.values(this.recordings)) {
      if (this.warmed.has(recording.src)) continue;
      try { const clip = new this.Audio(new URL(recording.src, import.meta.url).href); clip.preload = 'auto'; clip.load(); this.warmed.set(recording.src, clip); } catch { /* On-demand playback remains available. */ }
    }
  }
  releaseClip() {
    const clip = this.clip; this.clip = null;
    if (!clip) return;
    clip.onplaying = clip.onended = clip.onerror = null;
    clip.pause();
    if ([...this.warmed.values()].includes(clip)) { try { clip.currentTime = 0; } catch {} }
    else { clip.removeAttribute('src'); clip.load(); }
    clip.remove?.();
  }
  updateVolume() {
    if (this.clip) this.clip.volume = this.volume();
  }
  stop() {
    ++this.generation; clearTimeout(this.timeout);
    this.releaseClip();
    try { this.synth?.cancel(); } catch { /* Device speech may be unavailable. */ }
    this.duck(false);
  }
  say(text, once = false, recordingId = null) {
    this.stop();
    if ((!this.enabled && !once) || !this.available) return;
    const generation = this.generation;
    const recording = this.recordings[recordingId];
    if (this.Audio && recording?.text === text) this.playRecording(recording, text, generation);
    else this.sayDevice(text, generation);
  }
  playRecording(recording, text, generation) {
    let clip;
    const current = () => generation === this.generation && this.clip === clip;
    const fallback = () => {
      if (!current()) return;
      clearTimeout(this.timeout); this.releaseClip(); this.duck(false);
      this.sayDevice(text, generation);
    };
    try {
      clip = this.warmed.get(recording.src) || new this.Audio(new URL(recording.src, import.meta.url).href);
      this.clip = clip; clip.preload = 'auto'; this.updateVolume();
      clip.onplaying = () => {
        if (!current()) return;
        clearTimeout(this.timeout); this.duck(true);
        this.timeout = setTimeout(() => { if (current()) this.stop(); }, 30000);
      };
      clip.onended = () => {
        if (!current()) return;
        clearTimeout(this.timeout); this.releaseClip(); this.duck(false);
      };
      clip.onerror = fallback;
      clip.hidden = true;
      clip.setAttribute?.('data-tutorial-narration', 'true');
      globalThis.document?.body?.append(clip);
      this.timeout = setTimeout(fallback, 3500);
      Promise.resolve(clip.play()).catch(fallback);
    } catch {
      if (clip) fallback(); else this.sayDevice(text, generation);
    }
  }
  sayDevice(text, generation) {
    if (!this.synth || !this.Utterance || generation !== this.generation) return;
    try {
      const words = new this.Utterance(text);
      const chosen = chooseTutorialVoice(this.synth.getVoices());
      if (chosen) words.voice = chosen;
      words.lang = 'en-GB'; words.rate = 0.88; words.pitch = 1.08;
      words.volume = this.volume();
      const finish = () => { if (generation === this.generation) { clearTimeout(this.timeout); this.duck(false); } };
      words.onstart = () => { if (generation === this.generation) this.duck(true); };
      words.onend = finish; words.onerror = finish;
      this.words = words; // Keep the utterance alive until speech ends.
      this.synth.speak(words);
      this.timeout = setTimeout(() => { if (generation === this.generation) this.stop(); }, 12000);
    } catch { this.stop(); }
  }
}

export const TUTORIAL_STEPS = [
  {
    "id": "hello",
    "audio": "tour2-hello",
    "title": "Hi!",
    "copy": "Tap \u201cLet's play\u201d.",
    "spoken": "Hi! Let\u2019s make some music. Tap the Let's play button.",
    "target": "#play",
    "action": "playing",
    "picture": "loop"
  },
  {
    "id": "stop",
    "audio": "tour2-stop",
    "title": "It loops!",
    "copy": "Tap Stop.",
    "spoken": "Hear it come round again? The music loops. Tap Stop.",
    "target": "#play",
    "action": "stopped",
    "picture": "loop"
  },
  {
    "id": "song",
    "audio": "tour2-song",
    "title": "Pick a song.",
    "copy": "Try Moon.",
    "spoken": "These are songs to try. Tap Moon.",
    "target": "[data-preset=\"float\"]",
    "reward": "song",
    "picture": "loop"
  },
  {
    "id": "clear",
    "audio": "tour2-clear",
    "title": "A fresh start.",
    "copy": "Tap Clear.",
    "spoken": "Clear takes all the notes away. Tap Clear. Undo can bring them back.",
    "target": "#clear",
    "picture": "beat"
  },
  {
    "id": "drum",
    "audio": "tour2-drum",
    "title": "Tap this drum.",
    "copy": "Hear its sound.",
    "spoken": "Tap this drum. Hear its sound.",
    "target": "[data-drum-pad=\"0\"]",
    "section": "drums",
    "reward": "drum",
    "picture": "beat"
  },
  {
    "id": "beat",
    "audio": "tour2-beat",
    "title": "Make a beat.",
    "copy": "Tap this box.",
    "spoken": "A lit box makes a beat. Tap this box.",
    "target": "[data-drum=\"0\"][data-step=\"0\"]",
    "section": "drums",
    "reward": "beat",
    "picture": "beat"
  },
  {
    "id": "drum-sound",
    "audio": "tour2-drum-sound",
    "title": "A new sound.",
    "copy": "Tap ↻.",
    "spoken": "Tap here to change the drum sound. Your beat stays.",
    "target": "[data-drum-choice=\"0\"]",
    "section": "drums",
    "reward": "drumSound",
    "picture": "beat"
  },
  {
    "id": "tunes",
    "audio": "tour2-tunes",
    "title": "Make a tune.",
    "copy": "Tap Tunes.",
    "spoken": "Let\u2019s add a tune. Tap Tunes.",
    "target": "#tab-melody",
    "section": "drums",
    "picture": "notes"
  },
  {
    "id": "note",
    "audio": "tour2-note",
    "title": "Add a note.",
    "copy": "Tap this box.",
    "spoken": "Tap this box. High notes go at the top. Low notes go at the base.",
    "section": "melody",
    "note": true,
    "reward": "note",
    "picture": "notes"
  },
  {
    "id": "brush",
    "audio": "tour2-brush",
    "title": "Pick a brush.",
    "copy": "Tap Chime.",
    "spoken": "Each sound is a brush. Tap Chime.",
    "section": "melody",
    "target": "[data-synth-choice=\"chime\"]",
    "picture": "notes"
  },
  {
    "id": "paint",
    "audio": "tour2-paint",
    "title": "Paint a sound.",
    "copy": "Tap this note.",
    "spoken": "Tap this note to paint it with Chime.",
    "section": "melody",
    "note": true,
    "reward": "paint",
    "picture": "notes"
  },
  {
    "id": "chord",
    "audio": "tour2-chord",
    "title": "Stack notes.",
    "copy": "Add one more.",
    "spoken": "Add one more note in this stack. They play at once.",
    "section": "melody",
    "note": true,
    "reward": "chord",
    "picture": "chord"
  },
  {
    "id": "size",
    "audio": "tour2-size",
    "title": "A longer loop.",
    "copy": "Tap Medium.",
    "spoken": "Four boxes make a small loop. Tap Medium for eight boxes.",
    "section": "melody",
    "target": "[data-loop-bars=\"2\"]",
    "reward": "size",
    "picture": "loop"
  },
  {
    "id": "sounds",
    "audio": "tour2-sounds",
    "title": "Shape a sound.",
    "copy": "Tap Sounds.",
    "spoken": "Now shape the sound. Tap Sounds.",
    "section": "melody",
    "target": "#tab-sound",
    "picture": "wave"
  },
  {
    "id": "slide",
    "audio": "tour2-slide",
    "title": "Slide and hear.",
    "copy": "Try this slider.",
    "spoken": "Slide this to change the sound. Listen as you move it.",
    "section": "sound",
    "target": "#brightness",
    "action": "input",
    "reward": "slide",
    "picture": "wave"
  },
  {
    "id": "play",
    "audio": "tour2-play",
    "title": "Hear your music.",
    "copy": "Tap \u201cLet's play\u201d.",
    "spoken": "Hear your beat and tune together. Tap the Let's play button.",
    "section": "sound",
    "target": "#play",
    "action": "playing",
    "reward": "whole",
    "picture": "loop"
  },
  {
    "id": "done",
    "audio": "tour2-done",
    "title": "You made music!",
    "copy": "Keep it and play.",
    "spoken": "You made music. Keep it to play some more.",
    "section": "drums",
    "done": true,
    "picture": "loop"
  }
];

const PLAYER_PROMPTS = Object.fromEntries(['zach', 'marcie'].map(id => {
  const name = id === 'zach' ? 'Zach' : 'Marcie';
  return [id, {
    hello: { audio: `tour2-hello-${id}`, title: `Hi ${name}!`, spoken: `Hi ${name}! Let’s make some music. Tap the Let's play button.` },
    done: { audio: `tour2-done-${id}`, copy: `Have fun, ${name}.`, spoken: `You made music, ${name}. Keep it to play some more.` }
  }];
}));
export function tutorialPlayer(search = '') {
  const params = new URLSearchParams(search);
  return params.get('zach') === 'yes' ? 'zach' : params.get('marcie') === 'yes' ? 'marcie' : null;
}
export function tutorialStepsFor(player) {
  return TUTORIAL_STEPS.map(step => ({ ...step, ...(PLAYER_PROMPTS[player]?.[step.id] || {}) }));
}

export const TUTORIAL_REWARDS = {
  "song": {
    "title": "Hear it loop.",
    "copy": "Try songs. Next: Clear.",
    "spoken": "Try more songs if you like. Next is Clear."
  },
  "drum": {
    "title": "A drum sound!",
    "copy": "Try it. Next: beats.",
    "spoken": "Tap it again if you like. Next makes a beat."
  },
  "beat": {
    "title": "Your beat!",
    "copy": "More boxes. Next: drums.",
    "spoken": "More boxes make more beats. Next tries a new drum."
  },
  "drumSound": {
    "title": "A new sound!",
    "copy": "Try sounds. Next: Tunes.",
    "spoken": "Try more drum sounds. Next is Tunes."
  },
  "note": {
    "title": "Your tune!",
    "copy": "Try notes. Next: a brush.",
    "spoken": "Try more notes. Next picks a sound brush."
  },
  "paint": {
    "title": "A Chime note!",
    "copy": "Paint more. Next: stacks.",
    "spoken": "Paint more notes if you like. Next stacks notes."
  },
  "chord": {
    "title": "A chord!",
    "copy": "Try stacks. Next: size.",
    "spoken": "Try more stacks. Next makes the loop longer."
  },
  "size": {
    "title": "More room!",
    "copy": "Try sizes. Next: Sounds.",
    "spoken": "Try a small or big loop. Next shapes the sound."
  },
  "slide": {
    "title": "Hear it change.",
    "copy": "Try slides. Next: music.",
    "spoken": "Try the sliders. Next hears all your music."
  },
  "whole": {
    "title": "Your music!",
    "copy": "Hear it loop.",
    "spoken": "Hear your music loop. Then play some more."
  }
};

export const TUTORIAL_NARRATIONS = [...TUTORIAL_STEPS, ...['zach', 'marcie'].flatMap(player => tutorialStepsFor(player).filter(step => step.audio.endsWith(`-${player}`))),
  ...Object.entries(TUTORIAL_REWARDS).map(([kind, reward]) => ({ audio: `tour2-reward-${kind}`, spoken: reward.spoken }))];

export function blankTutorialSong(song) {
  const lesson = clearSong(song);
  lesson.tempo = 120;
  return lesson;
}

export function tutorialPlaybackSong(song, kind) {
  const solo = structuredClone(song);
  if (['song', 'size', 'whole'].includes(kind)) return solo;
  if (kind === 'drum' || kind === 'beat' || kind === 'drumSound') {
    solo.drums = solo.drums.map((row, index) => index === 0 ? row : row.map(() => false));
    solo.melody = solo.melody.map(() => []);
    solo.noteSounds = solo.noteSounds.map(row => row.map(() => null));
    if (kind === 'drum') solo.drums[0][0] = true;
  } else solo.drums = solo.drums.map(row => row.map(() => false));
  return solo;
}

export function finishTutorialSong(song) {
  const result = structuredClone(song);
  result.drums = result.drums.map(row => row.map((_, step) => row[step % 4]));
  result.melody = result.melody.map((_, step) => [...song.melody[step % 4]]);
  result.noteSounds = result.noteSounds.map((_, step) => [...song.noteSounds[step % 4]]);
  return result;
}

export function spotlightPath(rect, width, height) {
  const screen = `M0 0H${width}V${height}H0Z`;
  if (!rect || rect.width <= 0 || rect.height <= 0) return screen;
  const left = rect.left - 7, top = rect.top - 7;
  const right = rect.right + 7, bottom = rect.bottom + 7, radius = 12;
  return `${screen} M${left + radius} ${top}H${right - radius}Q${right} ${top} ${right} ${top + radius}V${bottom - radius}Q${right} ${bottom} ${right - radius} ${bottom}H${left + radius}Q${left} ${bottom} ${left} ${bottom - radius}V${top + radius}Q${left} ${top} ${left + radius} ${top}Z`;
}

export function tutorialPicture(kind, song, playhead = -1) {
  let art = '', label;
  const box = (x, y, on, current = false, width = 32, height = 32, colour = DRUM_COLORS[0]) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="5" class="tutorial-pill${on ? ' on' : ''}${current ? ' current' : ''}" style="--row-color:${colour}"/>`;
  if (kind === 'loop' || kind === 'beat') {
    label = kind === 'loop' ? 'It plays again.' : 'Lit = beat. Dark = rest.';
    const count = song.melody.length, spacing = 304 / count;
    for (let i = 0; i < count; i++) art += box(6 + i * spacing, 4, song.drums[0][i], playhead === i, spacing - 5, 28);
    art += kind === 'loop' ? '<path d="M299 37v8H12v-8m0 8 6-5m-6 5 6 5" fill="none" class="tutorial-arrow" stroke-width="2"/>' : '';
  } else if (kind === 'notes' || kind === 'chord') {
    label = kind === 'chord' ? 'One stack. Play at once.' : 'High ↑   Low ↓';
    art += '<text x="5" y="15">High</text><text x="5" y="51">Low</text><path d="M60 11v36m-4-30 4-6 4 6" fill="none" class="tutorial-arrow" stroke-width="2"/>';
    for (let col = 0; col < 4; col++) for (let note = 0; note < 6; note++) art += box(90 + col * 48, 2 + (5 - note) * 8.5, song.melody[col].includes(note), playhead === col, 38, 7, NOTES[note].color);
    if (kind === 'chord') art += '<rect x="85" y="0" width="48" height="55" rx="7" fill="none" class="tutorial-chord" stroke-width="3"/>';
  } else {
    label = 'Soft ↔ Bright';
    const brightness = song.sounds[song.synth].brightness / 100;
    const points = Array.from({ length: 101 }, (_, i) => {
      const phase = i / 100 * Math.PI * 6;
      const y = 28 - (Math.sin(phase) + brightness * Math.sin(phase * 3) * 0.32) * 19;
      return `${i ? 'L' : 'M'}${i * 3 + 5} ${y.toFixed(2)}`;
    });
    art = `<path d="M5 28H305" class="tutorial-axis"/><path d="${points.join(' ')}" fill="none" class="tutorial-wave" stroke-width="3"/>`;
  }
  return `<svg viewBox="0 0 312 58" aria-hidden="true">${art}</svg><figcaption>${label}</figcaption>`;
}

export class ZachTutorial {
  constructor({ prepare, focus, cue, speech, onStart, onStop, playPreview, stopPreview, getSong, getStep }) {
    this.prepare = prepare; this.focus = focus; this.cue = cue; this.speech = speech; this.onStart = onStart;
    this.getSong = getSong; this.getStep = getStep;
    this.onStop = onStop; this.playPreview = playPreview; this.stopPreview = stopPreview;
    this.card = document.querySelector('#tutorial-card'); this.ring = document.querySelector('#tutorial-ring');
    this.shade = document.querySelector('#tutorial-shade');
    this.active = false; this.index = 0;
    this.steps = tutorialStepsFor(tutorialPlayer(globalThis.location?.search));
    document.querySelector('#tutorial-start').addEventListener('click', () => this.start());
    document.querySelector('#tutorial-exit').addEventListener('click', () => this.stop());
    document.querySelector('#tutorial-done').addEventListener('click', () => this.stop(true, true));
    document.querySelector('#tutorial-next').addEventListener('click', () => this.advance());
    document.querySelector('#tutorial-repeat').addEventListener('click', () => this.speak(true));
    const voice = document.querySelector('#tutorial-voice');
    voice.hidden = !speech.available;
    document.querySelector('#tutorial-repeat').hidden = !speech.available;
    voice.addEventListener('click', () => {
      speech.enabled = !speech.enabled;
      voice.textContent = speech.enabled ? 'Voice on' : 'Voice off';
      voice.setAttribute('aria-pressed', String(speech.enabled));
      if (speech.enabled) { if (this.reviewing && this.heard) this.sayReward(); else if (!this.reviewing) this.speak(); } else speech.stop();
    });
    document.addEventListener('click', event => {
      if (!this.active || this.card.contains(event.target)) return;
      const control = event.target.closest('button, input');
      if (this.reviewing) {
        if (this.canExplore(control)) {
          const index = this.index;
          queueMicrotask(() => { if (this.active && this.index === index) this.explore(); });
          return;
        }
        event.preventDefault(); event.stopImmediatePropagation(); return;
      }
      const index = this.index, hit = this.target?.contains(event.target);
      if (hit && !this.step.action) queueMicrotask(() => { if (this.active && this.index === index && !this.reviewing) this.completeAction(); });
      else requestAnimationFrame(() => this.refresh());
    }, true);
    document.addEventListener('input', event => {
      if (!this.active) return;
      if (this.reviewing && this.canExplore(event.target)) { this.explore(); return; }
      if (this.reviewing || this.step.action !== 'input' || event.target !== this.target) return;
      const index = this.index;
      queueMicrotask(() => { if (this.active && this.index === index && !this.reviewing) this.completeAction(); });
    }, true);
    document.addEventListener('keydown', event => {
      if (this.active && event.key === 'Escape') { event.preventDefault(); this.stop(); }
      if (this.active && event.key === 'Tab') {
        event.preventDefault();
        const targets = this.reviewing ? [...document.querySelectorAll('button, input')].filter(node => this.canExplore(node)) : [this.target];
        const controls = [...targets, ...this.card.querySelectorAll('button')].filter(node => node && !node.hidden && !node.disabled);
        const index = controls.indexOf(document.activeElement);
        this.focus(controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]);
      }
    });
    document.addEventListener('scroll', () => this.position(), { capture: true, passive: true });
    window.addEventListener('resize', () => requestAnimationFrame(() => this.refresh()));
  }
  get step() { return this.steps[this.index]; }
  get preferredControl() { return this.reviewing ? document.querySelector('#tutorial-next') : this.target; }
  start() {
    this.stop(false); this.speech.preload?.(); this.onStart(); this.active = true; this.index = 0;
    this.card.hidden = false; document.body.classList.add('tutorial-open');
    this.shade.hidden = false;
    document.querySelector('#tutorial-start').setAttribute('aria-expanded', 'true');
    this.show();
  }
  clearTarget() {
    if (this.target) {
      if (this.description === null) this.target.removeAttribute('aria-describedby');
      else this.target.setAttribute('aria-describedby', this.description);
    }
    this.target = null; this.ring.hidden = true;
    this.setShade(null);
  }
  stop(returnFocus = true, keepSong = false) {
    const wasActive = this.active;
    this.active = false; this.reviewing = false; this.stopPreview(); clearTimeout(this.inputTimer);
    this.speech.stop(); this.clearTarget(); this.card.hidden = true;
    this.shade.hidden = true;
    document.body.classList.remove('tutorial-open', 'tutorial-listening');
    if (wasActive) this.onStop(keepSong);
    document.querySelector('#tutorial-start').setAttribute('aria-expanded', 'false');
    if (returnFocus) this.focus(document.querySelector('#tutorial-start'));
  }
  playback(state) { if (this.active && !this.reviewing && this.step.action === state) this.completeAction(); }
  completeAction() {
    if (this.step.reward) this.review(); else this.advance();
  }
  review() {
    if (this.reviewing) { this.explore(); return; }
    this.reviewing = true; this.heard = false;
    this.speech.stop();
    this.card.dataset.tutorialPhase = 'try';
    document.body.classList.add('tutorial-listening');
    const reward = TUTORIAL_REWARDS[this.step.reward];
    document.querySelector('#tutorial-title').textContent = reward.title;
    document.querySelector('#tutorial-copy').textContent = reward.copy;
    document.querySelector('#tutorial-repeat').textContent = 'Hear again ↻';
    document.querySelector('#tutorial-repeat').hidden = false;
    const next = document.querySelector('#tutorial-next'); next.hidden = false; next.disabled = false;
    this.refresh(); this.draw(); this.focus(next);
    this.playPreview(this.step.reward);
  }
  explore() {
    // Give each new experiment room to sound. A response is spoken only once;
    // playing again can interrupt it, but never starts the instruction again.
    this.speech.stop();
    this.playPreview(this.step.reward, true); this.draw(); this.position();
  }
  previewEnded() {
    if (!this.active || !this.reviewing) return;
    if (this.step.reward === 'whole') this.advance();
    else this.position();
  }
  previewLooped() {
    if (!this.active || !this.reviewing || this.heard) return;
    this.heard = true;
    this.sayReward();
  }
  sayReward() {
    const reward = TUTORIAL_REWARDS[this.step.reward];
    if (reward) this.speech.say(reward.spoken, false, `tour2-reward-${this.step.reward}`);
  }
  canExplore(control) {
    if (!control) return false;
    if (!this.reviewing) return control === this.target;
    const kind = this.step.reward;
    if (kind === 'song') return control.matches('[data-preset]');
    if (kind === 'drum') return control.matches('[data-drum-pad="0"]');
    if (kind === 'drumSound') return control.matches('[data-drum-choice="0"], [data-drum-pad="0"]');
    if (kind === 'beat') return control.matches('[data-drum="0"][data-step]') && Number(control.dataset.step) < 4;
    if (['note', 'paint', 'chord'].includes(kind)) return control.matches('#melody-grid button[data-note][data-step]') && Number(control.dataset.step) < 4;
    if (kind === 'size') return control.matches('[data-loop-bars]');
    if (kind === 'whole') return control.matches('#play');
    return kind === 'slide' && control.matches('input[data-sound]');
  }
  advance() {
    if (!this.active || this.step.done) return;
    this.speech.stop(); this.stopPreview(); this.reviewing = false;
    document.body.classList.remove('tutorial-listening');
    this.cue(); this.index++; this.show();
  }
  speak(once = false) { if (this.reviewing) { this.speech.stop(); this.playPreview(this.step.reward, true); return; } this.speech.say(this.step.spoken || `${this.step.title} ${this.step.copy}`, once, this.step.audio); }
  show() {
    this.clearTarget(); clearTimeout(this.inputTimer);
    this.card.dataset.tutorialLesson = this.step.id; this.card.dataset.tutorialStep = this.index; this.card.dataset.tutorialPhase = 'do';
    const next = document.querySelector('#tutorial-next');
    next.hidden = Boolean(this.step.done); next.disabled = false;
    document.querySelector('#tutorial-repeat').textContent = 'Say it ↻';
    document.querySelector('#tutorial-repeat').hidden = !this.speech.available;
    document.querySelector('#tutorial-title').textContent = this.step.title;
    document.querySelector('#tutorial-copy').textContent = this.step.copy;
    document.querySelector('#tutorial-count').textContent = this.step.done ? '★' : `${this.index + 1} / ${TUTORIAL_STEPS.length - 1}`;
    document.querySelector('#tutorial-done').hidden = !this.step.done;
    this.selector = this.prepare(this.step, true);
    this.refresh(true); this.draw(); this.speak();

  }
  draw() {
    if (this.active) document.querySelector('#tutorial-picture').innerHTML = tutorialPicture(this.step.picture, this.getSong(), this.getStep());
  }
  refresh(moveFocus = false) {
    if (!this.active) return;
    this.prepare(this.step, false);
    const target = this.selector ? document.querySelector(this.selector) : null;
    if (target !== this.target) {
      this.clearTarget(); this.target = target;
      if (target) {
        this.description = target.getAttribute('aria-describedby');
        target.setAttribute('aria-describedby', `${this.description || ''} tutorial-title tutorial-copy`.trim());
      }
    }
    this.card.classList.remove('tutorial-top');
    if (target) {
      if (moveFocus) this.focus(target);
      target.scrollIntoView({ block: 'center', behavior: 'instant' });
    } else if (moveFocus) this.focus(document.querySelector('#tutorial-done'));
    this.position();
  }
  position() {
    if (!this.active || !this.target?.isConnected) { this.ring.hidden = true; this.setShade(null); return; }
    let rect = this.highlightRect();
    if (rect.height <= innerHeight - 24) {
      const delta = rect.top < 12 ? rect.top - 12 : rect.bottom > innerHeight - 12 ? rect.bottom - innerHeight + 12 : 0;
      if (Math.abs(delta) > 2) { window.scrollBy({ top: delta, behavior: 'instant' }); rect = this.highlightRect(); }
    }
    this.card.classList.toggle('tutorial-left', innerWidth >= 700 && innerHeight < 500 && rect.left + rect.width / 2 > innerWidth / 2);
    const card = this.card.getBoundingClientRect();
    const overlapsBottom = rect.bottom + 12 > innerHeight - card.height - 24;
    this.card.classList.toggle('tutorial-top', overlapsBottom);
    const edge = this.card.getBoundingClientRect();
    // Leave the highlighted control clear of the prompt, even in short windows.
    if (rect.left - 12 < edge.right && rect.right + 12 > edge.left && rect.bottom + 12 > edge.top && rect.top - 12 < edge.bottom) {
      const desired = Math.max(12, Math.min(innerHeight - rect.height - 12, overlapsBottom ? edge.bottom + 26 : edge.top - rect.height - 26));
      const delta = rect.top - desired;
      if (Math.abs(delta) > 2) {
        window.scrollBy({ top: delta, behavior: 'instant' });
        rect = this.highlightRect();
      }
    }
    this.ring.hidden = rect.width === 0;
    Object.assign(this.ring.style, { left: `${rect.left - 7}px`, top: `${rect.top - 7}px`, width: `${rect.width + 14}px`, height: `${rect.height + 14}px` });
    this.setShade(rect);
  }
  highlightRect() {
    const kind = this.step.reward;
    const nodes = this.reviewing && kind === 'beat'
      ? [...document.querySelectorAll('[data-drum="0"][data-step]')].filter(node => Number(node.dataset.step) < 4)
      : this.reviewing && ['note', 'paint', 'chord'].includes(kind)
        ? [...document.querySelectorAll('#melody-grid button[data-step]')].filter(node => Number(node.dataset.step) < 4)
        : this.reviewing && kind === 'size' ? [...document.querySelectorAll('[data-loop-bars]')] : this.reviewing && kind === 'slide' ? [...document.querySelectorAll('input[data-sound]')] : [this.target];
    const rects = nodes.filter(Boolean).map(node => node.getBoundingClientRect());
    const left = Math.min(...rects.map(rect => rect.left)), top = Math.min(...rects.map(rect => rect.top));
    const right = Math.max(...rects.map(rect => rect.right)), bottom = Math.max(...rects.map(rect => rect.bottom));
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  }
  setShade(rect) {
    this.shade.querySelector('svg').setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
    const songRects = this.reviewing && this.step.reward === 'song'
      ? [...document.querySelectorAll('[data-preset]')].map(node => node.getBoundingClientRect()) : null;
    const path = songRects ? spotlightPath(null, innerWidth, innerHeight) + songRects.map(box => spotlightPath(box, innerWidth, innerHeight).replace(spotlightPath(null, innerWidth, innerHeight), '')).join('') : spotlightPath(rect, innerWidth, innerHeight);
    this.shade.querySelector('path').setAttribute('d', path);
  }
}
