export const STEPS = 4;
export const LOOP_BARS = [1, 2, 4];
export const TEMPO_MIN = 30;
export const TEMPO_MAX = 600;
export const SAVE_KEY = 'loop-club.song.v1';
export const SONG_BOOK_KEY = 'loop-club.songs.v1';
export const SONG_SLOTS = ['me1', 'me2', 'me3', 'last'];
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
  arcade: { name: 'Game', icon: 'robot' }, bell: { name: 'Bell', icon: 'bell' }, chime: { name: 'Chime', icon: 'sparkle' }
};
export const NOTES = [
  { name: 'C', frequency: 130.8128, color: '#c9e77b' },
  { name: 'E♭', frequency: 155.5635, color: '#f0c66c' },
  { name: 'F', frequency: 174.6141, color: '#f29c80' },
  { name: 'G', frequency: 195.9977, color: '#e8a7cc' },
  { name: 'B♭', frequency: 233.0819, color: '#b7a8e7' },
  { name: 'C↑', frequency: 261.6256, color: '#8fd3cb' }
];

// Authored directly as whole-beat boxes. Each pitch stores its own brush.
export const PRESETS = {
  breaks: {
    name: "Jungle jump", genre: "DRUM & BASS", bars: 1, tempo: 164, icon: "bolt",
    drums: ["1010", "0101", "1111", "0000"],
    drumSounds: ["kick", "snare", "hat", "clap"], synth: "bass",
    melody: [{"0": "bass"}, null, {"3": "bass"}, {"1": "bass"}],
    sound: {"brightness": 48, "length": 24, "wobble": 24}
  },
  club: {
    name: "Robot dance", genre: "TECHNO", bars: 2, tempo: 264, icon: "robot",
    drums: ["10101010", "00100010", "01010101", "00010001"],
    drumSounds: ["kick", "clap", "openhat", "cowbell"], synth: "arcade",
    melody: [{"0": "bass"}, {"3": "arcade"}, {"0": "bass"}, {"5": "arcade"}, {"0": "bass"}, {"4": "arcade"}, {"2": "bass"}, {"3": "arcade", "5": "chime"}],
    sound: {"brightness": 64, "length": 20, "wobble": 10}
  },
  float: {
    name: "Moon bounce", genre: "SPACE GROOVE", bars: 2, tempo: 112, icon: "moon",
    drums: ["10001000", "00100010", "01010101", "00000001"],
    drumSounds: ["kick", "clap", "shaker", "tom"], synth: "chime",
    melody: [{"0": "bell", "3": "bell", "5": "chime"}, null, {"4": "chime"}, null, {"1": "bell", "3": "bell", "5": "chime"}, null, {"2": "chime"}, {"3": "chime"}],
    sound: {"brightness": 62, "length": 70, "wobble": 22}
  },
  liquid: {
    name: "Liquid lift", genre: "LIQUID D&B", bars: 4, tempo: 344, icon: "wave",
    drums: ["1000010010100100", "0010001000100010", "1111111111111111", "0000000100000101"],
    drumSounds: ["kick", "snare", "shaker", "openhat"], synth: "chime",
    melody: [{"0": "bass", "1": "pluck", "3": "pluck"}, null, {"5": "chime"}, {"0": "bass"}, null, {"3": "chime"}, {"2": "bass"}, {"4": "chime"}, {"1": "bass", "3": "pluck", "4": "pluck"}, null, {"5": "chime"}, {"1": "bass"}, {"3": "chime"}, null, {"3": "bass"}, {"2": "chime", "5": "chime"}],
    sound: {"brightness": 66, "length": 42, "wobble": 12}
  },
  roller: {
    name: "Roller skate", genre: "DRUM & BASS", bars: 4, tempo: 352, icon: "bolt",
    drums: ["1001000010010100", "0010001000100010", "1111111111111111", "0000000100000011"],
    drumSounds: ["kick", "snare", "hat", "tom"], synth: "bass",
    melody: [{"0": "bass"}, {"0": "bass"}, null, {"3": "bass"}, {"0": "bass"}, null, {"4": "pluck"}, {"1": "bass"}, {"0": "bass"}, {"0": "bass"}, null, {"2": "bass"}, {"3": "arcade"}, {"1": "bass"}, null, {"0": "bass", "5": "chime"}],
    sound: {"brightness": 42, "length": 19, "wobble": 62}
  },
  acid: {
    name: "Acid ants", genre: "ACID TECHNO", bars: 2, tempo: 276, icon: "robot",
    drums: ["10101010", "00100010", "01010101", "00010001"],
    drumSounds: ["kick", "clap", "openhat", "cowbell"], synth: "bass",
    melody: [{"0": "bass"}, {"3": "bass"}, {"0": "bass"}, {"5": "arcade"}, {"1": "bass"}, {"3": "bass"}, {"2": "bass"}, {"5": "chime"}],
    sound: {"brightness": 86, "length": 15, "wobble": 72}
  },
  disco: {
    name: "Disco dots", genre: "HOUSE", bars: 2, tempo: 244, icon: "notes",
    drums: ["10101010", "00100010", "01010101", "10010100"],
    drumSounds: ["kick", "clap", "openhat", "shaker"], synth: "pluck",
    melody: [{"0": "pluck", "1": "pluck", "3": "pluck"}, null, {"5": "chime"}, null, {"1": "pluck", "3": "pluck", "4": "pluck"}, null, {"3": "chime"}, {"4": "chime"}],
    sound: {"brightness": 72, "length": 38, "wobble": 8}
  },
  pixel: {
    name: "Pixel party", genre: "ARCADE", bars: 4, tempo: 296, icon: "pad",
    drums: ["1000100010001000", "0010001000100010", "0101010101010111", "0000000100000001"],
    drumSounds: ["kick", "snare", "hat", "cowbell"], synth: "arcade",
    melody: [{"0": "bass", "3": "arcade"}, {"5": "arcade"}, {"4": "arcade"}, {"5": "chime"}, {"2": "arcade"}, {"3": "arcade"}, null, {"4": "chime"}, {"1": "bass", "3": "arcade"}, {"4": "arcade"}, {"5": "arcade"}, {"3": "chime"}, {"2": "arcade"}, {"1": "arcade"}, {"0": "bass", "3": "arcade"}, {"5": "chime"}],
    sound: {"brightness": 76, "length": 23, "wobble": 0}
  },
  cloud: {
    name: "Cloud chords", genre: "CHILL OUT", bars: 4, tempo: 112, icon: "moon",
    drums: ["1000000010000000", "0000100000001000", "0010001000100010", "0000000100000001"],
    drumSounds: ["kick", "clap", "shaker", "tom"], synth: "chime",
    melody: [{"0": "bell", "1": "bell", "3": "bell", "5": "chime"}, null, null, {"4": "chime"}, null, {"3": "chime"}, null, null, {"1": "bell", "3": "bell", "4": "bell", "5": "chime"}, null, null, {"3": "chime"}, null, {"2": "chime"}, null, {"5": "chime"}],
    sound: {"brightness": 56, "length": 86, "wobble": 18}
  }
};

const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (value, min, max) => Math.max(min, Math.min(max, Math.round(value)));
const index = (value, length) => Number.isInteger(value) && value >= 0 && value < length;
const MAX_STEPS = STEPS * LOOP_BARS.at(-1);
const blankPattern = length => ({
  drums: Array.from({ length: DRUM_TRACKS }, () => Array(length).fill(false)),
  melody: Array.from({ length }, () => []),
  noteSounds: Array.from({ length }, () => Array(NOTES.length).fill(null))
});
function initialHidden(song) {
  const length = MAX_STEPS - song.melody.length;
  if (song.bars !== 1) return blankPattern(length);
  return {
    drums: song.drums.map(row => Array.from({ length }, (_, step) => row[step % STEPS])),
    melody: Array.from({ length }, (_, step) => [...song.melody[step % STEPS]]),
    noteSounds: Array.from({ length }, (_, step) => [...song.noteSounds[step % STEPS]])
  };
}
function validHidden(pattern, length) {
  return pattern && Array.isArray(pattern.drums) && pattern.drums.length === DRUM_TRACKS &&
    pattern.drums.every(row => Array.isArray(row) && row.length === length && row.every(hit => typeof hit === 'boolean')) &&
    Array.isArray(pattern.melody) && pattern.melody.length === length && pattern.melody.every(notes =>
      Array.isArray(notes) && notes.length <= NOTES.length && notes.every(note => index(note, NOTES.length)) && new Set(notes).size === notes.length) &&
    Array.isArray(pattern.noteSounds) && pattern.noteSounds.length === length && pattern.noteSounds.every((row, step) =>
      Array.isArray(row) && row.length === NOTES.length && row.every((id, pitch) => pattern.melody[step].includes(pitch)
        ? typeof id === 'string' && Object.hasOwn(SYNTH_SOUNDS, id) : id === null));
}
function copyHidden(pattern) {
  return { drums: pattern.drums.map(row => [...row]), melody: pattern.melody.map(notes => [...notes].sort((a,b) => a-b)), noteSounds: pattern.noteSounds.map(row => [...row]) };
}


export function createSong(preset = 'breaks') {
  if (!Object.hasOwn(PRESETS, preset)) preset = 'breaks';
  const source = PRESETS[preset];
  const synth = source.synth || 'bass';
  const melody = source.melody.map(column => column ? Object.keys(column).map(Number).sort((a, b) => a - b) : []);
  const song = {
    version: 6, bars: source.bars, preset, tempo: source.tempo,
    drums: source.drums.map(row => [...row].map(hit => hit === '1')),
    drumSounds: [...source.drumSounds], synth, melody,
    noteSounds: source.melody.map(column => NOTES.map((_, pitch) => column?.[pitch] || null)),
    sound: { ...source.sound }
  };
  song.hidden = initialHidden(song);
  return song;
}

export function restoreSong(raw) {
  try {
    const song = JSON.parse(raw);
    const bars = song?.version >= 4 ? song.bars : 4;
    const steps = bars * STEPS;
    if (!song || ![1, 2, 3, 4, 5, 6].includes(song.version) || !LOOP_BARS.includes(bars) || !Object.hasOwn(PRESETS, song.preset) ||
      !Number.isInteger(song.tempo) || song.tempo < TEMPO_MIN || song.tempo > TEMPO_MAX ||
      !Array.isArray(song.drums) || song.drums.length !== (song.version === 1 ? 3 : DRUM_TRACKS) ||
      !song.drums.every(row => Array.isArray(row) && row.length === steps && row.every(value => typeof value === 'boolean')) ||
      !Array.isArray(song.melody) || song.melody.length !== steps ||
      !song.melody.every(notes => song.version < 3 ? notes === null || index(notes, NOTES.length)
        : Array.isArray(notes) && notes.length <= NOTES.length && notes.every(note => index(note, NOTES.length)) && new Set(notes).size === notes.length) ||
      !song.sound || !['brightness', 'length', 'wobble'].every(key =>
        Number.isInteger(song.sound[key]) && song.sound[key] >= 0 && song.sound[key] <= 100)) return null;
    if (song.version >= 2 && (!Array.isArray(song.drumSounds) || song.drumSounds.length !== DRUM_TRACKS ||
      !song.drumSounds.every(id => typeof id === 'string' && Object.hasOwn(DRUM_SOUNDS, id)) || typeof song.synth !== 'string' || !Object.hasOwn(SYNTH_SOUNDS, song.synth))) return null;
    const melody = song.melody.map(notes => song.version < 3 ? notes === null ? [] : [notes] : [...notes].sort((a, b) => a - b));
    const synth = song.version === 1 ? 'bass' : song.synth;
    if (song.version >= 5 && (!Array.isArray(song.noteSounds) || song.noteSounds.length !== steps ||
      !song.noteSounds.every((row, step) => Array.isArray(row) && row.length === NOTES.length && row.every((id, pitch) =>
        melody[step].includes(pitch) ? typeof id === 'string' && Object.hasOwn(SYNTH_SOUNDS, id) : id === null)))) return null;
    if (song.version === 6 && !validHidden(song.hidden, MAX_STEPS - steps)) return null;
    if (song.slot !== undefined && !SONG_SLOTS.includes(song.slot)) return null;
    // Select only known fields; saved data never supplies interface or audio objects.
    const restored = {
      version: 6, bars, preset: song.preset, tempo: song.tempo,
      drums: song.version === 1 ? [...song.drums.map(row => [...row]), Array(16).fill(false)] : song.drums.map(row => [...row]),
      drumSounds: song.version === 1 ? ['kick', 'snare', 'hat', 'clap'] : [...song.drumSounds],
      synth, melody,
      noteSounds: song.version >= 5 ? song.noteSounds.map(row => [...row]) : melody.map(notes => NOTES.map((_, pitch) => notes.includes(pitch) ? synth : null)),
      sound: { brightness: song.sound.brightness, length: song.sound.length, wobble: song.sound.wobble }
    };
    restored.hidden = song.version === 6 ? copyHidden(song.hidden) : initialHidden(restored);
    if (song.slot !== undefined) restored.slot = song.slot;
    return restored;
  } catch { return null; }
}

export function clearSong(song) {
  const empty = clone(song);
  empty.drums = empty.drums.map(row => row.map(() => false));
  empty.melody = empty.melody.map(() => []);
  empty.noteSounds = empty.noteSounds.map(row => row.map(() => null));
  empty.hidden = blankPattern(MAX_STEPS - empty.melody.length);
  return empty;
}

export function createSlotSong(slot) {
  if (!SONG_SLOTS.includes(slot)) throw new Error('Unknown song slot');
  return { ...clearSong(createSong()), tempo: 120, slot };
}

export function restoreSongBook(raw) {
  const book = { version: 1, slots: {} };
  try {
    const saved = JSON.parse(raw);
    if (saved?.version !== 1 || !saved.slots || typeof saved.slots !== 'object') return book;
    for (const slot of SONG_SLOTS) {
      const song = restoreSong(JSON.stringify(saved.slots[slot]));
      if (song) book.slots[slot] = { ...song, slot };
    }
  } catch { /* A damaged slot never prevents opening the instrument. */ }
  return book;
}

export function saveSlotSong(book, song) {
  if (!SONG_SLOTS.includes(song.slot)) return book;
  return { version: 1, slots: { ...book.slots, [song.slot]: clone(song) } };
}

export function openSlotSong(book, slot) {
  if (!SONG_SLOTS.includes(slot)) throw new Error('Unknown song slot');
  return book.slots[slot] ? clone(book.slots[slot]) : createSlotSong(slot);
}

export function editedSlotSong(before, after) {
  return JSON.stringify(before) === JSON.stringify(after) ? after : { ...after, slot: before.slot || 'last' };
}

export function editSong(song, edit) {
  const next = clone(song);
  const steps = song.bars * STEPS;
  if (edit.type === 'bars' && LOOP_BARS.includes(edit.value)) {
    const length = edit.value * STEPS;
    const full = {
      drums: song.drums.map((row, index) => [...row, ...song.hidden.drums[index]]),
      melody: [...song.melody, ...song.hidden.melody].map(notes => [...notes]),
      noteSounds: [...song.noteSounds, ...song.hidden.noteSounds].map(row => [...row])
    };
    next.bars = edit.value;
    next.drums = full.drums.map(row => row.slice(0, length));
    next.melody = full.melody.slice(0, length);
    next.noteSounds = full.noteSounds.slice(0, length);
    next.hidden = { drums: full.drums.map(row => row.slice(length)), melody: full.melody.slice(length), noteSounds: full.noteSounds.slice(length) };
  } else if (edit.type === 'drum' && index(edit.row, DRUM_TRACKS) && index(edit.step, steps)) {
    next.drums[edit.row][edit.step] = !next.drums[edit.row][edit.step];
  } else if (edit.type === 'note' && index(edit.step, steps) && index(edit.note, NOTES.length)) {
    const instrument = edit.instrument === undefined ? next.synth : edit.instrument;
    if (typeof instrument !== 'string' || !Object.hasOwn(SYNTH_SOUNDS, instrument)) return next;
    const notes = next.melody[edit.step];
    if (next.noteSounds[edit.step][edit.note] === instrument) {
      next.melody[edit.step] = notes.filter(note => note !== edit.note);
      next.noteSounds[edit.step][edit.note] = null;
    } else {
      if (!notes.includes(edit.note)) next.melody[edit.step] = [...notes, edit.note].sort((a, b) => a - b);
      next.noteSounds[edit.step][edit.note] = instrument;
    }
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
