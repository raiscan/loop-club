# UH-16 Pocket Transmitter

Standalone browser instrument extracted from the UncleHerbert demo site on 17 October 2026. This is the starting prototype for a new ideas thread, not a finished music production tool.

## Run

Open `index.html` in a modern browser, or run:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Then visit http://localhost:8080. No install, build, account, API key, or hosting required. Audio starts only when you press Start Signal. The standalone version uses system fonts and has no external dependencies.

## Existing behaviour

- Four tracks: kick, snare, hi-hat and synth.
- 16 toggleable steps per track, scheduled as sixteenth notes.
- Three presets: Neon highway, Dust & circuits, Through the rift.
- Tempo from 75 to 170 BPM; start/stop; reset current preset.
- Synthesized audio using the Web Audio API, without samples.
- Playback stops when the page becomes hidden.

## Files

- `index.html`: instrument interface.
- `style.css`: extracted instrument styling and responsive layout.
- `app.js`: patterns, controls, synthesizers and scheduler.
- `NEXT_THREAD.md`: context and starting prompt for ideation.
- `reference/original-site/`: source snapshot of the retired website, for provenance and visual reference. Not used by the instrument; contains the original external Google Fonts import.

## Known limitations

Edits live only in memory; refreshing loses them. No save/load, export, MIDI, recording, mixer, effects, individual pitch editing or pattern chaining. Synth pitches are fixed per preset and change in groups of four steps. Browser timer throttling is mitigated with look-ahead scheduling; this is still a prototype. The site preview infrastructure failed during original development, so browser/audio QA remains to be done. Syntax and structural checks passed on extraction.

## Git

This directory includes an initialized local Git repository on `main` with an initial snapshot commit and no remote. No deployment configuration or credentials are included. No licence has been selected.
