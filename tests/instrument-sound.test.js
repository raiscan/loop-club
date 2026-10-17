import test from 'node:test';
import assert from 'node:assert/strict';
import { createSong, editSong, restoreSong, clearSong, SongHistory, SYNTH_SOUNDS, saveSlotSong, restoreSongBook } from '../model.js';
import { encodeSong, decodeSong } from '../share.js';

const ids = Object.keys(SYNTH_SOUNDS);

test('each instrument owns settings; brush changes, clear and resizing preserve them', () => {
  const original = createSong('pixel');
  assert.equal(original.version, 7);
  assert.deepEqual(Object.keys(original.sounds), ids);
  for (const id of ids) assert.notEqual(original.sounds[id], original.sounds[ids.find(other => other !== id)]);
  let song = original;
  for (const [index, id] of ids.entries()) {
    song = editSong(song, { type: 'synth', value: id });
    for (const key of ['brightness', 'length', 'wobble']) song = editSong(song, { type: 'sound', key, value: index * 20 });
  }
  for (const [index, id] of ids.entries()) assert.deepEqual(song.sounds[id], { brightness: index * 20, length: index * 20, wobble: index * 20 });
  assert.deepEqual(clearSong(song).sounds, song.sounds);
  assert.deepEqual(editSong(song, { type: 'bars', value: 1 }).sounds, song.sounds);
  assert.notDeepEqual(song.sounds.bass, original.sounds.bass);
  for (const instrument of ['missing', '__proto__', null]) assert.deepEqual(editSong(song, {type:'sound',key:'length',value:0,instrument}), song);
});

test('independent sounds survive saves, Me slots, sharing and undo', () => {
  const original = createSong('cloud');
  const history = new SongHistory(original);
  history.commit(editSong(history.song, {type:'sound',instrument:'bass',key:'wobble',value:99}));
  history.commit(editSong(history.song, {type:'sound',instrument:'chime',key:'length',value:3}));
  const song = history.song;
  assert.deepEqual(restoreSong(JSON.stringify(song)), song);
  assert.deepEqual(decodeSong(encodeSong(song)), song);
  const book = saveSlotSong({version:1,slots:{}}, {...song,slot:'me2'});
  assert.deepEqual(restoreSongBook(JSON.stringify(book)).slots.me2.sounds, song.sounds);
  assert.equal(history.undo().sounds.bass.wobble,99);
  assert.deepEqual(history.song.sounds.chime, original.sounds.chime);
  assert.deepEqual(history.undo(), original);
});

test('version-six songs and version-one links migrate the old sound to every instrument', () => {
  const current = createSong('cloud');
  const legacy = {...current, version:6, sound:{brightness:7,length:83,wobble:16}};
  delete legacy.sounds;
  const restored = restoreSong(JSON.stringify(legacy));
  assert.equal(restored.version,7);
  for (const id of ids) assert.deepEqual(restored.sounds[id], legacy.sound);
  const oldLink = decodeSong('AQABAKQAAQIDADAYGFVVqqr__wAAAQAAAAAgAAIAAQAAAAAgAAIAAQAAAAAgAAIAAQAAAAAgAAIAwO424w');
  for (const id of ids) assert.deepEqual(oldLink.sounds[id],{brightness:48,length:24,wobble:24});
});

test('saved instruments require all three bounded settings without sharing references', () => {
  const song = createSong();
  for (const bad of [null, [], {}, {...song.sounds,bass:null}, {...song.sounds,chime:{brightness:0,length:101,wobble:0}}, {...song.sounds,bell:{brightness:0,length:1.5,wobble:0}}]) {
    assert.equal(restoreSong(JSON.stringify({...song,sounds:bad})),null);
  }
  const restored=restoreSong(JSON.stringify(song));
  restored.sounds.bass.length=0;
  assert.notEqual(restored.sounds.pluck.length,0);
  assert.notEqual(song.sounds.bass.length,0);
});
