export const STEPS = 16;
export const SAVE_KEY = 'loop-club.song.v1';
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
  }
};

const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (value, min, max) => Math.max(min, Math.min(max, Math.round(value)));
const index = (value, length) => Number.isInteger(value) && value >= 0 && value < length;

export function createSong(preset = 'breaks') {
  if (!Object.hasOwn(PRESETS, preset)) preset = 'breaks';
  const source = PRESETS[preset];
  return {
    version: 1, preset, tempo: source.tempo,
    drums: source.drums.map(row => [...row].map(value => value === '1')),
    melody: [...source.melody], sound: { ...source.sound }
  };
}

export function restoreSong(raw) {
  try {
    const song = JSON.parse(raw);
    if (!song || song.version !== 1 || !Object.hasOwn(PRESETS, song.preset) ||
      !Number.isInteger(song.tempo) || song.tempo < 80 || song.tempo > 180 ||
      !Array.isArray(song.drums) || song.drums.length !== 3 ||
      !song.drums.every(row => Array.isArray(row) && row.length === STEPS && row.every(value => typeof value === 'boolean')) ||
      !Array.isArray(song.melody) || song.melody.length !== STEPS ||
      !song.melody.every(note => note === null || index(note, NOTES.length)) ||
      !song.sound || !['brightness', 'length', 'wobble'].every(key =>
        Number.isInteger(song.sound[key]) && song.sound[key] >= 0 && song.sound[key] <= 100)) return null;
    // Select only known fields; saved data never supplies interface or audio objects.
    return {
      version: 1, preset: song.preset, tempo: song.tempo,
      drums: song.drums.map(row => [...row]), melody: [...song.melody],
      sound: { brightness: song.sound.brightness, length: song.sound.length, wobble: song.sound.wobble }
    };
  } catch { return null; }
}

export function editSong(song, edit) {
  const next = clone(song);
  if (edit.type === 'drum' && index(edit.row, 3) && index(edit.step, STEPS)) {
    next.drums[edit.row][edit.step] = !next.drums[edit.row][edit.step];
  } else if (edit.type === 'note' && index(edit.step, STEPS) && index(edit.note, NOTES.length)) {
    next.melody[edit.step] = next.melody[edit.step] === edit.note ? null : edit.note;
  } else if (edit.type === 'tempo' && Number.isFinite(edit.value)) {
    next.tempo = clamp(edit.value, 80, 180);
  } else if (edit.type === 'sound' && ['brightness', 'length', 'wobble'].includes(edit.key) && Number.isFinite(edit.value)) {
    next.sound[edit.key] = clamp(edit.value, 0, 100);
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
