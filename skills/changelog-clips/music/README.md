# Music

The included instrumental song was made with AI for this skill. The owner selected take A on 7 November 2026. `song.mp3` is the original, with its content credentials preserved; `song-stems/drums.m4a` and `song-stems/rest.m4a` are its matching separated stems. Keep these original files.

Web release-note demos and the default exports are silent. Music is optional for social versions: a 120 BPM, major-key electro-pop song with layered bell/pluck leads and a clear, warm, assured mood. No synthesized score is used.

Use the house fitter with the matching stems:

```sh
node scripts/render.mjs film --all --video --audio music/song.mp3 --stems music/song-stems --bpm 120 --downbeat 0.015 --land 2 --out film/out/song
```

For the 6.7 s reference the 2 s bar line lands as the pointer finishes leaving the result, giving the fitter 4.7 s to close. Do not gate or post-process the stems or replace the ending. Choose a later bar-line landing and extend the movie for a longer native action. Keep the silent exports for embeds. Check the encoded soundtrack's true peak is at most −1 dBTP.

Usage terms: see the skill's licence.
