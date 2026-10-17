import test from 'node:test';
import assert from 'node:assert/strict';
import { createSong, editSong, PRESETS, DRUM_SOUNDS, SYNTH_SOUNDS } from '../model.js';
import { encodeSong, decodeSong, songShareURL, sharedSongCode } from '../share.js';

const music = song => { const copy = structuredClone(song); delete copy.slot; return copy; };

test('version-one links retain their fixed wire format', () => {
  const code = 'AQABAKQAAQIDADAYGFVVqqr__wAAAQAAAAAgAAIAAQAAAAAgAAIAAQAAAAAgAAIAAQAAAAAgAAIAwO424w';
  const song = decodeSong(code);
  assert.equal(song.tempo, 164); assert.equal(song.bars, 1);
  assert.deepEqual(song.drums[0], [true, false, true, false]);
  assert.equal(song.noteSounds[0][0], 'bass');
  assert.equal(encodeSong(song), code);
});

test('every preset and size round-trips through a short URL-safe song code', () => {
  for (const id of Object.keys(PRESETS)) for (const bars of [1, 2, 4]) {
    const song = editSong(createSong(id), { type: 'bars', value: bars });
    const before = structuredClone(song), code = encodeSong(song);
    assert.match(code, /^[A-Za-z0-9_-]{82}$/);
    assert.deepEqual(decodeSong(code), song);
    assert.deepEqual(song, before);
  }
});

test('dense mixed chords, percussion, hidden bars and all sound settings survive sharing', () => {
  let seed = 17;
  const random = max => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; };
  const drums = Object.keys(DRUM_SOUNDS), sounds = Object.keys(SYNTH_SOUNDS);
  for (let sample = 0; sample < 100; sample++) {
    let song = editSong(createSong('pixel'), { type: 'tempo', value: 30 + random(571) });
    song.drumSounds = Array.from({ length: 4 }, () => drums[random(drums.length)]);
    song.synth = sounds[random(sounds.length)];
    for (const key of Object.keys(song.sound)) song.sound[key] = random(101);
    song.drums = song.drums.map(row => row.map(() => Boolean(random(2))));
    song.noteSounds = song.noteSounds.map(row => row.map(() => random(3) ? sounds[random(sounds.length)] : null));
    song.melody = song.noteSounds.map(row => row.flatMap((value, pitch) => value ? [pitch] : []));
    song = editSong(song, { type: 'bars', value: [1, 2, 4][random(3)] });
    assert.deepEqual(decodeSong(encodeSong(song)), song);
  }
});

test('sharing contains music, without the sender’s save-slot identity', () => {
  const song = createSong('cloud');
  assert.equal(encodeSong({ ...song, slot: 'me2' }), encodeSong({ ...song, slot: 'last' }));
  assert.deepEqual(decodeSong(encodeSong({ ...song, slot: 'me2' })), music(song));
  assert.throws(() => encodeSong({ ...song, tempo: 601 }));
});

test('malformed, noncanonical, oversized and corrupted codes fail closed', () => {
  const code = encodeSong(createSong());
  for (const bad of [null, undefined, 12, '', 'x'.repeat(100000), code.slice(1), code + '=', code.replace(/./, '<')]) assert.equal(decodeSong(bad), null);
  const packet = Buffer.from(code, 'base64url');
  for (let i = 0; i < packet.length; i++) {
    const bad = Buffer.from(packet); bad[i] ^= 1;
    assert.equal(decodeSong(bad.toString('base64url')), null, `corrupted byte ${i}`);
  }
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  assert.equal(decodeSong(code.slice(0, -1) + alphabet[alphabet.indexOf(code.at(-1)) ^ 1]), null);
});

test('future versions and invalid musical fields are rejected even with a valid checksum', () => {
  const original = Buffer.from(encodeSong(createSong()), 'base64url');
  const resign = bytes => {
    let crc = 0xffffffff;
    for (const byte of bytes.subarray(0, 57)) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    bytes.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 57);
    return bytes.toString('base64url');
  };
  for (const [offset, value] of [[0, 99], [1, 99], [2, 3], [3, 255], [5, 8], [9, 5], [10, 101], [21, 7]]) {
    const bad = Buffer.from(original); bad[offset] = value;
    assert.equal(decodeSong(resign(bad)), null, `invalid field ${offset}`);
  }
});

test('share URLs omit personal parameters and accept fragment or query song codes', () => {
  const song = createSong('float'), code = encodeSong(song);
  const link = songShareURL(song, 'https://example.com/music/?zach=yes&qa=private#old');
  assert.equal(link, `https://example.com/music/#song=${code}`);
  assert.equal(sharedSongCode(link), code);
  assert.equal(sharedSongCode(`https://example.com/?song=${code}`), code);
  assert.equal(sharedSongCode(`https://example.com/?song=old#song=${code}`), code);
  assert.equal(sharedSongCode('https://example.com/?zach=yes'), null);
});
