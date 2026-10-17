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

## Bluetooth speaker timing

Open **?** (grown-up help), then **Speaker sync**. Press **Test sound and
lights** and adjust **Delay lights** until the flashes match the clicks.
The 0–1,000 ms correction is saved on that browser and applies to the grid,
loop map and tutorial's moving lights. It changes visual timing only; the
music keeps its original tempo and timing. Reset to 0 for an undelayed output,
and recalibrate after changing speakers or the connection. The test does not
edit your song. Closing help or leaving the page stops it.

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
- **Help** opens a short tour with sixteen actions and a final Keep it screen.
  It covers playback, songs, Clear, drums, drum sounds, Tunes, brushes, painting,
  chords, loop sizes and sound shaping. Large sans-serif words and live diagrams
  accompany spotlights on the actual controls. Practice starts blank at 120 BPM.
- Musical actions respond immediately and loop the demonstrated section twice.
  A brief spoken response runs once on the first action. Further taps and slides
  update or replay the music without stopping or restarting speech. **Next** is
  ready immediately, so each feature stays open to play until the child moves on.
  **Hear again** repeats music; it never repeats an instruction. Final playback
  includes drums and tunes, loops twice, then returns to Drums.
- Thirty-one bundled MP3 prompts use the approved soft Scottish female voice.
  The browser preloads them for faster responses. New prompts avoid repeated
  “that was you” praise and briefly name what can be tried and what comes next.
  Windows 11 and Android play the same files without installing a device voice.
  Device speech remains a fallback. **Say it** repeats the current instruction;
  **Voice on/off** toggles narration. Volume controls all sounds, and music ducks
  while the guide speaks. Visitors need no key or runtime OpenRouter access.
- **Bye**, Escape or Xbox B closes practice and restores the original music.
  Leaving the page also stops it. **Keep it** saves the practice song, including
  its chosen size and painted instruments. One Undo brings the original back.
- **Clear** empties all drum and tune boxes across the whole loop, preserving
  instruments, size, speed and sound settings. One Undo restores all the music.
  Start over reloads the selected example instead.
- From 1400px wide, section tabs, Loop size and songs share a sticky left sidebar.
  Smaller screens keep section tabs on the machine and songs beneath it. There
  is one set of controls, moved between layouts to preserve focus and state.

- Nine starting grooves: **Jungle jump**, **Robot dance**, **Moon bounce**,
  **Liquid lift**, **Roller skate**, **Acid ants**, **Disco dots**, **Pixel party**
  and **Cloud chords**, below the music machine. Each is now authored for whole
  beats, with its own loop size and painted sounds. Jump is Small; Robot, Moon,
  Ants and Dance are Medium; River, Skate, Game and Cloud are Large. Longer
  phrases mix bass, chords, game sounds and chimes. Choosing one loads its size;
  **Undo** restores your previous music and size. Each song card shows its own
  4, 8 or 16 beat pills beneath its name, in rows of four like the size buttons.
- **Drums:** tap steps to switch drums on or off. Four lanes can each use any
  of eight percussion sounds: kick, snare, hat, clap, tom, shaker, open hat or
  cowbell. Tap a numbered sound selector to cycle instruments; it previews
  the new sound and keeps the pattern. The large drum pads play individual sounds.
- **Loop size:** Small is 1 bar (4 beat boxes), Medium is 2 bars (8 boxes),
  and Large is 4 bars (16 boxes). The choices show 4/8/16 pills instead of bar
  counts, while screen readers get the beat and bar counts. Every box is one quarter-note beat: four
  beats per bar in 4/4. Small shows only four boxes, widened to fill the grid.
  Growing repeats the current pattern into extra bars, with independently
  editable drums and chords. Shrinking keeps the first bars; Undo restores
  removed music and size. Presets load their authored size; Start over keeps your selected size.
  Resizing during playback restarts at the beginning. Tablets show up to eight
  boxes and narrower screens four; the loop map below the grid highlights the part being edited. Tap another
  part of that map to reveal it without shrinking targets. D-pad navigation crosses pages. The moving lights show the whole loop.
  The tour uses a four-beat practice song; leaving restores the original size,
  and Keep it saves the size chosen in practice.
- **Tunes:** choose Bass, Pluck, Game, Bell or Chime as a brush, then tap a coloured
  square to paint that sound. Its icon appears in the square (Game uses a robot).
  A different brush replaces that square's sound; the same brush clears it.
  Each square holds one instrument. Stack notes in the same column for a chord,
  mixing instruments across pitches if you like. Changing brushes keeps the
  sounds already painted.
  While stopped, editing a column previews the whole resulting chord. The six keys use C minor pentatonic notes and play individually.
  Chime is a bright, tuned struck sound with quickly fading upper tones and a
  soft ringing body; its sparkle icon marks painted notes. The same brush
  selection appears in Sounds and is used by the six keys.
  The white outlined column follows playback in both grids.
- **Sounds:** brightness changes the synth filter, note length changes its
  envelope, and wobble moves its filter in tempo. The drawing illustrates
  those settings; it is not an oscilloscope. These settings shape all painted
  instruments. Sliders audition the active brush while stopped.
- **Speed** changes the tempo from 30–600 BPM; **Volume** controls all audio from a large standalone speaker slider between
  the loop map and playback controls. Press the speaker to mute all audio; press
  again to restore the last nonzero level. Raising the slider also unmutes.
- The latest groove, tempo and synth settings save automatically in this
  browser's local storage, including each painted note's instrument and the
  active brush. Version-5 saves store one instrument per occupied square.
  Older saves upgrade automatically, keeping every existing note and step
  with its previous synth sound.
  Earlier 16-step saves become Large four-bar loops so every hit and note is retained.
  Playback now gives each box a full beat, so those old sequences play more slowly
  at the same BPM than the former sixteenth-note grid. The remade examples are
  authored directly for whole beats; fast dance examples use double-time tempos. Single notes become one-note chords; three-drum saves also gain an empty
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
await (await import('./tests/browser-checks.js?v=22')).runBrowserChecks()
```

Run the following at the desired viewport widths to check every section's
control bounds and target sizes:

```js
(await import('./tests/browser-checks.js?v=22')).runLayoutChecks()
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

Asset URLs carry a release query (`v=16`) so a refreshed page loads matching
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


Player modes are chosen only by URL: no player parameter uses unnamed greetings;
`?zach=yes` personalises Help, hello and goodbye for Zach; `?marcie=yes` does the
same for Marcie. Append with `&` when the URL already has a query. If both are
present, Zach takes precedence. These modes leave the saved music alone. Zach starts in Race and Marcie in
Pink until a different Look is chosen. Each mode remembers its own Look on that
browser; the unnamed mode retains its existing preference. Generic, Zach and Marcie greetings each have matching bundled Scottish
recordings; the remaining prompts are shared.
