import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduledSteps } from '../audio.js';

test('four quarter-note beats use audio time and wrap across the bar', () => {
  const clock = { nextTime: 0.04, step: 3 };
  assert.deepEqual(scheduledSteps(clock, 0, 120), [{ step: 3, time: 0.04 }]);
  assert.deepEqual(scheduledSteps(clock, 0.5, 120), [{ step: 0, time: 0.54 }]);
  assert.equal(clock.step, 1);
});

test('30, 300 and 600 BPM schedule one box per beat at their actual tempos', () => {
  for (const [tempo, interval] of [[30, 2], [300, 0.2], [600, 0.1]]) {
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
  const clock = { nextTime: 1, step: 2 };
  const events = scheduledSteps(clock, 200, 180);
  assert.equal(events.length, 1);
  assert.equal(events[0].step, 2);
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
  assert.equal(scheduledSteps(clock, 0.5, 120, 4)[0].step, 0);
  assert.equal(clock.step, 1);
});

test('two- and four-bar loops visit every step before wrapping', () => {
  for (const length of [8, 16]) {
    const middle = { nextTime: 0.04, step: 3 };
    scheduledSteps(middle, 0, 120, length);
    assert.equal(middle.step, 4);
    const clock = { nextTime: 0.04, step: length - 1 };
    assert.equal(scheduledSteps(clock, 0, 120, length)[0].step, length - 1);
    assert.equal(clock.step, 0);
    assert.equal(scheduledSteps(clock, 0.5, 120, length)[0].step, 0);
  }
});

test('speaker sync delays visual deadlines without changing audio beat times', async () => {
  const { visualWait, normaliseVisualDelay } = await import('../audio.js');
  assert.ok(Math.abs(visualWait(1.1, 1, 300)-400)<1e-8);
  assert.equal(visualWait(1.1,1.5,300),0);
  assert.equal(normaliseVisualDelay(9999),1000);
  assert.equal(normaliseVisualDelay(-30),0);
  assert.equal(normaliseVisualDelay(NaN),0);
  const a={nextTime:1.04,step:0},b={...a};
  visualWait(1.04,1,700);
  assert.deepEqual(scheduledSteps(a,1,600),scheduledSteps(b,1,600));
});
