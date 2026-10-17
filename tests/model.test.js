import test from 'node:test';
import assert from 'node:assert/strict';
import { createSong, restoreSong, editSong, SongHistory, STEPS, NOTES, PRESETS } from '../model.js';

test('each starter is a complete editable loop, with independently owned arrays', () => {
  for (const id of Object.keys(PRESETS)) {
    const first = createSong(id);
    assert.equal(first.drums.length, 3);
    assert.ok(first.drums.every(row => row.length === STEPS && row.some(Boolean)));
    assert.equal(first.melody.length, STEPS);
    assert.ok(first.melody.some(note => Number.isInteger(note)));
    first.drums[0][0] = !first.drums[0][0];
    assert.notDeepEqual(first.drums, createSong(id).drums);
  }
});

test('editing a drum or pitch changes one step and does not mutate the prior song', () => {
  const before = createSong('breaks');
  const edited = editSong(before, { type: 'drum', row: 1, step: 3 });
  assert.equal(edited.drums[1][3], !before.drums[1][3]);
  assert.deepEqual(edited.drums[0], before.drums[0]);
  const note = editSong(edited, { type: 'note', step: 3, note: NOTES.length - 1 });
  assert.equal(note.melody[3], NOTES.length - 1);
  assert.equal(editSong(note, { type: 'note', step: 3, note: NOTES.length - 1 }).melody[3], null);
});

test('tempo and synth settings remain in range; invalid edits leave the song unchanged', () => {
  const song = createSong();
  assert.equal(editSong(song, { type: 'tempo', value: 999 }).tempo, 180);
  assert.equal(editSong(song, { type: 'tempo', value: 1 }).tempo, 80);
  assert.equal(editSong(song, { type: 'sound', key: 'brightness', value: -10 }).sound.brightness, 0);
  for (const edit of [
    { type: 'drum', row: 8, step: 1 }, { type: 'drum', row: 0, step: -1 },
    { type: 'note', step: 3, note: 999 }, { type: 'tempo', value: NaN },
    { type: 'sound', key: '__proto__', value: 1 }, { type: 'unknown' }
  ]) assert.deepEqual(editSong(song, edit), song);
});

test('autosave round-trips songs and rejects malformed or incompatible saves', () => {
  const song = editSong(createSong('club'), { type: 'note', step: 2, note: 2 });
  assert.deepEqual(restoreSong(JSON.stringify(song)), song);
  for (const raw of ['{', 'null', '42', '{}', JSON.stringify({ ...song, version: 2 }),
    JSON.stringify({ ...song, tempo: null }), JSON.stringify({ ...song, preset: 'missing' }),
    JSON.stringify({ ...song, drums: [[true]] }), JSON.stringify({ ...song, melody: Array(16).fill(-1) }),
    JSON.stringify({ ...song, sound: { ...song.sound, brightness: 'loud' } })
  ]) assert.equal(restoreSong(raw), null);
});

test('undo restores a full edit, a preset switch and a grouped slider change', () => {
  const original = createSong('breaks');
  const history = new SongHistory(original);
  history.commit(editSong(history.song, { type: 'drum', row: 0, step: 1 }));
  const edited = history.song;
  history.commit(createSong('club'));
  assert.deepEqual(history.undo(), edited);
  assert.deepEqual(history.undo(), original);
  assert.equal(history.canUndo, false);
  history.begin();
  history.commit(editSong(history.song, { type: 'tempo', value: 90 }));
  history.commit(editSong(history.song, { type: 'tempo', value: 100 }));
  history.end();
  assert.deepEqual(history.undo(), original);
});

test('history is bounded and no-op edits do not consume undo', () => {
  const history = new SongHistory(createSong(), 3);
  history.commit(createSong());
  assert.equal(history.canUndo, false);
  for (let i = 0; i < 6; i++) history.commit(editSong(history.song, { type: 'tempo', value: 90 + i }));
  for (let i = 0; i < 3; i++) assert.ok(history.undo());
  assert.equal(history.canUndo, false);
});

test('a slider gesture that passes its starting value still uses a single undo entry', () => {
  const original = createSong();
  const history = new SongHistory(original);
  history.begin();
  for (const value of [170, 164, 150]) history.commit(editSong(history.song, { type: 'tempo', value }));
  history.end();
  assert.deepEqual(history.undo(), original);
  assert.equal(history.canUndo, false);
});
