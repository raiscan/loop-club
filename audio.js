import { NOTES, TEMPO_MIN, TEMPO_MAX } from './model.js?v=8';

const noiseBuffers = new WeakMap();

export function scheduledSteps(clock, now, tempo) {
  const bpm = Number.isFinite(tempo) ? Math.max(TEMPO_MIN, Math.min(TEMPO_MAX, tempo)) : 120;
  if (clock.nextTime < now - 0.1) clock.nextTime = now + 0.025;
  const events = [];
  while (clock.nextTime < now + 0.09 && events.length < 4) {
    events.push({ step: clock.step, time: clock.nextTime });
    clock.nextTime += 60 / bpm / 4;
    clock.step = (clock.step + 1) % 16;
  }
  return events;
}

function noiseBuffer(context) {
  if (!noiseBuffers.has(context)) {
    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffers.set(context, buffer);
  }
  return noiseBuffers.get(context);
}

function envelope(context, destination, time, duration, level) {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(level, time + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  gain.connect(destination);
  return gain;
}

// One short voice owns and releases its nodes; no oscillators run between notes.
function voice(sources, nodes, time, duration) {
  const end = time + duration + 0.025;
  let remaining = sources.length;
  const handle = {
    stop(at) { for (const source of sources) { try { source.stop(at); } catch { /* Already ended. */ } } },
    onended: null
  };
  for (const source of sources) {
    source.onended = () => {
      if (--remaining === 0) {
        for (const node of [...sources, ...nodes]) node.disconnect();
        handle.onended?.();
      }
    };
    source.start(time);
    source.stop(end);
  }
  return handle;
}

export function drumVoice(context, destination, instrument, time) {
  const sound = typeof instrument === 'number' ? ['kick', 'snare', 'hat', 'clap'][instrument] : instrument;
  if (sound === 'kick' || sound === 'tom') {
    const tom = sound === 'tom';
    const osc = context.createOscillator();
    const duration = tom ? 0.32 : 0.24;
    const gain = envelope(context, destination, time, duration, tom ? 0.5 : 0.8);
    osc.frequency.setValueAtTime(tom ? 250 : 155, time);
    osc.frequency.exponentialRampToValueAtTime(tom ? 90 : 45, time + (tom ? 0.22 : 0.12));
    osc.connect(gain);
    return voice([osc], [gain], time, duration);
  }
  if (sound === 'cowbell') {
    const gain = envelope(context, destination, time, 0.19, 0.17);
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = 900; filter.Q.value = 0.8;
    filter.connect(gain);
    const sources = [540, 800].map(frequency => {
      const osc = context.createOscillator();
      osc.type = 'square'; osc.frequency.value = frequency; osc.connect(filter);
      return osc;
    });
    return voice(sources, [filter, gain], time, 0.19);
  }
  const durations = { snare: 0.16, hat: 0.065, clap: 0.2, shaker: 0.11, openhat: 0.32 };
  const duration = durations[sound];
  if (!duration) throw new Error(`Unknown drum sound: ${sound}`);
  const source = context.createBufferSource();
  source.buffer = noiseBuffer(context);
  const filter = context.createBiquadFilter();
  filter.type = sound === 'clap' || sound === 'shaker' ? 'bandpass' : 'highpass';
  filter.frequency.value = { snare: 1400, hat: 6500, clap: 1700, shaker: 5000, openhat: 5600 }[sound];
  filter.Q.value = 0.8;
  const level = { snare: 0.4, hat: 0.2, clap: 0.5, shaker: 0.3, openhat: 0.15 }[sound];
  const gain = envelope(context, destination, time, duration, level);
  if (sound === 'clap') {
    gain.gain.cancelScheduledValues(time);
    gain.gain.setValueAtTime(0.0001, time);
    for (const offset of [0, 0.018, 0.036]) {
      gain.gain.exponentialRampToValueAtTime(level, time + offset + 0.001);
      gain.gain.exponentialRampToValueAtTime(0.025, time + offset + 0.012);
    }
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  }
  source.connect(filter); filter.connect(gain);
  const sources = [source], nodes = [filter, gain];
  if (sound === 'snare') {
    const body = context.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(190, time);
    body.frequency.exponentialRampToValueAtTime(100, time + 0.07);
    const bodyGain = envelope(context, destination, time, 0.1, 0.16);
    body.connect(bodyGain);
    sources.push(body); nodes.push(bodyGain);
  }
  return voice(sources, nodes, time, duration);
}

export function synthVoice(context, destination, note, time, sound, tempo, instrument = 'bass') {
  const duration = (0.08 + sound.length / 100 * 0.55) * (instrument === 'bell' ? 1.4 : instrument === 'pluck' ? 0.7 : 1);
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass'; filter.Q.value = instrument === 'bass' ? 1.8 : 0.6;
  const cutoff = 160 + (sound.brightness / 100) ** 2 * 6500;
  // Movement sweeps the filter in tempo, with phase shared across notes.
  const movement = sound.wobble / 100;
  const curve = new Float32Array(48);
  for (let i = 0; i < curve.length; i++) {
    const phase = (time + duration * i / (curve.length - 1)) * tempo / 60 * 2 * Math.PI;
    curve[i] = Math.max(90, cutoff * (1 - movement * 0.85 * (0.5 + 0.5 * Math.sin(phase * 2))));
  }
  filter.frequency.setValueCurveAtTime(curve, time, duration);
  const gain = envelope(context, destination, time, duration, 0.28);
  filter.connect(gain);
  const oscillator = context.createOscillator();
  oscillator.type = { bass: 'sawtooth', pluck: 'triangle', arcade: 'square', bell: 'sine' }[instrument] || 'sawtooth';
  const frequency = NOTES[note].frequency * (instrument === 'bass' ? 1 : 2);
  oscillator.frequency.value = frequency;
  oscillator.connect(filter);
  const sub = context.createOscillator();
  sub.type = 'sine';
  sub.frequency.value = frequency * (instrument === 'bass' ? 0.5 : instrument === 'bell' ? 2.76 : 2);
  const subGain = context.createGain(); subGain.gain.value = instrument === 'bass' ? 0.55 : 0.3;
  sub.connect(subGain); subGain.connect(gain);
  return voice([oscillator, sub], [filter, gain, subGain], time, duration);
}

export function synthChord(context, destination, notes, time, sound, tempo, instrument = 'bass') {
  if (!notes.length) return null;
  const mix = context.createGain();
  mix.gain.value = 1 / Math.sqrt(notes.length);
  mix.connect(destination);
  const voices = notes.map(note => synthVoice(context, mix, note, time, sound, tempo, instrument));
  let remaining = voices.length;
  const chord = { stop(at) { voices.forEach(handle => handle.stop(at)); }, onended: null };
  voices.forEach(handle => {
    handle.onended = () => {
      if (--remaining === 0) { mix.disconnect(); chord.onended?.(); }
    };
  });
  return chord;
}

export function tutorialCue(context, destination, time) {
  const gain = envelope(context, destination, time, 0.24, 0.12);
  const tone = context.createOscillator(); tone.type = 'sine';
  tone.frequency.setValueAtTime(523.25, time);
  tone.frequency.setValueAtTime(783.99, time + 0.09);
  tone.connect(gain);
  return voice([tone], [gain], time, 0.24);
}

export class AudioEngine {
  constructor(getSong, onStep, onState, onError) {
    this.getSong = getSong; this.onStep = onStep; this.onState = onState; this.onError = onError;
    this.context = null; this.playing = false; this.pending = false;
    this.generation = 0; this.timer = null; this.visuals = new Set(); this.voices = new Set();
    this.previewChord = null;
    this.volume = 0.55; this.ducked = false;
  }

  ensureGraph() {
    if (this.context) return;
    const Constructor = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Constructor) throw new Error('This browser cannot play the synth. Try a recent Chrome browser.');
    this.context = new Constructor();
    this.master = this.context.createGain();
    this.master.gain.value = this.volume * 0.65 * (this.ducked ? 0.25 : 1);
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -12;
    this.compressor.ratio.value = 6;
    this.compressor.knee.value = 12;
    this.compressor.connect(this.master); this.master.connect(this.context.destination);
    this.bus = this.context.createGain(); this.bus.connect(this.compressor);
    this.context.addEventListener('statechange', () => {
      if (this.playing && this.context.state !== 'running') this.stop();
    });
  }

  async ready() {
    this.ensureGraph();
    if (this.context.state !== 'running') {
      let timeout;
      try {
        await Promise.race([
          this.context.resume(),
          new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Tap Play once to turn on sound, then use your controller.')), 1800); })
        ]);
      } finally { clearTimeout(timeout); }
    }
    if (this.context.state !== 'running') throw new Error('Tap Play to turn on sound.');
  }

  async start() {
    if (this.playing || this.pending) return;
    const generation = ++this.generation;
    this.pending = true; this.onState('starting');
    try {
      await this.ready();
      if (generation !== this.generation || globalThis.document?.hidden) return;
      this.pending = false; this.playing = true;
      this.bus.gain.cancelScheduledValues(this.context.currentTime);
      this.bus.gain.setValueAtTime(1, this.context.currentTime);
      this.clock = { step: 0, nextTime: this.context.currentTime + 0.035 };
      this.onState('playing');
      this.tick();
      this.timer = setInterval(() => this.tick(), 25);
    } catch (error) {
      if (generation === this.generation) { this.pending = false; this.onState('stopped'); this.onError(error.message); }
    }
  }

  track(handle) {
    this.voices.add(handle);
    handle.onended = () => {
      this.voices.delete(handle);
      if (this.previewChord === handle) this.previewChord = null;
    };
  }

  tick() {
    if (!this.playing) return;
    const song = this.getSong();
    for (const { step, time } of scheduledSteps(this.clock, this.context.currentTime, song.tempo)) {
      song.drums.forEach((row, index) => { if (row[step]) this.track(drumVoice(this.context, this.bus, song.drumSounds[index], time)); });
      if (song.melody[step].length) this.track(synthChord(this.context, this.bus, song.melody[step], time, song.sound, song.tempo, song.synth));
      const timer = setTimeout(() => {
        this.visuals.delete(timer);
        if (this.playing) this.onStep(step);
      }, Math.max(0, (time - this.context.currentTime) * 1000));
      this.visuals.add(timer);
    }
  }

  stop() {
    ++this.generation; this.pending = false; this.playing = false;
    clearInterval(this.timer); this.timer = null;
    for (const timer of this.visuals) clearTimeout(timer);
    this.visuals.clear();
    if (this.context) {
      const now = this.context.currentTime;
      this.bus.gain.cancelScheduledValues(now);
      this.bus.gain.setTargetAtTime(0, now, 0.008);
      for (const handle of this.voices) handle.stop(now + 0.025);
      this.voices.clear();
      this.previewChord = null;
    }
    this.onStep(-1); this.onState('stopped');
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master) this.master.gain.setTargetAtTime(this.volume * 0.65 * (this.ducked ? 0.25 : 1), this.context.currentTime, 0.02);
  }

  setDucked(value) {
    this.ducked = value; this.setVolume(this.volume);
  }

  async feedback() {
    const generation = this.generation;
    try {
      await this.ready();
      if (generation !== this.generation || globalThis.document?.hidden) return;
      this.track(tutorialCue(this.context, this.compressor, this.context.currentTime + 0.005));
    } catch { /* Visual guidance still works when audio is blocked. */ }
  }

  async audition(kind, value) {
    const generation = this.generation;
    try {
      await this.ready();
      if (generation !== this.generation || globalThis.document?.hidden) return;
      const now = this.context.currentTime + 0.005;
      const song = this.getSong();
      if (kind === 'chord') this.previewChord?.stop(now);
      const handle = kind === 'drum'
        ? drumVoice(this.context, this.compressor, song.drumSounds[value], now)
        : synthChord(this.context, this.compressor, kind === 'chord' ? value : [value], now, song.sound, song.tempo, song.synth);
      if (handle) this.track(handle);
      if (kind === 'chord') this.previewChord = handle;
    } catch (error) { this.onError(error.message); }
  }
}
