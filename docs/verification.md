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

## Playhead and instrument expansion — 17 October 2026

Baseline for this follow-up was clean `main` at `be2082f`:
`node --test` passed all 14 existing checks; syntax checks passed. No remote
was configured, so fetch/pull and push remained unavailable.

The reported Tunes bug was reproduced with the `current` class present while
computed `box-shadow` was `none`. The later `.melody-grid .step` rule removed
the outlined playhead. A specific current-column rule restores it, including
on active notes. Browser checks verify visible outlines and their movement,
rather than only the class name.

The expansion provides four drum lanes with eight selectable percussion
voices and four synth instruments. Instrument edits preserve patterns and
participate in autosave/undo. Version-one saves migrate to schema version two
under the existing storage key, preserving all original three drum patterns,
notes, tempo and synth controls. The added fourth lane starts empty.

Observed development checks:

- `node --test`: 17 passed, 0 failed; the original baseline checks remain
  passing, with the starter contract updated for an empty fourth lane.
- Syntax checks on app, audio, model, gamepad and browser-check modules passed.
- `git diff --check` passed; original-site reference snapshots are unchanged.
- `runBrowserChecks()` at 800×1280: 88 checks passed, including actual Web
  Audio renders of all eight percussion voices and four distinct synth
  waveforms, the moving Tunes outline, selection/undo via simulated Xbox,
  preserved patterns, the fourth lane, and all earlier integration checks.
- `runLayoutChecks()` passed at 360px and 800px across all three sections.
  The expanded controls also passed in the desktop preview.
- An actual legacy-save/reload test verified schema migration, unchanged
  drums/notes/tempo/synth settings, an empty fourth lane and available selectors.

A cached old audio module initially accompanied the new controls during QA.
Versioned CSS/script/module URLs now load this release consistently; the
browser rerun confirmed that the loaded audio exports match the new code.

Hardware limitations remain as above: physical Android/Xbox testing is not
claimed. Push and post-push worktree cleanup remain pending a Git remote.

## Playback button placement — 17 October 2026

Moved the existing Play/Stop button from the introduction into a shared
transport group immediately before Start over. The group stays together when
other controls wrap on small screens. Playback handlers and IDs are unchanged.
Release asset queries advance to `v=3` to avoid stale layout assets.

Baseline `main` at `e633215` passed all 17 Node tests. The development tree
passes the same 17, all JavaScript syntax checks and `git diff --check`.
The existing browser suite passed 86 checks in the full 16-step desktop layout;
its two page-crossing checks apply only to narrower paged layouts. Layout checks
passed in all sections at desktop, 800px and 360px. Direct geometry checks
confirmed one Play/Stop button, sharing a parent with Start over, immediately
preceding it and staying on the same row at all tested widths.

## Tempo playground — 17 October 2026

Expanded the Speed slider, model editing/save validation and audio clock from
80–180 to 30–300 BPM. The model and scheduler share the tempo limits. Existing
starter tempos are unchanged. Release asset queries advance to `v=4`.

Baseline main at `3b1227a`: 17 Node tests passed. New endpoint tests reproduced
the former clamps before the change. Development verification passes 19 Node
tests, JavaScript syntax checks, `git diff --check` and 88 browser/audio checks.
The browser accepted and saved both limits; actual moving-playhead intervals
averaged 500ms at 30 BPM and 48ms at 300 BPM, versus expected sixteenth-note
intervals of 500ms and 50ms. The precise audio-clock intervals are covered by
the Node timing test, and save validation rejects values outside 30–300.

## Chords in Tunes — 17 October 2026

Tunes now toggles each pitch independently, allowing up to the six available
notes on a step. Chords start all their voices at the same audio time with
square-root gain balancing. A stopped edit previews the resulting chord and
replaces the preceding chord audition; removing its last note stops that
preview. Stop handles all notes in every active chord.

Schema version three stores each melody step as a list of unique pitches.
Both previous schemas migrate their single notes/rests into one-note/empty
lists, keeping drum patterns, instrument choices, tempo and synth settings.
The storage key stays unchanged. Asset queries advance to `v=6`.

Baseline main `0e88a57` passed 19 Node tests. Development verification:

- `node --test`: 22 passed, 0 failed. Prior checks remain passing with the
  monophonic-edit expectations intentionally updated to independent toggles.
  Added multi-note undo, both migrations and chord-save validation checks.
- Syntax checks for all application modules and browser checks passed;
  `git diff --check` passed. Original-site references remain unchanged.
- `runBrowserChecks()` at 800px: 102 passed. Includes all four synths producing
  the expected simultaneous three-note signal, empty-chord silence, stop and
  preview replacement, six-note chord renders at 30/300 BPM, mouse and Xbox
  stacking/removal/undo, and the earlier integration checks.
- Responsive checks passed at 360px and 800px, seven checks per viewport.
- A real legacy-save reload preserved its musical state; after adding a
  three-note chord, another reload restored all three active squares, the
  Bell instrument and the 300 BPM tempo.

Physical Android/Xbox testing remains outstanding. No remote is configured;
local integration can proceed, while push and post-push cleanup remain pending.
