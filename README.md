# Sleep Sounds

An offline-ready sound mixer for phones and desktops. Start with rain, try a preset, or blend ocean surf, fireplace, forest stream, pink noise, brown noise and white noise. The local app runs without an account or backend.

## React Native on Android and iOS

Use Node.js 22.13+ or 24.3+ and run `npm ci`. Run `npm run android` with the Android SDK and an emulator or connected phone, or `npm run ios` on a Mac with Xcode. For offline and lock-screen checks, use an installed build with the JavaScript bundle embedded.

The native app bundles all seven sounds for offline listening. It starts with rain only, remembers your mix and resets the boost at launch. The native audio engine loops each selected sound and fades volume changes during playback.

Use **Sleep timer** to stop after 15–120 minutes with an optional fade. Pause playback to pause the countdown. **Saved mixes** keeps named combinations and favorites on the device, including their volume boost.

Run `npm run typecheck` and `npm run test:native` to check the TypeScript and mixer. Run `npm run bundle:native` to export both native bundles to `.expo/native-export`.

## Run the web app locally

```sh
python3 -m http.server 8080 --directory dist
```

Open <http://localhost:8080>. Use localhost or HTTPS so the service worker can enable offline use. This project is plain HTML, CSS and JavaScript; there is no package installation or build step for the bundled assets.

- Tap a sound to turn it on or off. Drag left or right on the same tile to set its volume. Open **Presets** for ready-made mixes.
- Open **Settings** to install the app or use **Save offline** for the full library, about 49 MB.
- **Gapless** loops each sound and adjusts volume during playback.
- If locking the screen interrupts playback, choose **Screen-off** in **Settings** and tap **Play**. With the timer off, the 32-minute track can briefly pause when it repeats. With a timer, the track ends with the chosen fade. Changing the mix or timer rebuilds the track.
- Use **Timer** with either mode. **Saved mixes** supports naming, starring, recalling, renaming and deleting mixes offline.

## Check a change

```sh
for test in tests/*.cjs; do node "$test" || exit; done
python3 tests/audio.py
```

See [audio credits](AUDIO-CREDITS.md) for recording sources, licences and audio regeneration. Audio licensing is separate from the app source.
