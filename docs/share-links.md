# Song links

Share writes `#song=<code>` on the current app URL. Opening `?song=<code>` also
works. New links omit existing query parameters, including player names.
The code contains only music, not local save-slot identities or preferences.
There is no upload, server lookup or compression API dependency.

Version 1 uses 61 bytes, encoded as 82 unpadded base64url characters:

| Bytes | Data |
| --- | --- |
| 0 | Format version, currently 1 |
| 1 | Preset ID index |
| 2 | Active bars: 1, 2 or 4 |
| 3–4 | BPM, unsigned big-endian |
| 5–8 | Four drum sound IDs |
| 9 | Active synth brush ID |
| 10–12 | Brightness, length, wobble, each 0–100 |
| 13–20 | Four rows × sixteen drum bits, row then beat order |
| 21–56 | Six pitches × sixteen beats, beat then pitch order, three bits per square |
| 57–60 | CRC32 of bytes 0–56, unsigned big-endian |

Pattern fields pack the least significant bit first. A note's value is zero
for empty, or its synth ID plus one. The permanent ID lists are in `share.js`;
never reorder them. Visible and hidden bars together always fill sixteen beats.
The checksum detects damaged links; it is not authentication or encryption.
Decoding checks length, alphabet, canonical encoding, version, checksum, sound
IDs and the model's musical bounds before returning a song. Future incompatible
layouts need a new version and must retain decoding for earlier versions.

A link initially opens a stopped Shared preview. It leaves current autosave,
Last and every Me slot untouched. Undo restores the previous loaded song.
The first real edit adopts the preview as Current/Last and removes the import
parameter, so reloading retains the edited song. Choosing another song also
clears the import parameter. Tutorial practice stays separate until Keep it.

Copy link uses the Clipboard API. If unavailable or denied, the input is selected
for manual copying. Send uses the device share sheet when available; cancellation
is quiet and failures leave the Copy link option available. Browser tests mock
these boundaries and do not overwrite the system clipboard or send messages.
