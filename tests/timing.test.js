import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduledSteps } from '../audio.js';

test('sixteenth notes use audio time and wrap cleanly across the bar', () => {
  const clock = { nextTime: 0.04, step: 15 };
  assert.deepEqual(scheduledSteps(clock, 0, 120), [{ step: 15, time: 0.04 }]);
  assert.deepEqual(scheduledSteps(clock, 0.1, 120), [{ step: 0, time: 0.165 }]);
  assert.equal(clock.step, 1);
});

test('30 and 300 BPM schedule sixteenth notes at their actual tempos', () => {
  for (const [tempo, interval] of [[30, 0.5], [300, 0.05]]) {
    const clock = { nextTime: 0.04, step: 0 };
    const events = scheduledSteps(clock, 0, tempo);
    assert.equal(events[0].step, 0);
    assert.ok(Math.abs(clock.nextTime - (0.04 + events.length * interval)) < 1e-9);
    const next = scheduledSteps(clock, clock.nextTime - 0.02, tempo);
    assert.equal(next[0].step, events.length);
    assert.ok(Math.abs(next[0].time - (0.04 + events.length * interval)) < 1e-9);
  }
});

test('a stalled tab resumes ahead of now without firing a backlog of missed notes', () => {
  const clock = { nextTime: 1, step: 4 };
  const events = scheduledSteps(clock, 200, 180);
  assert.equal(events.length, 1);
  assert.equal(events[0].step, 4);
  assert.ok(events[0].time > 200 && events[0].time < 200.09);
});

test('scheduling is bounded even when a caller supplies an invalid tempo', () => {
  for (const tempo of [Infinity, NaN, 0, -100, 9999]) {
    const events = scheduledSteps({ nextTime: 0.03, step: 0 }, 0, tempo);
    assert.ok(events.length > 0 && events.length < 4);
    assert.ok(events.every(event => Number.isFinite(event.time)));
  }
});

test('short lesson playback wraps its four audible steps without traversing silent steps', () => {
  const clock = { nextTime: 0.04, step: 3 };
  assert.equal(scheduledSteps(clock, 0, 120, 4)[0].step, 3);
  assert.equal(scheduledSteps(clock, 0.1, 120, 4)[0].step, 0);
  assert.equal(clock.step, 1);
});
