import { NOTES } from './model.js';

const noiseBuffers = new WeakMap();

export function scheduledSteps(clock, now, tempo) {
  const bpm = Number.isFinite(tempo) ? Math.max(80, Math.min(180, tempo)) : 120;
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

export function drumVoice(context, destination, row, time) {
  if (row === 0) {
    const osc = context.createOscillator();
    const gain = envelope(context, destination, time, 0.24, 0.8);
    osc.frequency.setValueAtTime(155, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    osc.connect(gain);
    return voice([osc], [gain], time, 0.24);
  }
  const hat = row === 2;
  const duration = hat ? 0.065 : 0.16;
  const source = context.createBufferSource();
  source.buffer = noiseBuffer(context);
  const filter = context.createBiquadFilter();
  filter.type = 'highpass'; filter.frequency.value = hat ? 6500 : 1400;
  const gain = envelope(context, destination, time, duration, hat ? 0.2 : 0.4);
  source.connect(filter); filter.connect(gain);
  const sources = [source], nodes = [filter, gain];
  if (!hat) {
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

export function synthVoice(context, destination, note, time, sound, tempo) {
  const duration = 0.08 + sound.length / 100 * 0.55;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass'; filter.Q.value = 1.8;
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
  oscillator.type = 'sawtooth'; oscillator.frequency.value = NOTES[note].frequency;
  oscillator.connect(filter);
  const sub = context.createOscillator();
  sub.type = 'sine'; sub.frequency.value = NOTES[note].frequency / 2;
  const subGain = context.createGain(); subGain.gain.value = 0.55;
  sub.connect(subGain); subGain.connect(gain);
  return voice([oscillator, sub], [filter, gain, subGain], time, duration);
}

export class AudioEngine {
  constructor(getSong, onStep, onState, onError) {
    this.getSong = getSong; this.onStep = onStep; this.onState = onState; this.onError = onError;
    this.context = null; this.playing = false; this.pending = false;
    this.generation = 0; this.timer = null; this.visuals = new Set(); this.voices = new Set();
    this.volume = 0.55;
  }

  ensureGraph() {
    if (this.context) return;
    const Constructor = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Constructor) throw new Error('This browser cannot play the synth. Try a recent Chrome browser.');
    this.context = new Constructor();
    this.master = this.context.createGain();
    this.master.gain.value = this.volume * 0.65;
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
    handle.onended = () => this.voices.delete(handle);
  }

  tick() {
    if (!this.playing) return;
    const song = this.getSong();
    for (const { step, time } of scheduledSteps(this.clock, this.context.currentTime, song.tempo)) {
      song.drums.forEach((row, index) => { if (row[step]) this.track(drumVoice(this.context, this.bus, index, time)); });
      if (song.melody[step] !== null) this.track(synthVoice(this.context, this.bus, song.melody[step], time, song.sound, song.tempo));
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
    }
    this.onStep(-1); this.onState('stopped');
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master) this.master.gain.setTargetAtTime(this.volume * 0.65, this.context.currentTime, 0.02);
  }

  async audition(kind, value) {
    const generation = this.generation;
    try {
      await this.ready();
      if (generation !== this.generation || globalThis.document?.hidden) return;
      const now = this.context.currentTime + 0.005;
      const song = this.getSong();
      this.track(kind === 'drum'
        ? drumVoice(this.context, this.compressor, value, now)
        : synthVoice(this.context, this.compressor, value, now, song.sound, song.tempo));
    } catch (error) { this.onError(error.message); }
  }
}
