import test from 'node:test';
import assert from 'node:assert/strict';
import { createSong, createSlotSong, restoreSong, restoreSongBook, saveSlotSong, openSlotSong, editedSlotSong, editSong, SongHistory } from '../model.js';

test('Me slots start blank and own independent complete song data', () => {
  const book = restoreSongBook(null), one = openSlotSong(book, 'me1'), two = openSlotSong(book, 'me2');
  assert.equal(one.slot, 'me1'); assert.equal(two.slot, 'me2');
  assert.ok(one.drums.every(row => row.every(hit => !hit)));
  assert.ok(one.hidden.drums.every(row => row.every(hit => !hit)));
  one.drums[0][0] = true;
  assert.equal(two.drums[0][0], false); assert.deepEqual(book.slots, {});
});

test('slot edits persist full songs and do not overwrite another slot or Last', () => {
  let book = restoreSongBook(null);
  const last = editedSlotSong(createSong(), editSong(createSong(), { type: 'tempo', value: 188 }));
  book = saveSlotSong(book, last);
  let one = editSong(createSlotSong('me1'), { type: 'bars', value: 4 });
  one = editSong(one, { type: 'note', step: 15, note: 3, instrument: 'chime' });
  one = editSong(one, { type: 'bars', value: 1 });
  book = saveSlotSong(book, one);
  const restored = restoreSongBook(JSON.stringify(book));
  assert.deepEqual(openSlotSong(restored, 'me1'), one);
  assert.deepEqual(openSlotSong(restored, 'last'), last);
  assert.ok(openSlotSong(restored, 'me2').drums.every(row => row.every(hit => !hit)));
  assert.deepEqual(editSong(openSlotSong(restored, 'me1'), { type: 'bars', value: 4 }).melody[15], [3]);
  one.hidden.melody[11].push(5);
  assert.deepEqual(openSlotSong(book, 'me1').hidden.melody[11], [3]);
});

test('editing built-ins creates Current, while named slots keep their identity', () => {
  const source = createSong('float');
  assert.equal(editedSlotSong(source, structuredClone(source)).slot, undefined);
  const current = editedSlotSong(source, editSong(source, { type: 'drum', row: 0, step: 0 }));
  assert.equal(current.slot, 'last'); assert.equal(source.slot, undefined);
  assert.equal(editedSlotSong(createSlotSong('me2'), current).slot, 'me2');
  assert.deepEqual(restoreSong(JSON.stringify(current)), current);
  assert.equal(restoreSong(JSON.stringify({ ...current, slot: '__proto__' })), null);
});

test('Undo across song selection restores song identity and its saved edits', () => {
  const history = new SongHistory(createSong()), empty = createSlotSong('me1');
  history.commit(empty);
  const made = editedSlotSong(history.song, editSong(history.song, { type: 'drum', row: 0, step: 0 }));
  history.commit(made); history.commit(createSong('club'));
  assert.deepEqual(history.undo(), made); assert.deepEqual(history.undo(), empty);
  assert.deepEqual(history.undo(), createSong());
});

test('damaged and unknown stored slots do not discard other valid songs', () => {
  const one = createSlotSong('me1');
  const book = restoreSongBook(JSON.stringify({ version: 1, slots: { me1: one, me2: { broken: true }, stranger: one } }));
  assert.deepEqual(Object.keys(book.slots), ['me1']);
  assert.deepEqual(book.slots.me1, one);
  for (const raw of ['{', 'null', '{}', '{"version":999,"slots":{}}']) assert.deepEqual(restoreSongBook(raw), { version: 1, slots: {} });
});
