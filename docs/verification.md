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


## More starting grooves — 2026-10-17

Added six examples (nine total), using distinct drum patterns, instrument
choices, synth settings and several chord examples. Cards are generated from
the preset catalogue. Original preset IDs and saved-song schema stay intact.
Asset queries advance to `v=7`. Hosting remains public.

- Updated main baseline: `node --test` passed 22 tests, no failures.
- Development: `node --test` passed 22 tests, including validation and independent
  ownership of every preset's chords and instruments. Module syntax and diff
  whitespace checks passed.
- Chrome `runBrowserChecks()` passed 136 checks: all nine loops render finite,
  audible audio; each card loads its complete song and can be undone.
- `runLayoutChecks()` passed all eight checks at 1152, 800 and 360 pixels.
  The nine cards retain 44px targets; the page has no horizontal overflow.
  The 800px layout was also visually inspected.
- T3 preview snapshot/evaluation timed out, so browser QA used the installed
  Chrome connector. A test-fixture failure initially undid a no-op selection;
  the fixture now starts from a deliberate edit. A later run stalled without
  a user audio gesture after reload; clicking Play before the run resolved it.
- Physical Android and Xbox hardware were not retested for this preset update.


## Zach’s guided tutorial — 2026-10-17

A prominent Help Zach button opens ten short hands-on lessons. Prompts use
Arial / sans-serif at 28–36px for headings and 23–28px for the short task.
A gold ring follows the next real control. The fixed prompt moves to keep
that control clear; a landscape positioning failure was reproduced and fixed.
Live diagrams show all 16 loop steps, lit beats/rests, high/low notes, chord
stacks and brightness. Edits remain in the normal song and Undo history.
The tutorial never replaces the song on opening.

Each successful action plays a short, finite chime through the existing
volume/compression path. Device speech prefers a known female British voice,
then British English, then another available voice. Say it reads one prompt;
automatic narration can be turned off. Music is ducked during speech and
restored on completion, errors, mute, exit or cancellation. A 12-second guard
prevents stuck speech from leaving music ducked. No OpenRouter key was needed
or accessed, and no paid service or credential is shipped.

Observed checks:
- Updated main baseline: 22 Node tests passed with no failures.
- Development: 26 Node tests passed, including speech ordering, mute, fallback,
  stale callback cancellation, picture contents and independent song data.
- Browser suite: 207 checks passed at 800×1280, including actual OfflineAudioContext
  chime/loop rendering, all ten tutorial actions, live pictures, target/ring
  alignment, large type, focus, Done/Escape, synthetic Xbox A/D-pad/B and blur
  cancellation.
- Full tour: 56 focused checks passed at 1280×800, 800×1280, 360×800 and 800×360.
  Every prompt and target stayed visible without overlap. Page layout checks
  passed at desktop, tablet and narrow widths.
- The server browser reported an empty speech voice catalogue. Spoken voice
  selection/lifecycle were checked with test voices; actual accent, gender
  and friendliness still depend on the target device and were not auditioned.
- Physical Android/Xbox hardware was not available. The original site archive
  remains untouched. Runtime assets use v=8 and the static bundle now has eight
  assets, including tutorial.js.


## Bundled British narration — 2026-10-17

The main tutorial voice is now eleven static MP3 recordings, generated once
through OpenRouter using Gemini 3.1 Flash TTS Preview / Sulafat and warm female
British English delivery instructions. Every browser receives identical audio
bytes. Device speech remains a fallback for a failed or blocked clip; normal
playback needs no installed Windows voice or API key. The voice bank totals
428,836 bytes. Runtime release queries advance to v=9; individual audio URLs
also include their content hashes.

- Updated main baseline: 26 Node tests passed without failures.
- Development: 30 Node tests passed, including missing device speech, recorded
  playback, changing volume, mute/one-shot repeat, interruption, stale callbacks,
  failed clip fallback, transcript matching and all eleven file hashes.
- Chrome: 234 browser checks passed. All eleven MP3s return audio/mpeg and decode
  to finite, audible samples. Actual HTML media playback advances with device
  speech APIs explicitly absent; changing a prompt releases the prior clip,
  and exit restores the music level. Existing tutorial/Xbox/sequence checks pass.
- A detached-audio playback interruption was reproduced in Chrome. Keeping the
  hidden active media element in the document until completion/cancellation
  resolved it; the full suite then passed.
- T3 preview snapshot/click automation timed out, so the installed Chrome
  connector was used. This is a Linux Chrome check, not a physical Win11 test.
- Automated audio review via Gemini 2.5 Flash transcribed all eleven recordings.
  The words match the scripts after punctuation/case normalization. No noise,
  extra speech or truncation was reported; the review described the voice as
  clear, female British English with a friendly, encouraging tone. This is an
  automated assessment, not a human listening test.
- Generation initially returned HTTP 400 for MP3 output; the model requires
  PCM. The generator now requests 24kHz PCM and encodes normalized mono MP3s
  locally with ffmpeg. Unchanged clips are skipped without another API call.

The authorized shared OpenRouter key was copied to ~/.config/openrouter/api-key
(mode 0600, directory 0700), checked successfully against the key API, and
documented by location in global Codex and Claude guidance. The original
project .env was preserved. No key is stored in this repo, in generation
metadata, in browser code or in the static bundle. The Site package includes
only nine runtime app assets and eleven MP3s; model-generation tools, provenance,
tests and source history are excluded.


## Tutorial spotlight and softer Scottish voice — 2026-10-17

The updated base was clean main at a8c8fa6: 30 Node tests passed, with no
baseline failures. The tutorial now names the actual “Let's play” button,
dims the screen around its target and helper, and keeps keyboard/Xbox
navigation within those bright controls. The loop explanation follows the
initial Play action: “Watch the light move along. When it goes back to the
start, the tune plays again.” The live diagram says “It plays again.”

The user auditioned and approved the softer Scottish sample. All eleven
bundled prompts were generated using its unchanged Gemini 3.8 Flash TTS /
Sulafat settings. An automated transcription review caught altered wording
in two clips; those were replaced and checked again. This does not replace
the user's assessment of the sample's tone or accent.

The T3 preview passed 67 focused tour checks at 1280×800, 800×1280,
360×800 and 800×360, including hit testing through every spotlight opening,
background blocking, helper/target visibility, Tab focus and exit cleanup.
Subsequent native clicks timed out twice, so final browser checks used the
Chrome connector. Browser checks require a real initial Play gesture for
audio activation and a foreground page for the simulated gamepad.

Physical Windows 11, Android and Xbox hardware testing is still unclaimed.
Narration is bundled audio and needs no device voice installation. Release
queries advance to v=10, with individual clip URLs keyed by content hash.

The child-facing interface was also simplified: one-word pictured song cards,
Drums / Tunes / Sounds, short prompts, and large Arial labels. Filter/envelope
and genre details moved into grown-up help. Tempo still spans 30–300 BPM,
and notes, chords, presets, sound editing, saves and Undo retain their behavior.

Final development verification:

- `node --test`: 31 passed, 0 failed; no baseline failure was introduced.
- Syntax checks passed for all runtime modules, browser checks and generation tool.
- Chrome `runBrowserChecks()` at 800×1280: 254 passed, including MP3 decoding,
  actual media playback without device speech, controller actions and spotlight hit testing.
- At 360×800, 800×1280, 800×360 and 1280×800: 67 focused tour checks,
  eight layout checks and seven reading checks passed at each size. All visible
  main-screen words/numbers are at least 18px; control targets remain at least
  44px and the page has no horizontal overflow.
- Build: nine runtime assets and eleven voice MP3s only. `git diff --check`
  passed; the original site reference is unchanged.


## Play, hear and see tutorial; bright child-facing theme — 2026-10-17

Updated base main was 7e8e34b. Its full Node suite passed 31 tests with no
failures; syntax checks passed. Sites source synchronization confirmed that
base before work began.

The musical lessons now use an isolated in-memory practice song. Before
drum practice, all drum and tune tracks become blank at 120 BPM. Each drum,
beat, note, chord and sound action enters a listening phase: its own part
plays for four short cycles, with the relevant four-step phrase selectively
highlighted and the playhead moving in time. Hear again replays it. Next
becomes available after playback, and Xbox focus moves to it. During the
sound task, the learned notes loop while the slider changes their timbre.

Bye/Escape/Xbox B/blur restore the original song without overwriting storage.
Keep it repeats the learned phrase across the full 16-step loop and records
one edit in the original song's Undo history. Keyboard/controller shortcuts
cannot reintroduce preset notes or bypass a practice task.

The instrument now uses cream and pastel surfaces, coloured drum pads,
chunky yellow actions, bright tabs and a dark outlined playhead. Speed has
tortoise/hare cues. The large Arial labels and device-independent Scottish
recordings remain. No new voice generation or OpenRouter calls were needed.

A short landscape overlap was reproduced: the full four-step phrase extended
under the helper. A narrower landscape helper gives it a separate column.
The tune highlight also initially included the step-number row and scrolled
partly above the viewport; the region now includes only note buttons and
explicitly scrolls the full highlighted group into view. Collision checks also
include the highlight border, preventing a small overlap at the sound slider.

Development verification:

- `node --test`: 35 passed, 0 failed. Four new checks cover empty isolated
  tracks, solo playback with intact chords, keeping the phrase, and four-step
  clock wrapping. The 31 baseline checks remain passing.
- `runBrowserChecks()` at 800×1280: 305 passed. New cases exercise actual
  finite Web Audio rewards, cancellation, all listening phases, replay, live
  sound changes, storage isolation, Keep it/Undo, and Xbox Next/guard behavior.
- At 1280×800, 800×360 and 360×800: 104 focused tutorial, eight layout
  and seven reading checks passed at each size. The full tablet suite also
  passed its tutorial checks; layout and reading checks passed there.
- All runtime/browser-check modules pass syntax checks. The build still
  packages nine app assets and eleven unchanged MP3s. Original-site reference
  files are unchanged and `git diff --check` passes.

These are browser/simulated-gamepad checks, not physical Win11/Android/Xbox
hardware listening or connection tests.


## Five saved looks and repeatable, spoken rewards — 2026-10-17

Updated main baseline ae771b9 passed all 35 Node tests and syntax checks with
no failures. Sites source synchronization confirmed the same base before edits.

Look opens five large pictured choices: Sunny, Pink, Space, Dino and Race.
Each sets the complete instrument palette, browser colour scheme and page
colour; the choice is validated and saved under loop-club.theme.v1 separately
from music. Space has a dark star field; Dino uses greens; Race uses blue/red
and a racing stripe. The picker supports native modal keyboard focus, touch,
mouse and Xbox D-pad/A/B, including returning focus to Look when closed.

The existing tour order is retained. In its listening stages Zach can tap
the highlighted drum again, edit any beat in the highlighted phrase, try
notes across that phrase, and use all three sound sliders. After the first
listen, Next stays enabled during replays and edits; experimentation does
not force a new waiting period. Chord invitations follow the column where
he put a note. Repeated trials stop reminders so his music stays audible.

Five additional MP3s use the unchanged approved softer Scottish voice
settings. They play after the music: “Your drum/beat/note/notes/sound! That
was you. Tap Next.” The runtime now bundles sixteen recordings. Automated
transcription matched every new line after punctuation/case normalization
and reported no unclear words, truncation or unexpected sounds. This is an
automated content check, not a fresh human accent assessment.

An initial synchronous picker-focus assertion ran before the native dialog's
close event; the test now waits for that event turn. No product workaround
was needed. Existing tutorial actions are tested with their newly repeatable
Next behaviour rather than expecting the old replay lockout.

Focused runs also exposed a test-fixture mismatch: the broad suite restores
saved storage but asks callers to reload to restore the visible song. A
no-op preset reset could therefore compare different starting songs. The
focused tutorial fixture now switches away and back before capturing its
baseline, keeping its rendered and stored starting state in sync.

Final development verification:

- `node --test`: 35 passed, 0 failed, including transcript/hash validation
  for all sixteen recordings. All runtime, browser-test and build/generation
  modules pass syntax checks; `git diff --check` passes.
- The tablet browser suite passed 354 checks. This includes five-theme
  selection, persistence, storage failure, selected marks, readable palette
  contrast, Xbox D-pad/A/B, real praise playback, cancelling reminders,
  repeatable drum/beat/note/sound actions and the existing audio/tour checks.
- At 360×800, 800×360, 1280×800 and 800×1280: all five themes passed
  80 combined picker/layout/reading checks. The focused tutorial passed 110
  checks at the first three sizes; its tablet checks passed within the full
  suite. Text stays at least 18px and sequence controls at least 44px.
- A real navigation/reload preserved Dino; an invalid stored theme fell back
  to Sunny without changing music. Space's dark palette and the pictured
  picker were visually inspected.
- Static build: nine app assets plus sixteen MP3s. Original-site reference
  files are unchanged. No credentials or generation tools enter the bundle.

Verification uses a browser and a simulated Xbox boundary. Physical Win11,
Android and controller hardware were not available.

## Four-beat loops and exploratory narration — 17 October 2026

Baseline main `1c78813` was clean. The Sites source helper fetched and checked
that the local main was current. Baseline `node --test tests/*.test.js` passed
35 tests; runtime syntax checks and all 354 browser checks passed, with no
baseline failures.

User clarification sets four boxes per bar, one box per quarter-note beat in
4/4. Small/Medium/Large contain 4/8/16 beats. Grid columns and loop lights match
the song size; Small has four widened columns and no unused boxes. Paging is
only used when needed to keep targets at least 44px. Growth copies the current
phrase, shrinking retains initial bars, and Undo restores removed notes.
Preset/reset retain size; a playing resize restarts cleanly. Older 16-step
saves retain all notes as four bars; playback now gives each box a full beat
rather than a sixteenth, so their timing changes at the same BPM. Fresh example
patterns are condensed to four beat boxes. The tutorial practices one bar and
restores or fills the original loop size on exit/Keep it.

All five reward recordings now retain the opening praise, name a repeatable
action and describe the next activity before inviting Next. Matching large
visual prompts suggest another try. Approved Scottish voice settings remain
unchanged. Automated audio transcription matched all five scripts and reported
no unclear words, noise or truncation; that is an automated check rather than
a physical-device listening assessment.

Development `node --test tests/*.test.js`: 38 tests pass. Timing checks now
assert quarter-note intervals at 30 and 300 BPM and wrapping at 4/8/16 beats.
All runtime/build/generator/browser-check syntax checks, static build and
`git diff --check` pass. The archived original-site reference is unchanged.
The updated full browser suite passes 374 checks at 800×1280, covering actual
Web Audio traversal of each size, resizing/undo during playback, independent
late-bar drums/chords, no leftover Small boxes, widening, persistence writes,
simulated Xbox size selection/page crossing and original tutorial interactions.

Responsive layout/reading/theme checks pass all 240 checks per viewport
at 360×800, 800×360 and 1280×800 (all three sizes across five themes). The guide
passes 110 focused checks at 360×800 and 800×360. A reproduced landscape overlap
came from highlighting four newly widened beat columns next to a 320px helper.
Short landscape tutorial grids now reserve a side-by-side area for the helper;
the same failing interaction passes with large targets and no overlap.
The focused guide also passes 110 checks at 1280×800, including keeping a
learned phrase in an existing four-bar song. Actual reloads restore Medium's
8 columns and Small's 4 columns/4 lights with paging hidden; an old version-3
16-step save reloads as version 4/Large with 16 columns. Playback stays stopped.
Hardware limits remain: browser and simulated pad checks, no physical Android
or Windows/Xbox device test.

## Player modes, loop map, volume and Space contrast — 17 October 2026

The verified/pushed base for this follow-up is `a47c982`: 38 Node tests and
374 browser checks pass, with no baseline failures. It was not deployed while
these additional user requests were incorporated. Source helper fetch/fast-
forward checks confirmed main remained at that commit.

Selected tabs inherited a hard-coded dark text colour from a legacy selector;
Tunes/Sounds also had legacy selected-background selectors. Selected states
now explicitly use theme ink and their own theme backgrounds. Browser checks
measure computed contrast on all three selected tabs in all five themes,
requiring at least 4.5:1 instead of only checking root colour variables.

URL modes opt in to Zach (`?zach=yes`) or Marcie (`?marcie=yes`); no parameter
names no player. Help labels and tutorial hello/goodbye text and recordings
match the mode. Named Zach recordings are preserved, with new generic and
Marcie recordings under the same approved Scottish settings. All twenty clips
match narration text and hashes. Automated transcription of the four new clips
matched the words and names and reported no unclear words/noise/truncation.
Actual navigation/Play activation confirmed each mode selects its own greeting
and MP3, including unnamed default speech.

Paging now overlays the miniature loop map below the grid. The selected region
outlines the visible boxes; coloured dots show drum/tune hits and the moving
light remains separate. Buttons fill the map sections as touch targets. A
reproduced inherited align-items rule centered 44px buttons within the map;
stretching the items now makes their selected outline cover the whole region.
There are no page controls above the grid. The large standalone volume row is
between the map and playback controls, with only a speaker icon and slider,
an accessible Volume name, a 64px hit area and a 38px thumb. Loop-size labels
use 4/8/16 pills; beat/bar counts remain available to screen readers.

Development Node suite: 39 passed. Final full browser suite: 406 passed, including the pill counts.
267 theme/layout/reading/map/volume assertions pass per viewport at 360×800,
800×360 and 1280×800, covering all sizes. The focused landscape tutorial passes
all 110 checks after the map/volume move. Syntax, build and diff checks pass.

## Speaker mute/restore — 17 October 2026

Base main `6c038f3` was clean and current after the Sites source helper fetched
and checked it. Node baseline: 39 passed. The first browser baseline attempt
failed `held Xbox A edits exactly once and shows controller focus`; the same
unchanged base passed all 406 checks on rerun. No production gamepad changes
were made for this intermittent baseline failure.

The speaker is now a native toggle button with a crossed-speaker muted icon,
pressed state and accessible Mute/Restore volume labels. It remembers the last
positive level, sets the volume to zero on mute and restores that exact level.
Dragging to zero also shows mute; raising the slider unmutes. The existing
volume path updates both Web Audio and any active narration. Muting keeps the
loop running and does not edit or save the song. Mouse and keyboard Space
activation were observed; simulated held Xbox A is checked for one toggle.

A failing DOM assertion confirmed the original speaker was not a button.
New integration checks verify restore levels, slider zero/unmute behaviour,
icon/ARIA state, continuing playback, actual master-gain API updates, held A
and unchanged song storage. Development Node tests: 39 passed; syntax, build
and diff checks pass.
Full development browser suite: 415 passed. Focused mute, map/volume and theme
layout/reading checks: 98 passed at each of 360×800, 800×360 and 1280×800.
The speaker target measures approximately 56×64 CSS pixels and the slider
retains its large hit area. No physical Android/Xbox test is claimed.
