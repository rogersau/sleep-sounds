# Verification

Run the Node tests from the project root to check defaults, gapless playback, mixing, timer fades, saved mixes and the offline cache:

```sh
for test in tests/*.cjs; do node "$test" || exit; done
python3 tests/audio.py          # Requires NumPy.
```

With NumPy and FFmpeg installed, run `python3 generate.py` to rebuild rain or `python3 generate.py --library` to rebuild the five additional sounds. See [audio credits](../AUDIO-CREDITS.md) for the sources.

For browser QA, serve `dist/` and start in Gapless mode. Try a saved mix, pause and resume the timer, and check that expiry stops playback. Save for offline, load offline and check timed playback in both modes. Check locked-screen playback on Android and iPhone. The browser may briefly pause when it repeats the full 32-minute track in Screen-off mode with the timer off.
