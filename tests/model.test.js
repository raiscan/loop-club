import test from 'node:test';
import assert from 'node:assert/strict';
import { createSong, restoreSong, editSong, SongHistory, STEPS, NOTES, PRESETS } from '../model.js';

test('each starter is a complete editable loop, with independently owned arrays', () => {
  for (const id of Object.keys(PRESETS)) {
    const first = createSong(id);
    assert.equal(first.drums.length, 4);
    assert.ok(first.drums.every(row => row.length === STEPS));
    assert.ok(first.drums.slice(0, 3).every(row => row.some(Boolean)));
    if (['breaks', 'club', 'float'].includes(id)) assert.ok(first.drums[3].every(value => !value));
    assert.deepEqual(restoreSong(JSON.stringify(first)), first, `${id} is a valid save`);
    assert.equal(first.melody.length, STEPS);
    assert.ok(first.melody.every(notes => Array.isArray(notes)));
    assert.ok(first.melody.some(notes => notes.length > 0));
    first.drums[0][0] = !first.drums[0][0];
    assert.notDeepEqual(first.drums, createSong(id).drums);
    const pitch = first.melody.findIndex(notes => notes.length);
    first.melody[pitch].push(99);
    first.drumSounds[0] = 'missing';
    assert.ok(!createSong(id).melody[pitch].includes(99));
    assert.notEqual(createSong(id).drumSounds[0], 'missing');
  }
});

test('editing a drum or pitch changes one step and does not mutate the prior song', () => {
  const before = createSong('breaks');
  const edited = editSong(before, { type: 'drum', row: 1, step: 3 });
  assert.equal(edited.drums[1][3], !before.drums[1][3]);
  assert.deepEqual(edited.drums[0], before.drums[0]);
  const note = editSong(edited, { type: 'note', step: 3, note: NOTES.length - 1 });
  assert.deepEqual(note.melody[3], [1, NOTES.length - 1]);
  assert.deepEqual(editSong(note, { type: 'note', step: 3, note: NOTES.length - 1 }).melody[3], [1]);
});

test('tempo and synth settings remain in range; invalid edits leave the song unchanged', () => {
  const song = createSong();
  assert.equal(editSong(song, { type: 'tempo', value: 999 }).tempo, 300);
  assert.equal(editSong(song, { type: 'tempo', value: 1 }).tempo, 30);
  assert.equal(editSong(song, { type: 'sound', key: 'brightness', value: -10 }).sound.brightness, 0);
  for (const edit of [
    { type: 'drum', row: 8, step: 1 }, { type: 'drum', row: 0, step: -1 },
    { type: 'note', step: 3, note: 999 }, { type: 'tempo', value: NaN },
    { type: 'sound', key: '__proto__', value: 1 }, { type: 'unknown' }
  ]) assert.deepEqual(editSong(song, edit), song);
});

test('both tempo extremes survive saving and values outside them are rejected', () => {
  for (const tempo of [30, 300]) {
    const song = editSong(createSong(), { type: 'tempo', value: tempo });
    assert.equal(song.tempo, tempo);
    assert.equal(restoreSong(JSON.stringify(song)).tempo, tempo);
  }
  for (const tempo of [29, 301]) assert.equal(restoreSong(JSON.stringify({ ...createSong(), tempo })), null);
});

test('autosave round-trips songs and rejects malformed or incompatible saves', () => {
  const song = editSong(createSong('club'), { type: 'note', step: 2, note: 2 });
  assert.deepEqual(restoreSong(JSON.stringify(song)), song);
  for (const raw of ['{', 'null', '42', '{}', JSON.stringify({ ...song, version: 999 }),
    JSON.stringify({ ...song, tempo: null }), JSON.stringify({ ...song, preset: 'missing' }),
    JSON.stringify({ ...song, drums: [[true]] }), JSON.stringify({ ...song, melody: Array(16).fill(-1) }),
    JSON.stringify({ ...song, sound: { ...song.sound, brightness: 'loud' } })
  ]) assert.equal(restoreSong(raw), null);
});

test('old three-drum saves migrate without changing the music or synth settings', () => {
  const old = {
    version: 1, preset: 'breaks', tempo: 137,
    drums: Array.from({ length: 3 }, (_, row) => Array.from({ length: 16 }, (_, step) => step === row + 1)),
    melody: [5, null, 2, null, 0, null, null, null, 3, null, null, null, null, 1, null, null],
    sound: { brightness: 27, length: 61, wobble: 49 }
  };
  const migrated = restoreSong(JSON.stringify(old));
  assert.equal(migrated.version, 5);
  assert.equal(migrated.bars, 4);
  assert.deepEqual(migrated.drums.slice(0, 3), old.drums);
  assert.deepEqual(migrated.drums[3], Array(16).fill(false));
  assert.deepEqual(migrated.drumSounds, ['kick', 'snare', 'hat', 'clap']);
  assert.equal(migrated.synth, 'bass');
  assert.equal(migrated.tempo, 137);
  assert.deepEqual(migrated.melody, old.melody.map(note => note === null ? [] : [note]));
  assert.deepEqual(migrated.sound, old.sound);
});

test('chord notes toggle independently and undo preserves the other notes', () => {
  const original = createSong();
  const history = new SongHistory(original);
  history.commit(editSong(history.song, { type: 'note', step: 0, note: 3 }));
  history.commit(editSong(history.song, { type: 'note', step: 0, note: 1 }));
  assert.deepEqual(history.song.melody[0], [0, 1, 3]);
  assert.deepEqual(original.melody[0], [0]);
  history.commit(editSong(history.song, { type: 'note', step: 0, note: 1 }));
  assert.deepEqual(history.song.melody[0], [0, 3]);
  assert.deepEqual(history.undo().melody[0], [0, 1, 3]);
  const saved = restoreSong(JSON.stringify(history.song));
  assert.deepEqual(saved.melody[0], [0, 1, 3]);
  saved.melody[0].push(5);
  assert.deepEqual(history.song.melody[0], [0, 1, 3]);
});

test('version-two saves retain selected instruments and migrate rests and single notes', () => {
  const legacy = { ...createSong('club'), version: 2, synth: 'bell', tempo: 300,
    drums: createSong('club').drums.map(row => Array.from({length:16},(_,i)=>row[i%4])),
    drumSounds: ['tom', 'clap', 'openhat', 'cowbell'],
    melody: [0, 1, 2, 3, 4, 5, null, null, 3, null, 2, null, 0, null, null, null] };
  const migrated = restoreSong(JSON.stringify(legacy));
  assert.equal(migrated.version, 5);
  assert.equal(migrated.synth, 'bell');
  assert.equal(migrated.tempo, 300);
  assert.deepEqual(migrated.drums, legacy.drums);
  assert.deepEqual(migrated.drumSounds, legacy.drumSounds);
  assert.deepEqual(migrated.sound, legacy.sound);
  assert.deepEqual(migrated.melody, [[0], [1], [2], [3], [4], [5], [], [], [3], [], [2], [], [0], [], [], []]);
});

test('chord saves validate each pitch, reject duplicates, and allow all six notes or a rest', () => {
  const song = createSong();
  for (const notes of [[], [0, 1, 2, 3, 4, 5]]) {
    song.melody[0] = notes;
    song.noteSounds[0] = Array.from({length:6},(_,pitch)=>notes.includes(pitch)?song.synth:null);
    assert.deepEqual(restoreSong(JSON.stringify(song)).melody[0], notes);
  }
  for (const invalid of [[0, 0], [6], [-1], ['0'], null, 3, [0, 1, 2, 3, 4, 5, 6]]) {
    song.melody[0] = invalid;
    assert.equal(restoreSong(JSON.stringify(song)), null);
  }
});

test('instrument choices preserve patterns, save and undo as complete edits', () => {
  const song = createSong();
  const history = new SongHistory(song);
  history.commit(editSong(history.song, { type: 'drumSound', row: 3, value: 'cowbell' }));
  history.commit(editSong(history.song, { type: 'synth', value: 'bell' }));
  assert.deepEqual(history.song.drums, song.drums);
  assert.deepEqual(history.song.melody, song.melody);
  assert.equal(history.song.drumSounds[3], 'cowbell');
  assert.equal(history.song.synth, 'bell');
  assert.deepEqual(restoreSong(JSON.stringify(history.song)), history.song);
  assert.equal(history.undo().synth, 'bass');
  assert.deepEqual(history.undo(), song);
  assert.equal(editSong(song, { type: 'drum', row: 3, step: 3 }).drums[3][3], true);
});

test('invalid instrument IDs are rejected in edits and saved songs', () => {
  const song = createSong();
  for (const edit of [{ type: 'drumSound', row: 0, value: '__proto__' },
    { type: 'drumSound', row: 4, value: 'kick' }, { type: 'synth', value: 'missing' }]) {
    assert.deepEqual(editSong(song, edit), song);
  }
  assert.equal(restoreSong(JSON.stringify({ ...song, synth: 'missing' })), null);
  assert.equal(restoreSong(JSON.stringify({ ...song, drumSounds: ['kick'] })), null);
  assert.equal(restoreSong(JSON.stringify({ ...song, drumSounds: ['kick', 'snare', 'hat', 'missing'] })), null);
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

test('loop sizes repeat music into 4, 8 or 16 independent beat boxes', () => {
  const original = createSong('liquid');
  assert.equal(original.bars, 1);
  assert.equal(original.melody.length, 4);
  const medium = editSong(original, { type: 'bars', value: 2 });
  assert.equal(medium.bars, 2);
  assert.equal(medium.melody.length, 8);
  assert.deepEqual(medium.melody.slice(4), original.melody);
  assert.ok(medium.drums.every((row, i) => row.length === 8 && JSON.stringify(row.slice(4)) === JSON.stringify(original.drums[i])));
  const changed = editSong(editSong(medium, { type: 'drum', row: 0, step: 7 }), { type: 'note', step: 4, note: 5 });
  assert.notDeepEqual(changed.melody[4], changed.melody[0]);
  assert.deepEqual(changed.melody[0], original.melody[0]);
  const large = editSong(changed, { type: 'bars', value: 4 });
  assert.equal(large.melody.length, 16);
  assert.deepEqual(large.melody.slice(8), changed.melody);
  assert.deepEqual(large.drums.map(row => row.slice(8)), changed.drums);
  const history = new SongHistory(large);
  const small = editSong(large, { type: 'bars', value: 1 });
  history.commit(small);
  assert.deepEqual(small.melody, original.melody);
  assert.deepEqual(history.undo(), large);
  large.melody[8].push(5);
  assert.deepEqual(changed.melody[0], original.melody[0]);
  for (const bars of [0, 3, 5, 1.5, '2', null]) assert.deepEqual(editSong(original, { type: 'bars', value: bars }), original);
  assert.deepEqual(editSong(original, { type: 'note', step: 4, note: 0 }), original);
  assert.deepEqual(editSong(small, { type: 'drum', row: 0, step: 4 }), small);
});

test('all loop sizes round-trip; old 16-step chord saves retain every note in four bars', () => {
  for (const bars of [1, 2, 4]) {
    const song = editSong(createSong(), { type: 'bars', value: bars });
    assert.deepEqual(restoreSong(JSON.stringify(song)), song);
    for (const invalid of [0, 3, '2', undefined]) assert.equal(restoreSong(JSON.stringify({ ...song, bars: invalid })), null);
    assert.equal(restoreSong(JSON.stringify({ ...song, melody: song.melody.slice(1) })), null);
    assert.equal(restoreSong(JSON.stringify({ ...song, drums: song.drums.map(row => row.slice(1)) })), null);
  }
  const legacy = editSong(createSong('liquid'), {type:'bars',value:4}); delete legacy.bars; legacy.version = 3;
  const migrated = restoreSong(JSON.stringify(legacy));
  assert.equal(migrated.bars, 4);
  assert.equal(migrated.version, 5);
  assert.deepEqual(migrated.melody, legacy.melody);
  assert.deepEqual(migrated.drums, legacy.drums);
});

test('instrument brushes paint, replace and erase one pitch without changing other notes', () => {
  const original = createSong();
  const game = editSong(original, { type: 'synth', value: 'arcade' });
  assert.deepEqual(game.noteSounds, original.noteSounds);
  const painted = editSong(game, { type: 'note', step: 0, note: 3 });
  assert.equal(painted.noteSounds[0][3], 'arcade');
  assert.equal(painted.noteSounds[0][0], 'bass');
  assert.deepEqual(painted.melody[0], [0,3]);
  const bell = editSong(painted, { type: 'synth', value: 'bell' });
  const replaced = editSong(bell, { type: 'note', step: 0, note: 3 });
  assert.equal(replaced.noteSounds[0][3], 'bell');
  assert.equal(replaced.noteSounds[0][0], 'bass');
  assert.deepEqual(replaced.melody[0], [0,3]);
  assert.equal(painted.noteSounds[0][3], 'arcade');
  const history = new SongHistory(painted);history.commit(replaced);
  assert.equal(history.undo().noteSounds[0][3], 'arcade');
  const erased = editSong(replaced, { type: 'note', step: 0, note: 3 });
  assert.deepEqual(erased.melody[0], [0]);
  assert.equal(erased.noteSounds[0][3], null);
  assert.deepEqual(editSong(replaced, { type:'note',step:0,note:3,instrument:'missing' }),replaced);
  const large = editSong(replaced, { type:'bars',value:4 });
  assert.deepEqual(large.noteSounds[4],replaced.noteSounds[0]);
  large.noteSounds[4][0]='pluck';
  assert.equal(large.noteSounds[0][0],'bass');
});

test('painted instruments save strictly and older songs retain the instrument of every note', () => {
  const song = editSong(editSong(createSong(),{type:'synth',value:'bell'}),{type:'note',step:0,note:3});
  assert.deepEqual(restoreSong(JSON.stringify(song)),song);
  for (const invalid of [null,[],[['bass']],song.noteSounds.map(row=>row.map(()=>null))]) {
    assert.equal(restoreSong(JSON.stringify({...song,noteSounds:invalid})),null);
  }
  const unknown=structuredClone(song);unknown.noteSounds[0][3]='__proto__';
  assert.equal(restoreSong(JSON.stringify(unknown)),null);
  unknown.noteSounds[0][3]=['bell'];
  assert.equal(restoreSong(JSON.stringify(unknown)),null);
  const legacy={...createSong('pixel'),version:4};delete legacy.noteSounds;
  const migrated=restoreSong(JSON.stringify(legacy));
  assert.equal(migrated.version,5);
  assert.deepEqual(migrated.melody,legacy.melody);
  for(let step=0;step<legacy.melody.length;step++) for(let pitch=0;pitch<6;pitch++) {
    assert.equal(migrated.noteSounds[step][pitch],legacy.melody[step].includes(pitch)?'arcade':null);
  }
});
