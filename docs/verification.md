# First playable verification — 17 October 2026

## Baseline

The extracted repository's clean `main` was `b94a34c`.
There was no remote/upstream and no existing test suite. Fetch/fast-forward
pull could not apply without a remote.

Observed checks on the main workspace before integration:

- `node --test`: 0 tests, 0 failures.
- `node --check app.js`: passed.
- `git fsck --no-reflogs`: passed.

There were no baseline failures to carry forward by test identity.

## Development checks

- `node --test`: 14 tests passed, 0 failures. Covers isolated starter data,
  single-step edits, input limits, malformed saves, undo and slider groups,
  Xbox button edges/repeat/dead zone, and sixteenth-note scheduling/recovery.
- `node --check` on `app.js`, `model.js`, `audio.js`, `gamepad.js` and
  `tests/browser-checks.js`: passed.
- `git diff --check`: passed.
- `reference/original-site/`: unchanged from the extracted baseline.

The served app was exercised in the T3 collaborative Chromium preview:

- `runBrowserChecks()` at 800×1280: 45 checks passed. Actual Web Audio
  OfflineAudioContext renders produce finite, non-silent, unclipped starter
  loops at default volume; each drum releases to silence. Brightness, length
  and wobble change rendered audio. Tests also cover cancellation of a pending
  audio start, restart and voice/visual cleanup.
- The same suite covers DOM editing, synthetic touch, save writes, storage
  failure/recovery, melody replacement/removal, reversible preset/reset,
  grouped undo, moving playhead, quick start/stop, simulated Xbox input,
  page crossings in both directions, section navigation, slider adjustment,
  help, disconnect and window-blur stopping.
- `runLayoutChecks()` passed at 360px, 600px and 800px widths: all three
  sections keep controls inside the machine, targets retain a 44 CSS pixel
  minimum with subpixel rounding tolerance, and the page has no horizontal
  overflow. The 16-step desktop layout was also exercised at 1366px.
- An explicit reload check verified the edited song and tempo survived,
  step state matched the save, playback stayed stopped and undo was empty.

Regression checks reproduced and verified fixes for a grouped slider passing
its original value, reverse controller page navigation, and a clipped Undo
button on narrow screens.

## Practical limits and delivery

These are desktop browser checks, including responsive viewports and a
simulated standard gamepad. No physical Android tablet or Xbox controller was
available for device connection, touch feel, latency or listening assessment.
The waveform view is an illustration, not a recording of the audio signal.

The repository has no remote configured. Only local integration is possible;
push and the user's post-push worktree/branch cleanup remain pending until
that destination exists. No task branch is to be pushed independently.

Useful primary references:

- [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API)
- [Web Audio best practices and user activation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
- [Offline audio rendering](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext/startRendering)
