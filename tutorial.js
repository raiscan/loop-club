import { TUTORIAL_RECORDINGS } from './tutorial-voice.js?v=10';

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
    this.Audio = Audio; this.recordings = recordings; this.clip = null;
    this.available = Boolean(Audio || (synth && Utterance));
  }
  releaseClip() {
    const clip = this.clip; this.clip = null;
    if (!clip) return;
    clip.onplaying = clip.onended = clip.onerror = null;
    clip.pause(); clip.removeAttribute('src'); clip.load(); clip.remove?.();
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
      clip = new this.Audio(new URL(recording.src, import.meta.url).href);
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
  { audio: 'hello', title: 'Hi Zach!', copy: 'Tap “Let\'s play”.', spoken: "Hi Zach! Let’s make some music. Tap the Let's play button.", target: '#play', action: 'playing', picture: 'loop' },
  { audio: 'stop', title: 'Hear that?', copy: 'Tap Stop.', spoken: 'Hear that beat? Watch the light move along. When it goes back to the start, the tune plays again. Tap Stop.', target: '#play', action: 'stopped', picture: 'loop' },
  { audio: 'drum', title: 'Tap this drum.', copy: 'Give it a go!', target: '[data-drum-pad="0"]', section: 'drums', picture: 'beat' },
  { audio: 'beat', title: 'Make a beat.', copy: 'Tap this box.', spoken: 'Tap this box. A lit box makes a beat. A dark box is a rest.', target: '[data-drum="0"][data-step="1"]', section: 'drums', picture: 'beat' },
  { audio: 'tunes', title: 'Let’s make a tune.', copy: 'Tap Tunes.', target: '#tab-melody', section: 'drums', picture: 'notes' },
  { audio: 'note', title: 'Add a note.', copy: 'Tap this box.', spoken: 'Tap this box. Notes at the top sound high. Notes at the base sound low.', section: 'melody', note: true, picture: 'notes' },
  { audio: 'chord', title: 'One more note!', copy: 'A stack is a chord.', spoken: 'Add one more note in the same stack. They play at once. That is a chord!', section: 'melody', note: true, picture: 'chord' },
  { audio: 'sounds', title: 'Try a new sound.', copy: 'Tap Sounds.', target: '#tab-sound', section: 'melody', picture: 'wave' },
  { audio: 'slide', title: 'Slide this.', copy: 'Hear it change.', spoken: 'Slide this. The shape and the sound change. Try soft, then bright.', target: '#brightness', section: 'sound', action: 'input', picture: 'wave' },
  { audio: 'play', title: 'Your tune!', copy: 'Tap “Let\'s play”.', spoken: "Now hear your tune. Tap the Let's play button.", target: '#play', section: 'sound', action: 'playing', picture: 'loop' },
  { audio: 'done', title: 'You made music!', copy: 'Have fun, Zach.', done: true, picture: 'loop' }
];

export function spotlightPath(rect, width, height) {
  const screen = `M0 0H${width}V${height}H0Z`;
  if (!rect || rect.width <= 0 || rect.height <= 0) return screen;
  const left = rect.left - 7, top = rect.top - 7;
  const right = rect.right + 7, bottom = rect.bottom + 7, radius = 12;
  return `${screen} M${left + radius} ${top}H${right - radius}Q${right} ${top} ${right} ${top + radius}V${bottom - radius}Q${right} ${bottom} ${right - radius} ${bottom}H${left + radius}Q${left} ${bottom} ${left} ${bottom - radius}V${top + radius}Q${left} ${top} ${left + radius} ${top}Z`;
}

export function tutorialPicture(kind, song, playhead = -1) {
  let art = '', label;
  const box = (x, y, on, current = false, width = 32, height = 32) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="5" fill="${on ? '#91b943' : '#e0e3d7'}" stroke="${current ? '#27302e' : '#b7c0aa'}" stroke-width="${current ? 3 : 1}"/>`;
  if (kind === 'loop' || kind === 'beat') {
    label = kind === 'loop' ? 'It plays again.' : 'Lit = beat. Dark = rest.';
    const count = kind === 'loop' ? 16 : 8, spacing = kind === 'loop' ? 19 : 38;
    for (let i = 0; i < count; i++) art += box(6 + i * spacing, 4, song.drums[0][i], playhead === i, spacing - 5, 28);
    art += kind === 'loop' ? '<path d="M299 37v8H12v-8m0 8 6-5m-6 5 6 5" fill="none" stroke="#637747" stroke-width="2"/>' : '';
  } else if (kind === 'notes' || kind === 'chord') {
    label = kind === 'chord' ? 'One stack. Play at once.' : 'High ↑   Low ↓';
    art += '<text x="5" y="15">High</text><text x="5" y="51">Low</text><path d="M60 11v36m-4-30 4-6 4 6" fill="none" stroke="#637747" stroke-width="2"/>';
    for (let col = 0; col < 4; col++) for (let note = 0; note < 6; note++) art += box(90 + col * 48, 2 + (5 - note) * 8.5, song.melody[col].includes(note), false, 38, 7);
    if (kind === 'chord') art += '<rect x="85" y="0" width="48" height="55" rx="7" fill="none" stroke="#b98713" stroke-width="3"/>';
  } else {
    label = 'Soft ↔ Bright';
    const brightness = song.sound.brightness / 100;
    const points = Array.from({ length: 101 }, (_, i) => {
      const phase = i / 100 * Math.PI * 6;
      const y = 28 - (Math.sin(phase) + brightness * Math.sin(phase * 3) * 0.32) * 19;
      return `${i ? 'L' : 'M'}${i * 3 + 5} ${y.toFixed(2)}`;
    });
    art = `<path d="M5 28H305" stroke="#d1d6c6"/><path d="${points.join(' ')}" fill="none" stroke="#617f36" stroke-width="3"/>`;
  }
  return `<svg viewBox="0 0 312 58" aria-hidden="true">${art}</svg><figcaption>${label}</figcaption>`;
}

export class ZachTutorial {
  constructor({ prepare, focus, cue, speech, onStart, getSong, getStep }) {
    this.prepare = prepare; this.focus = focus; this.cue = cue; this.speech = speech; this.onStart = onStart;
    this.getSong = getSong; this.getStep = getStep;
    this.card = document.querySelector('#tutorial-card'); this.ring = document.querySelector('#tutorial-ring');
    this.shade = document.querySelector('#tutorial-shade');
    this.active = false; this.index = 0;
    document.querySelector('#tutorial-start').addEventListener('click', () => this.start());
    document.querySelector('#tutorial-exit').addEventListener('click', () => this.stop());
    document.querySelector('#tutorial-done').addEventListener('click', () => this.stop());
    document.querySelector('#tutorial-repeat').addEventListener('click', () => this.speak(true));
    const voice = document.querySelector('#tutorial-voice');
    voice.hidden = !speech.available;
    document.querySelector('#tutorial-repeat').hidden = !speech.available;
    voice.addEventListener('click', () => {
      speech.enabled = !speech.enabled;
      voice.textContent = speech.enabled ? 'Voice on' : 'Voice off';
      voice.setAttribute('aria-pressed', String(speech.enabled));
      if (speech.enabled) this.speak(); else speech.stop();
    });
    // Capture the hit before the instrument updates a button's child content.
    document.addEventListener('click', event => {
      if (!this.active || this.card.contains(event.target)) return;
      const index = this.index;
      const hit = this.target?.contains(event.target);
      if (hit && !this.step.action) queueMicrotask(() => { if (this.active && this.index === index) this.advance(); });
      else requestAnimationFrame(() => this.refresh());
    }, true);
    document.addEventListener('input', event => {
      if (!this.active || this.step.action !== 'input' || event.target !== this.target) return;
      clearTimeout(this.inputTimer);
      const index = this.index;
      this.inputTimer = setTimeout(() => { if (this.active && this.index === index) this.advance(); }, 450);
    }, true);
    document.addEventListener('keydown', event => {
      if (this.active && event.key === 'Escape') { event.preventDefault(); this.stop(); }
      if (this.active && event.key === 'Tab') {
        event.preventDefault();
        const controls = [this.target, ...this.card.querySelectorAll('button')].filter(node => node && !node.hidden && !node.disabled);
        const index = controls.indexOf(document.activeElement);
        this.focus(controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]);
      }
    });
    window.addEventListener('scroll', () => this.position(), { passive: true });
    window.addEventListener('resize', () => requestAnimationFrame(() => this.refresh()));
  }
  get step() { return TUTORIAL_STEPS[this.index]; }
  start() {
    this.stop(false); this.onStart(); this.active = true; this.index = 0;
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
  stop(returnFocus = true) {
    this.active = false; clearTimeout(this.inputTimer);
    this.speech.stop(); this.clearTarget(); this.card.hidden = true;
    this.shade.hidden = true;
    document.body.classList.remove('tutorial-open');
    document.querySelector('#tutorial-start').setAttribute('aria-expanded', 'false');
    if (returnFocus) this.focus(document.querySelector('#tutorial-start'));
  }
  playback(state) { if (this.active && this.step.action === state) this.advance(); }
  advance() {
    if (!this.active || this.step.done) return;
    this.cue(); this.index++; this.show();
  }
  speak(once = false) { this.speech.say(this.step.spoken || `${this.step.title} ${this.step.copy}`, once, this.step.audio); }
  show() {
    this.clearTarget(); clearTimeout(this.inputTimer);
    this.card.dataset.tutorialStep = this.index;
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
    let rect = this.target.getBoundingClientRect();
    this.card.classList.toggle('tutorial-left', innerWidth >= 700 && innerHeight < 500 && rect.left + rect.width / 2 > innerWidth / 2);
    const card = this.card.getBoundingClientRect();
    const overlapsBottom = rect.bottom + 12 > innerHeight - card.height - 24;
    this.card.classList.toggle('tutorial-top', overlapsBottom);
    const edge = this.card.getBoundingClientRect();
    // Leave the highlighted control clear of the prompt, even in short windows.
    if (rect.left < edge.right && rect.right > edge.left && rect.bottom > edge.top && rect.top < edge.bottom) {
      const desired = Math.max(12, Math.min(innerHeight - rect.height - 12, overlapsBottom ? edge.bottom + 26 : edge.top - rect.height - 26));
      const delta = rect.top - desired;
      if (Math.abs(delta) > 2) {
        window.scrollBy({ top: delta, behavior: 'instant' });
        rect = this.target.getBoundingClientRect();
      }
    }
    this.ring.hidden = rect.width === 0;
    Object.assign(this.ring.style, { left: `${rect.left - 7}px`, top: `${rect.top - 7}px`, width: `${rect.width + 14}px`, height: `${rect.height + 14}px` });
    this.setShade(rect);
  }
  setShade(rect) {
    this.shade.querySelector('svg').setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
    this.shade.querySelector('path').setAttribute('d', spotlightPath(rect, innerWidth, innerHeight));
  }
}
