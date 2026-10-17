import test from 'node:test';
import assert from 'node:assert/strict';
import { GamepadReader } from '../gamepad.js';

const pad = (pressed = [], axes = [0, 0]) => ({
  connected: true, mapping: 'standard', index: 0, axes,
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 }))
});

test('Xbox buttons activate once per press; held A never toggles a step repeatedly', () => {
  const reader = new GamepadReader();
  assert.deepEqual(reader.read(pad([0]), 0), ['activate']);
  assert.deepEqual(reader.read(pad([0]), 1000), []);
  reader.read(pad(), 1001);
  assert.deepEqual(reader.read(pad([0]), 1002), ['activate']);
});

test('directions repeat after a delay and stick drift is ignored', () => {
  const reader = new GamepadReader();
  assert.deepEqual(reader.read(pad([], [0.2, -0.1]), 0), []);
  assert.deepEqual(reader.read(pad([15]), 10), ['right']);
  assert.deepEqual(reader.read(pad([15]), 200), []);
  assert.deepEqual(reader.read(pad([15]), 410), ['right']);
  assert.deepEqual(reader.read(pad([15]), 430), []);
  reader.read(pad(), 500);
  assert.deepEqual(reader.read(pad([], [0, -0.8]), 510), ['up']);
});

test('disconnect resets held buttons; nonstandard mappings are not misinterpreted', () => {
  const reader = new GamepadReader();
  reader.read(pad([0]), 0);
  assert.deepEqual(reader.read(null, 1), []);
  assert.deepEqual(reader.read(pad([0]), 2), ['activate']);
  assert.deepEqual(reader.read({ ...pad([0]), mapping: '' }, 3), []);
});

test('shoulders, B, X and menu have stable, distinct actions', () => {
  const reader = new GamepadReader();
  assert.deepEqual(reader.read(pad([1, 2, 4, 5, 9]), 0), ['back', 'undo', 'previous-section', 'next-section', 'play']);
});
