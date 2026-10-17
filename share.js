import { createSong, restoreSong } from './model.js?v=31';

// Wire IDs are permanent. Append future sounds; never reorder these lists.
const PRESETS = ['breaks', 'club', 'float', 'liquid', 'roller', 'acid', 'disco', 'pixel', 'cloud'];
const DRUMS = ['kick', 'snare', 'hat', 'clap', 'tom', 'shaker', 'openhat', 'cowbell'];
const SOUNDS = ['bass', 'pluck', 'arcade', 'bell', 'chime'];
const DATA_BYTES = 69, PACKET_BYTES = 73;

function checksum(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
const base64 = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function encodeSong(value) {
  const song = restoreSong(JSON.stringify(value));
  if (!song) throw new TypeError('This song cannot be shared.');
  const bytes = new Uint8Array(PACKET_BYTES);
  const settings = SOUNDS.flatMap(id => ['brightness', 'length', 'wobble'].map(key => song.sounds[id][key]));
  bytes.set([2, PRESETS.indexOf(song.preset), song.bars, song.tempo >>> 8, song.tempo & 255,
    ...song.drumSounds.map(id => DRUMS.indexOf(id)), SOUNDS.indexOf(song.synth),
    ...settings.slice(0, 3)]);
  bytes.set(settings.slice(3), 57);
  let cursor = 13 * 8;
  const put = (value, length) => {
    for (let bit = 0; bit < length; bit++, cursor++) bytes[cursor >>> 3] |= ((value >>> bit) & 1) << (cursor & 7);
  };
  song.drums.forEach((row, index) => [...row, ...song.hidden.drums[index]].forEach(hit => put(Number(hit), 1)));
  [...song.noteSounds, ...song.hidden.noteSounds].forEach(row => row.forEach(id => put(id === null ? 0 : SOUNDS.indexOf(id) + 1, 3)));
  new DataView(bytes.buffer).setUint32(DATA_BYTES, checksum(bytes.subarray(0, DATA_BYTES)));
  return base64(bytes);
}

export function decodeSong(code) {
  if (typeof code !== 'string' || !/^(?:[A-Za-z0-9_-]{82}|[A-Za-z0-9_-]{98})$/.test(code)) return null;
  try {
    const bytes = Uint8Array.from(atob(code.replace(/-/g, '+').replace(/_/g, '/') + '=='), char => char.charCodeAt(0));
    const dataBytes = bytes[0] === 1 ? 57 : bytes[0] === 2 ? DATA_BYTES : 0;
    if (!dataBytes || bytes.length !== dataBytes + 4 || base64(bytes) !== code ||
      bytes[1] >= PRESETS.length || ![1, 2, 4].includes(bytes[2]) ||
      [...bytes.subarray(5, 9)].some(id => id >= DRUMS.length) || bytes[9] >= SOUNDS.length ||
      new DataView(bytes.buffer).getUint32(dataBytes) !== checksum(bytes.subarray(0, dataBytes))) return null;
    let cursor = 13 * 8;
    const take = length => {
      let value = 0;
      for (let bit = 0; bit < length; bit++, cursor++) value |= ((bytes[cursor >>> 3] >>> (cursor & 7)) & 1) << bit;
      return value;
    };
    const drums = Array.from({ length: 4 }, () => Array.from({ length: 16 }, () => Boolean(take(1))));
    let invalidSound = false;
    const noteSounds = Array.from({ length: 16 }, () => Array.from({ length: 6 }, () => {
      const id = take(3);
      if (id > SOUNDS.length) invalidSound = true;
      return id ? SOUNDS[id - 1] : null;
    }));
    if (invalidSound) return null;
    const melody = noteSounds.map(row => row.flatMap((id, pitch) => id ? [pitch] : []));
    const steps = bytes[2] * 4;
    const settings = [...bytes.subarray(10, 13), ...bytes.subarray(57, 69)];
    const sounds = Object.fromEntries(SOUNDS.map((id, index) => [id, Object.fromEntries(['brightness', 'length', 'wobble'].map((key, field) => [key, settings[index * 3 + field]]))]));
    const song = { ...createSong(PRESETS[bytes[1]]), version: bytes[0] === 1 ? 6 : 7, bars: bytes[2], tempo: (bytes[3] << 8) | bytes[4],
      drumSounds: [...bytes.subarray(5, 9)].map(id => DRUMS[id]), synth: SOUNDS[bytes[9]],
      sounds, sound: { brightness: bytes[10], length: bytes[11], wobble: bytes[12] },
      drums: drums.map(row => row.slice(0, steps)), melody: melody.slice(0, steps), noteSounds: noteSounds.slice(0, steps),
      hidden: { drums: drums.map(row => row.slice(steps)), melody: melody.slice(steps), noteSounds: noteSounds.slice(steps) } };
    return restoreSong(JSON.stringify(song));
  } catch { return null; }
}

export function songShareURL(song, location) {
  const url = new URL(location);
  url.search = ''; url.hash = `song=${encodeSong(song)}`;
  return url.href;
}

export function sharedSongCode(location) {
  const url = new URL(location);
  return new URLSearchParams(url.hash.slice(1)).get('song') ?? url.searchParams.get('song');
}
