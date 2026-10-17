export const STEPS = 4;
export const LOOP_BARS = [1, 2, 4];
export const TEMPO_MIN = 30;
export const TEMPO_MAX = 300;
export const SAVE_KEY = 'loop-club.song.v1';
// Retain the storage key so earlier songs migrate in place.
export const DRUM_TRACKS = 4;
export const DRUM_COLORS = ['#c9e77b', '#f29c80', '#8fd3cb', '#b7a8e7'];
export const DRUM_SOUNDS = {
  kick: { name: 'Kick', icon: 'kick' }, snare: { name: 'Snare', icon: 'snare' },
  hat: { name: 'Hat', icon: 'hat' }, clap: { name: 'Clap', icon: 'clap' },
  tom: { name: 'Tom', icon: 'drum' }, shaker: { name: 'Shaker', icon: 'shaker' },
  openhat: { name: 'Open hat', icon: 'hat' }, cowbell: { name: 'Cowbell', icon: 'bell' }
};
export const SYNTH_SOUNDS = {
  bass: { name: 'Bass', icon: 'wave' }, pluck: { name: 'Pluck', icon: 'notes' },
  arcade: { name: 'Game', icon: 'robot' }, bell: { name: 'Bell', icon: 'bell' }
};
export const NOTES = [
  { name: 'C', frequency: 130.8128, color: '#c9e77b' },
  { name: 'E♭', frequency: 155.5635, color: '#f0c66c' },
  { name: 'F', frequency: 174.6141, color: '#f29c80' },
  { name: 'G', frequency: 195.9977, color: '#e8a7cc' },
  { name: 'B♭', frequency: 233.0819, color: '#b7a8e7' },
  { name: 'C↑', frequency: 261.6256, color: '#8fd3cb' }
];

export const PRESETS = {
  breaks: {
    name: 'Jungle jump', genre: 'DRUM & BASS', tempo: 164, icon: 'bolt',
    drums: ['1000001000100000', '0000100000001000', '1010101110101011'],
    melody: [0, null, null, 0, null, null, 2, null, 3, null, 2, null, 1, null, null, 0],
    sound: { brightness: 48, length: 28, wobble: 30 }
  },
  club: {
    name: 'Robot dance', genre: 'TECHNO', tempo: 132, icon: 'robot',
    drums: ['1000100010001000', '0000100000001000', '0010001000100010'],
    melody: [0, null, 0, null, 3, null, 0, null, 0, null, 4, null, 3, null, 1, null],
    sound: { brightness: 60, length: 18, wobble: 10 }
  },
  float: {
    name: 'Moon bounce', genre: 'SPACE GROOVE', tempo: 104, icon: 'moon',
    drums: ['1000000010000010', '0000100000001000', '0010001000100011'],
    melody: [0, null, 2, null, 3, null, null, 5, 4, null, 3, null, 2, null, 1, null],
    sound: { brightness: 32, length: 65, wobble: 48 }
  },
  liquid: {
    name: 'Liquid lift', genre: 'LIQUID D&B', tempo: 172, icon: 'wave',
    drums: ['1000001000100010', '0000100000001000', '1010101010101011', '0000000100000001'],
    drumSounds: ['kick', 'snare', 'shaker', 'openhat'], synth: 'pluck',
    melody: [[0, 1, 3], null, null, 5, null, null, 3, null, [1, 3, 4], null, null, 5, null, 3, null, 1],
    sound: { brightness: 58, length: 62, wobble: 12 }
  },
  roller: {
    name: 'Roller skate', genre: 'DRUM & BASS', tempo: 176, icon: 'bolt',
    drums: ['1000000000100010', '0000100000001000', '1011101010111010', '0000001000000011'],
    drumSounds: ['kick', 'snare', 'hat', 'tom'], synth: 'bass',
    melody: [0, 0, null, 0, null, 3, 0, null, 0, null, 4, 3, null, 1, 0, null],
    sound: { brightness: 38, length: 32, wobble: 72 }
  },
  acid: {
    name: 'Acid ants', genre: 'ACID TECHNO', tempo: 138, icon: 'robot',
    drums: ['1000100010001000', '0000100000001000', '0010001000100010', '0001000000010001'],
    drumSounds: ['kick', 'clap', 'openhat', 'cowbell'], synth: 'bass',
    melody: [0, 3, 0, 5, 0, null, 1, 0, 3, 0, 4, 3, 0, 1, 0, 5],
    sound: { brightness: 82, length: 16, wobble: 67 }
  },
  disco: {
    name: 'Disco dots', genre: 'HOUSE', tempo: 122, icon: 'notes',
    drums: ['1000100010001000', '0000100000001000', '0010001000100010', '1001010010010100'],
    drumSounds: ['kick', 'clap', 'openhat', 'shaker'], synth: 'pluck',
    melody: [null, null, [0, 1, 3], null, null, null, [0, 1, 3], null, null, null, [1, 3, 4], null, null, [1, 3, 4], null, 5],
    sound: { brightness: 72, length: 36, wobble: 8 }
  },
  pixel: {
    name: 'Pixel party', genre: 'ARCADE', tempo: 148, icon: 'pad',
    drums: ['1000001010000010', '0000100000001000', '1010101010101111', '0000000100000001'],
    drumSounds: ['kick', 'snare', 'hat', 'cowbell'], synth: 'arcade',
    melody: [0, 3, 5, 3, 1, 3, 4, null, 2, 3, 5, 4, 3, 1, 0, null],
    sound: { brightness: 68, length: 20, wobble: 0 }
  },
  cloud: {
    name: 'Cloud chords', genre: 'CHILL OUT', tempo: 78, icon: 'moon',
    drums: ['1000000000100000', '0000100000001000', '0010001000100010', '0000000100000000'],
    drumSounds: ['kick', 'clap', 'shaker', 'tom'], synth: 'bell',
    melody: [[0, 1, 3], null, null, null, null, null, 5, null, [1, 3, 4], null, null, null, null, null, 2, null],
    sound: { brightness: 40, length: 88, wobble: 18 }
  }
};

const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (value, min, max) => Math.max(min, Math.min(max, Math.round(value)));
const index = (value, length) => Number.isInteger(value) && value >= 0 && value < length;

export function createSong(preset = 'breaks') {
  if (!Object.hasOwn(PRESETS, preset)) preset = 'breaks';
  const source = PRESETS[preset];
  return {
    version: 4, bars: 1, preset, tempo: source.tempo,
    drums: Array.from({ length: DRUM_TRACKS }, (_, row) => source.drums[row]
      ? Array.from({ length: STEPS }, (_, beat) => source.drums[row].slice(beat * 4, beat * 4 + 4).includes('1')) : Array(STEPS).fill(false)),
    drumSounds: [...(source.drumSounds || ['kick', 'snare', 'hat', 'clap'])], synth: source.synth || 'bass',
    melody: Array.from({ length: STEPS }, (_, beat) => {
      const note = source.melody.slice(beat * 4, beat * 4 + 4).find(note => note !== null);
      return note === undefined ? [] : Array.isArray(note) ? [...note] : [note];
    }), sound: { ...source.sound }
  };
}

export function restoreSong(raw) {
  try {
    const song = JSON.parse(raw);
    const bars = song?.version === 4 ? song.bars : 4;
    const steps = bars * STEPS;
    if (!song || ![1, 2, 3, 4].includes(song.version) || !LOOP_BARS.includes(bars) || !Object.hasOwn(PRESETS, song.preset) ||
      !Number.isInteger(song.tempo) || song.tempo < TEMPO_MIN || song.tempo > TEMPO_MAX ||
      !Array.isArray(song.drums) || song.drums.length !== (song.version === 1 ? 3 : DRUM_TRACKS) ||
      !song.drums.every(row => Array.isArray(row) && row.length === steps && row.every(value => typeof value === 'boolean')) ||
      !Array.isArray(song.melody) || song.melody.length !== steps ||
      !song.melody.every(notes => song.version < 3 ? notes === null || index(notes, NOTES.length)
        : Array.isArray(notes) && notes.length <= NOTES.length && notes.every(note => index(note, NOTES.length)) && new Set(notes).size === notes.length) ||
      !song.sound || !['brightness', 'length', 'wobble'].every(key =>
        Number.isInteger(song.sound[key]) && song.sound[key] >= 0 && song.sound[key] <= 100)) return null;
    if (song.version >= 2 && (!Array.isArray(song.drumSounds) || song.drumSounds.length !== DRUM_TRACKS ||
      !song.drumSounds.every(id => Object.hasOwn(DRUM_SOUNDS, id)) || !Object.hasOwn(SYNTH_SOUNDS, song.synth))) return null;
    // Select only known fields; saved data never supplies interface or audio objects.
    return {
      version: 4, bars, preset: song.preset, tempo: song.tempo,
      drums: song.version === 1 ? [...song.drums.map(row => [...row]), Array(16).fill(false)] : song.drums.map(row => [...row]),
      drumSounds: song.version === 1 ? ['kick', 'snare', 'hat', 'clap'] : [...song.drumSounds],
      synth: song.version === 1 ? 'bass' : song.synth,
      melody: song.melody.map(notes => song.version < 3 ? notes === null ? [] : [notes] : [...notes].sort((a, b) => a - b)),
      sound: { brightness: song.sound.brightness, length: song.sound.length, wobble: song.sound.wobble }
    };
  } catch { return null; }
}

export function editSong(song, edit) {
  const next = clone(song);
  const steps = song.bars * STEPS;
  if (edit.type === 'bars' && LOOP_BARS.includes(edit.value)) {
    const length = edit.value * STEPS;
    next.bars = edit.value;
    next.drums = song.drums.map(row => Array.from({ length }, (_, step) => row[step % steps]));
    next.melody = Array.from({ length }, (_, step) => [...song.melody[step % steps]]);
  } else if (edit.type === 'drum' && index(edit.row, DRUM_TRACKS) && index(edit.step, steps)) {
    next.drums[edit.row][edit.step] = !next.drums[edit.row][edit.step];
  } else if (edit.type === 'note' && index(edit.step, steps) && index(edit.note, NOTES.length)) {
    const notes = next.melody[edit.step];
    next.melody[edit.step] = notes.includes(edit.note) ? notes.filter(note => note !== edit.note) : [...notes, edit.note].sort((a, b) => a - b);
  } else if (edit.type === 'tempo' && Number.isFinite(edit.value)) {
    next.tempo = clamp(edit.value, TEMPO_MIN, TEMPO_MAX);
  } else if (edit.type === 'sound' && ['brightness', 'length', 'wobble'].includes(edit.key) && Number.isFinite(edit.value)) {
    next.sound[edit.key] = clamp(edit.value, 0, 100);
  } else if (edit.type === 'drumSound' && index(edit.row, DRUM_TRACKS) && Object.hasOwn(DRUM_SOUNDS, edit.value)) {
    next.drumSounds[edit.row] = edit.value;
  } else if (edit.type === 'synth' && Object.hasOwn(SYNTH_SOUNDS, edit.value)) {
    next.synth = edit.value;
  }
  return next;
}

export class SongHistory {
  constructor(song, limit = 40) {
    this.song = clone(song);
    this.past = [];
    this.limit = limit;
    this.group = null;
  }
  get canUndo() { return this.past.length > 0; }
  begin() { if (!this.group) this.group = { recorded: false }; }
  end() { this.group = null; }
  commit(next) {
    if (JSON.stringify(next) === JSON.stringify(this.song)) return false;
    if (!this.group || !this.group.recorded) {
      this.past.push(clone(this.song));
      if (this.past.length > this.limit) this.past.shift();
      if (this.group) this.group.recorded = true;
    }
    this.song = clone(next);
    return true;
  }
  undo() {
    this.end();
    if (this.canUndo) this.song = this.past.pop();
    return this.song;
  }
}
