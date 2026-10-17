# Loop Club

[Play Loop Club](https://loop-club-kidsynth.auroraacorn4.chatgpt.site) · [MIT licence](LICENSE)

A browser music toy built for a five-year-old who likes drum and bass and techno.
Make drum loops, paint tunes, stack chords and change the sounds. Use touch,
a mouse or an Xbox controller on PC.

## Play

Pick a song or start with **Clear**, then try the three pages:

- **Drums:** tap boxes to add beats. Tap ↻ beside a drum to change its sound.
- **Tunes:** pick an instrument and paint notes. Stack notes in one column for
  a chord. Tap a note with the same instrument to erase it.
- **Sounds:** change brightness, note length and wobble. Each instrument keeps
  its own settings. Pick one at the top to change it.

Each box is one beat. Small, Medium and Large loops have 4, 8 and 16 boxes:
1, 2 and 4 bars in 4/4. Shrinking a loop hides later bars without deleting them.
Speed runs from 30 to 600 BPM.

**Help** starts a spoken, hands-on tour with room to experiment. It uses a
separate practice song; leave to return to your music, or choose **Keep it**.
**Look** offers Sunny, Pink, Space, Dino and Race themes.

**Undo** restores edits, song changes and clears. **Start over** reloads the
selected example or empties a Me slot. Press the speaker to mute or restore
volume; the slider controls both music and the tutorial voice.

## Save and share

- **Me 1**, **Me 2** and **Me 3** save your changes automatically.
- Editing an example creates **Current**. Switch away and it becomes **Last**,
  ready to return to. Editing a Me song leaves Last alone.
- Saves stay in that browser on that device. There are no accounts or cloud sync.

**Share** makes a link containing the loaded song, including hidden bars,
chords, instruments, speed and sound settings. It leaves out player names and
preferences such as volume and theme. Links capture a snapshot; later edits
need a new link.

Opening a link loads a stopped **Shared** preview without overwriting existing
saves. Editing it creates Current/Last. See [song links](docs/share-links.md)
for the format and import behaviour.

## Run locally

No dependencies or build step are needed. From the project folder:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open [localhost:8080](http://localhost:8080) and click **Let's play** to enable
sound. Serve the files rather than opening `index.html` directly: the app uses
JavaScript modules.

For an Android tablet, bind to `0.0.0.0` instead. Connect it to the same network
and open `http://<PC-LAN-IP>:8080` in Chrome. The PC must allow the connection.
Xbox support is intended for PC.

## Controls

**Space** plays or stops the music machine. **Ctrl/Cmd+Z** undoes.
Playback stops when the window loses focus.

For Xbox, connect by USB or Bluetooth and press a controller button. Use
localhost or HTTPS. A click or tap may be needed to enable sound first.

| Xbox control | Action |
| --- | --- |
| D-pad / left stick | Move focus; adjust a selected slider |
| A | Activate a control or play a pad/key |
| B | Return to the section tab or close help |
| X | Undo |
| LB / RB | Switch Drums, Tunes and Sounds |
| Menu | Play / stop |

For Bluetooth speakers, open **? → Speaker sync**. Use **Test sound and lights**
and adjust **Delay lights** until they match. This delays the visuals, not the
music, and is saved in that browser.

## Development

Plain HTML, CSS and JavaScript, with Web Audio for synthesis. No backend.
Node 22+ runs the checks without installing packages:

```sh
node --test
node --run check
```

For browser checks, serve the project and click **Let's play** once. Run these
in the console of a test tab, awaiting each call:

```js
const checks = await import('./tests/browser-checks.js?v=31');
await checks.runBrowserChecks();
checks.runLayoutChecks();
await checks.runShareStartupChecks();
```

Reload afterward to restore the saved song in the interface. These checks use
simulated touch and controller input; they do not replace hardware testing.
Past results are in the [verification record](docs/verification.md).

Build the static hosting bundle in `dist/` with:

```sh
node scripts/build-site.mjs
```

The tutorial voice is bundled as MP3s, so playback needs no API key or installed
voice. To regenerate clips, see [the generation script](scripts/generate-tutorial-voice.mjs).
It needs Node 22+, ffmpeg, ffprobe and an OpenRouter key in
`~/.config/openrouter/api-key`. Generation uses the API; the app never receives
the key. Voice settings and clip provenance are in
[the voice bank](assets/tutorial-voice/generation.json).

## Credits

Farrell Hayman — idea and direction. ZM — play testing. OpenAI Codex — development.
Released under the [MIT licence](LICENSE), copyright 2026 Farrell Hayman.
