<h1 align="center">Sleep Sounds</h1>

<p align="center"><em>Night air, softly mixed.</em></p>

<p align="center">An offline sound mixer for sleep and focus on the web, Android, and iOS.</p>

<p align="center">
  <a href="#run-the-web-app">Run the web app</a> ·
  <a href="#android-and-ios">Android &amp; iOS</a> ·
  <a href="AUDIO-CREDITS.md">Audio credits</a>
</p>

<p align="center">
  <img src="docs/images/sleep-sounds-web.png" width="560" alt="The Moonlit Glass web mixer with rain, ocean surf, and pink noise layered together and a 45-minute sleep timer.">
</p>

## Mix a soundscape

- **Layer sounds.** Start with rain or a preset, then blend ocean surf, fireplace, forest stream, airplane cabin, train, coffee shop, and pink, brown, or white noise. On the web, filter by Nature, Ambience or Noise, then tap a sound to toggle it and drag sideways on the tile to adjust its volume.
- **Set a sleep timer.** Stop after 15–120 minutes with an optional fade. Pausing playback pauses the countdown.
- **Save your favourites.** Name, star, recall, rename, and delete mixes on your device. Saved mixes include your volume boost.
- **Listen offline.** The app runs locally without an account or backend. The mobile app bundles the sound library, and the web app can save it for offline use.

## Run the web app

```sh
python3 -m http.server 8080 --directory dist
```

Open <http://localhost:8080>. The web app uses plain HTML, CSS, and JavaScript. Run it on localhost or HTTPS to use the service worker. In **Settings**, choose **Install app** to install it or **Save offline** to cache the full library, about 63 MB.

<details>
<summary>Gapless and screen-off playback</summary>

- **Gapless** loops each sound and adjusts volume during playback.
- If locking the screen interrupts playback, choose **Screen-off** in **Settings** and tap **Play**. Without a timer, the 32-minute track may briefly pause when it repeats. With a timer, it ends with the selected fade. Changing the mix or timer rebuilds the track.

</details>

## Android and iOS

For an installable APK, sign in to GitHub and open the latest successful [Android APK build](https://github.com/rogersau/sleep-sounds/actions/workflows/android-apk.yml). Select **Download Sleep Sounds APK** in the run summary. Builds are available for 30 days.

Install the dependencies with Node.js 22.13+ or 24.3+.

```sh
npm ci
npm run android
```

For Android, have the Android SDK and an emulator or connected phone ready. On a Mac with Xcode, use `npm run ios`.

The native app bundles all ten sounds for offline listening, including airplane cabin, train and coffee shop. It starts with rain only, remembers your mix, and resets the boost at launch. A sticky mini-player keeps play/pause, active sound count and timer status visible while you browse the library. The audio engine loops each selected sound and fades volume changes during playback. To check offline and lock-screen listening, use an installed build with the JavaScript bundle embedded.

## Development checks

```sh
# Web and shared audio
for test in tests/*.cjs; do node "$test" || exit; done
python3 tests/audio.py

# Native
npm run typecheck
npm run test:native
```

Run `npm run bundle:native` to export both native bundles to `.expo/native-export`. See the [test guide](tests/README.md) for audio test prerequisites and manual playback checks.

## Audio credits

See the [recording sources, licences, and regeneration instructions](AUDIO-CREDITS.md). Audio licensing is separate from the app source.
