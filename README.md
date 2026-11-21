# Sleep Sounds

An offline-ready rain player for phones and desktops. The default is rain only. Pink noise is a separate optional layer. No account, analytics or backend is needed to run the source locally.

## React Native on Android and iOS

Use Node.js 22.13+ or 24.3+ and run `npm ci`. Run `npm run android` with the Android SDK and an emulator or connected phone, or `npm run ios` on a Mac with Xcode. For offline and lock-screen checks, use an installed build with the JavaScript bundle embedded.

The native app includes both audio stems. It starts with rain only, remembers the rain and pink-noise levels on the device, and resets the boost at launch. The native audio engine loops the original samples continuously. Volume changes fade in while playback continues, and pink noise is loaded on first use.

Run `npm run typecheck` and `npm run test:native` to check the TypeScript and mixer. Run `npm run bundle:native` to export both native bundles to `.expo/native-export`.

## Run the web app locally

```sh
python3 -m http.server 8080 --directory dist
```

Open <http://localhost:8080>. Use localhost or HTTPS so the service worker can enable offline use. This project is plain HTML, CSS and JavaScript; there is no package installation or build step for the bundled assets.

- Open **Rain only** to turn off pink noise.
- To install on Android, open in Chrome and choose **Install app** or **Add to Home screen**. For offline listening, tap **Save for offline** and wait for confirmation.
- Playback uses a long native media track with no JavaScript refill in the background. Android battery and browser settings can still interrupt screen-off playback. Changing the blend restarts the track.

## Check a change

```sh
for test in tests/*.cjs; do node "$test" || exit; done
python3 tests/audio.py
```

See [audio credits](AUDIO-CREDITS.md) for the rain recording's source and licence. Audio licensing is separate from the app source.
