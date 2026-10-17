# Current handoff: Loop Club

The archived UH-16 looping synth has become a first playable instrument for
children. The current brief and run instructions are in README.md.

## User's direction

- His son is five, likes playing with a keyboard and listening to toy demo
  tracks, and enjoys his father's drum and bass and techno.
- Prioritise enjoyable musical exploration, immediate audible feedback and
  real synth sounds. Ready-made grooves give him something to change.
- Support Android tablet touch, PC mouse, and an Xbox controller on PC.
  The user explicitly deferred gamepad use on the tablet.
- The same music and controls should survive input changes. Saved creations
  and undo make experimentation recoverable.

## Current first prototype

Three starter grooves; four-lane, 16-step drum grid with eight switchable percussion sounds; six-note melody grid; synth filter,
note length and wobble; Bass/Pluck/Arcade/Bell voices; tempo and volume; automatic local saving; grouped undo.
Responsive step pages retain large targets. Version-one saves migrate to four
lanes without changing the existing music. The Tunes playhead CSS regression
is covered by browser checks. All sounds use Web Audio synthesis.
No framework, service, credentials or runtime dependencies.

This is a prototype to try with the child, not a validated learning product.
Physical Android touch/audio and Xbox hardware testing remain. Browser tests
use actual Web Audio but simulate the controller and touch hardware boundary.
Do not claim device verification from desktop viewport checks.

## Scope and provenance

Loop Club is a provisional name. No recording, MIDI, export, pattern chaining,
account system, public hosting or large DAW has been requested for this version.
The original portfolio snapshot stays under reference/original-site/.
UncleHerbert is exclusively the user's separate AI music/art/film moniker.
Candescence and OpenGGF are separate projects and must not be presented as
UncleHerbert projects. The rejected portfolio website is not the new product.

Read docs/verification.md for observed checks and Git delivery limitations.
