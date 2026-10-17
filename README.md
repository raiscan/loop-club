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

- **Jungle jump**, **Robot dance** and **Moon bounce** are starting grooves.
  Choosing one replaces the current groove, and **Undo** brings it back.
- **Beats:** tap steps to switch drums on or off. Four lanes can each use any
  of eight percussion sounds: kick, snare, hat, clap, tom, shaker, open hat or
  cowbell. Tap a numbered sound selector to cycle instruments; it previews
  the new sound and keeps the pattern. The large drum pads play individual sounds. A loop always has 16 steps. Narrower screens show
  eight or four at a time, with numbered page buttons; the full loop keeps playing.
- **Tunes:** tap a coloured square to add or replace a note. Tap it again to
  remove it. The six keys use C minor pentatonic notes and play individually.
  Choose Bass, Pluck, Arcade or Bell above the grid; the same selection appears
  in Sounds. The white outlined column follows playback in both grids.
- **Sounds:** brightness changes the synth filter, note length changes its
  envelope, and wobble moves its filter in tempo. The drawing illustrates
  those settings; it is not an oscilloscope. Sliders audition a note while stopped.
- **Speed** changes the tempo from 80–180 BPM; **Volume** controls all audio.
- The latest groove, tempo and synth settings save automatically in this
  browser's local storage, including drum and synth instrument choices. Older
  three-drum saves upgrade automatically, keeping every existing step and
  adding an empty fourth lane. It is one current song per browser/origin, not a
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
| LB / RB | Switch Beats, Tunes and Sounds |
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
await (await import('./tests/browser-checks.js?v=3')).runBrowserChecks()
```

Run the following at the desired viewport widths to check every section's
control bounds and target sizes:

```js
(await import('./tests/browser-checks.js?v=3')).runLayoutChecks()
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
- `gamepad.js`: standard controller button edges, repeat and stick dead zone.
- `app.js`, `index.html`, `style.css`, `icon.svg`: interface and input wiring.
- `tests/`: Node checks and browser integration checks.
- `reference/original-site/`: unchanged provenance snapshot of the retired
  UncleHerbert site. It is not loaded by Loop Club.

Asset URLs carry a release query (`v=3`) so a refreshed page loads matching
interface and audio modules after an update. Bump it together in the HTML
and browser module imports when publishing changes.

This first playable prototype has no recording, export, MIDI, song library,
pattern chaining or public deployment. It grew from the archived UH-16
Pocket Transmitter. UncleHerbert remains the user's separate music identity;
Loop Club is not presented as an UncleHerbert portfolio. No licence has been
selected. The repository currently has no remote configured.
