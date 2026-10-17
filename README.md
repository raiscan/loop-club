# Loop Club

A small browser music machine for a five-year-old who likes drum and bass,
techno and playing with a keyboard. Start with a groove, change the steps,
draw a tune and hear how a synth changes. The name and styling are provisional.

## Run on PC

No install, build, account, samples or external services are needed. From this
folder, run:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open http://localhost:8080 in a current browser and click **Let's play**.
Use a web server rather than opening `index.html` directly: the app uses
JavaScript modules. Sound starts only after an interaction. Playback stops
when the window loses focus, the page is hidden or the controller disconnects.

## Try it on an Android tablet

On the PC, use this command instead:

```sh
python3 -m http.server 8080 --bind 0.0.0.0
```

Connect the tablet to the same network and open `http://<PC-LAN-IP>:8080`
in Chrome, replacing `<PC-LAN-IP>` with the PC's local network address.
The PC must allow the connection. The tablet uses touch; Xbox support is
currently targeted at PC. No tablet/controller pairing is required.

## Play

- **Look** opens five pictured themes: Sunny (the original), Pink, Space
  (dark and starry), Dino (green), and Race (blue/red with a chequered stripe).
  The choice is saved separately on each device and works with touch, mouse
  and Xbox on PC.
- The main screen uses a bright cream-and-pastel music-toy theme, colourful
  drum pads, chunky yellow play buttons, Arial, short labels and large pictures. Visible words
  and numbers stay at least 18px, with larger action labels. Song cards use
  one-word names; genre names and synth terms are in grown-up help.
- **Help Zach** opens the hands-on tutorial. Ten short tasks use large Arial /
  sans-serif text and a gold ring around the next real control. Each lesson
  includes a diagram of the beat, loop, notes, chord stack or sound shape.
  Diagrams reflect the actual song and playhead. The screen dims around the highlighted control and helper;
  tap the bright control to try it. Each musical action then plays back on its
  own with a selective moving highlight. **Hear again** repeats it; **Next**
  becomes available after listening and stays available during repeat tries.
  The highlighted drum can be tapped again, beats and notes can be edited
  freely within the highlighted phrase, and all three sound sliders stay
  playable. The sound lesson loops the new notes while the sliders change them.
- A soft chime marks each action. Sixteen bundled MP3 prompts use one friendly
  soft Scottish female AI voice, generated once through OpenRouter. Five
  reward lines praise the played result and say “Tap Next”; experimenting
  interrupts the reminder so the music can be heard. Windows 11,
  Android and other devices play the same files without installing a voice.
  Device speech is a fallback if a clip fails to load or play. **Say it** reads
  one prompt, even with automatic speech off; **Voice on/off** toggles narration.
  Volume controls the recordings and chimes; music drops while the guide speaks.
  Visitors need no API key and make no runtime calls to OpenRouter.
- **Bye**, Escape or Xbox B closes the tutorial. It also closes when the page
  loses focus or becomes hidden. Drum and tune practice start with blank
  tracks at 120 BPM. Practice uses a separate song and leaves the saved song
  alone. **Keep it** saves the finished four-step phrase across the whole loop;
  one Undo brings the original song back. Leaving practice restores it.

- Nine starting grooves: **Jungle jump**, **Robot dance**, **Moon bounce**,
  **Liquid lift**, **Roller skate**, **Acid ants**, **Disco dots**, **Pixel party**
  and **Cloud chords**. The new loops explore different instruments and chords.
  Choosing one replaces the current groove, and **Undo** brings it back.
- **Drums:** tap steps to switch drums on or off. Four lanes can each use any
  of eight percussion sounds: kick, snare, hat, clap, tom, shaker, open hat or
  cowbell. Tap a numbered sound selector to cycle instruments; it previews
  the new sound and keeps the pattern. The large drum pads play individual sounds. A loop always has 16 steps. Narrower screens show
  eight or four at a time, with numbered page buttons; the full loop keeps playing.
- **Tunes:** tap a coloured square to add a note. Stack several notes in the same
  column to play a chord; tap a note again to remove only that note.
  While stopped, editing a column previews the whole resulting chord. The six keys use C minor pentatonic notes and play individually.
  Choose Bass, Pluck, Game or Bell above the grid; the same selection appears
  in Sounds. The white outlined column follows playback in both grids.
- **Sounds:** brightness changes the synth filter, note length changes its
  envelope, and wobble moves its filter in tempo. The drawing illustrates
  those settings; it is not an oscilloscope. Sliders audition a note while stopped.
- **Speed** changes the tempo from 30–300 BPM; **Volume** controls all audio.
- The latest groove, tempo and synth settings save automatically in this
  browser's local storage, including drum and synth instrument choices. Older
  saves upgrade automatically, keeping every existing note and step.
  Single notes become one-note chords; three-drum saves also gain an empty
  fourth lane. It is one current song per browser/origin, not a
  library or cloud account. Volume starts at a moderate default each visit.
  If storage is unavailable, the instrument still works and reports that saving
  is unavailable. Invalid/incompatible saves fall back to a fresh groove.
- **Undo** keeps up to 40 edits in memory, including whole slider gestures,
  groove changes and **Start over**. Undo history resets when the page reloads.

## Xbox controller on PC

Connect an Xbox controller to the PC by its usual USB or Bluetooth connection,
open the app, and press a controller button. It uses the browser's standard
Gamepad mapping; unrecognised mappings are reported rather than guessed.
The controller can operate all music controls, instrument selectors, preset buttons and help. A cycles the
selected drum sound or selects a synth voice; X undoes either change.

| Control | Action |
| --- | --- |
| D-pad / left stick | Move the highlight; left/right adjusts a focused slider |
| A | Activate the highlighted control or play a pad/key |
| B | Return to the active section tab; close help |
| X | Undo |
| LB / RB | Switch Drums, Tunes and Sounds |
| Menu | Play / stop |

Moving right past the last step opens the next page. Moving left past the
large pad opens the previous page. Touching or clicking returns to direct
input without resetting the song. Holding A changes a step only once.

Some browser autoplay policies require a click/tap on Play once before a
controller can start sound. The app gives a prompt if audio cannot start.
Controller access requires localhost or HTTPS on PC. Arrow keys also navigate
the section tabs, native sliders accept keyboard input, and Ctrl/Cmd+Z undoes.

## Verification

Node 22+ is sufficient; there are no dependencies to install:

```sh
node --test
node --check app.js
node --check model.js
node --check audio.js
node --check gamepad.js
```

Browser integration checks run on the served app, after clicking Play once.
They exercise real Web Audio rendering, playback cancellation, editing,
saving, undo, synthetic touch input and simulated standard Xbox input:

```js
await (await import('./tests/browser-checks.js?v=12')).runBrowserChecks()
```

Run the following at the desired viewport widths to check every section's
control bounds and target sizes:

```js
(await import('./tests/browser-checks.js?v=12')).runLayoutChecks()
```

The interaction checks restore the saved song in storage when done; reload
once afterward to restore that song in the interface. Run these in a test tab:
the checks temporarily replace storage writes and the gamepad hardware reader.
A simulated controller verifies the app logic, not a physical controller's
connection or a particular Android device/browser. Those hands-on checks remain.
See [the verification record](docs/verification.md) for this prototype's results.

## Structure and scope

- `model.js`: starter patterns, validated saved songs, edits and undo.
- `audio.js`: Web Audio voices, compressor/master output and look-ahead clock.
- `tutorial.js`: guided tasks, live diagrams, recorded prompts and speech fallback.
- `tutorial-voice.js`, `assets/tutorial-voice/`: clip mapping, generated audio and provenance.
- `gamepad.js`: standard controller button edges, repeat and stick dead zone.
- `app.js`, `index.html`, `style.css`, `icon.svg`: interface and input wiring.
- `tests/`: Node checks and browser integration checks.
- `reference/original-site/`: unchanged provenance snapshot of the retired
  UncleHerbert site. It is not loaded by Loop Club.

Asset URLs carry a release query (`v=12`) so a refreshed page loads matching
interface and audio modules after an update. Bump it together in the HTML
and browser module imports when publishing changes.

This first playable prototype has no recording, export, MIDI, song library,
pattern chaining or a backend. It grew from the archived UH-16
Pocket Transmitter. UncleHerbert remains the user's separate music identity;
Loop Club is not presented as an UncleHerbert portfolio. No licence has been
selected. Sites source synchronization uses a short-lived native credential;
no token is stored in this repository.

## Codex Site

The app is configured for a public Codex Site. Its identity is
tracked in `.openai/hosting.json`; reuse that project ID for future updates.

```sh
node scripts/build-site.mjs
```

This prepares nine app assets and eleven MP3 clips in ignored `dist/`. The original
reference site, tests, source history and local state are not part of the
served bundle. The script preserves unexpected files in `dist/` by stopping
instead of deleting them. Use the Sites skill's source/package helper from
the integrated main checkout to push and publish that exact source state.
Prepare commits with the required co-author trailer before the helper runs.
The Site is public and does not require sign-in. Saves remain local
to each browser and origin; hosting does not copy a localhost save to the Site.


## Rebuild tutorial narration

`scripts/generate-tutorial-voice.mjs` is a local-only generation tool. It uses
Node 22+, ffmpeg and ffprobe, reading the authorized OpenRouter key from
`~/.config/openrouter/api-key`. Keep that file outside the repository with mode
0600 and its directory at 0700. No key is copied into project environment files.

```sh
node scripts/generate-tutorial-voice.mjs
```

The current bank uses Gemini 3.8 Flash TTS, voice Sulafat, with warm
female Scottish English delivery instructions, using the softer sample
approved for Zach. `generation.json` records the
transcripts, voice settings, durations, hashes and generation IDs. Generation
skips unchanged, intact clips and preserves existing files when they differ.
Archive a changed clip before regenerating it. The build rejects missing or
outdated clips so prompts cannot silently drift from the narration. Only the
finished MP3s and runtime mapping are served; the generator and provenance are
not in the hosted bundle. Generation incurs one-time API use; playback is local
to the browser using same-origin static files.
