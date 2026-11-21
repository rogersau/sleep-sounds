# Verification

Run the Node tests from the project root to check rain-only defaults and migration, source selection, WAV construction and exact rain-only samples, headroom and offline cache behavior:

```sh
for test in tests/*.cjs; do node "$test" || exit; done
python3 tests/audio.py          # Requires NumPy.
```

To rebuild only the real-rain stem: `python3 generate.py` (NumPy and FFmpeg). See [audio credits](../AUDIO-CREDITS.md). This uses only the bundled, documented CC0 rain field recording and adds no noise layer.

For browser QA, serve `dist/` and check Rain only, explicit Pink noise opt-in and return to Rain only, then save for offline and verify playback after loading offline. Check lock-screen playback with the actual Android handset; browser simulation is not proof of device behavior. The joins inside the 32-minute track are contiguous; the browser can pause briefly when it repeats the full track.
