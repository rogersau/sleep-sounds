# Audio credits

**Rain:** [AMB Rain Loop 2](https://opengameart.org/content/amb-rain-loop-2), an actual outdoor GoPro recording by Kresiek The Furry, dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

This app uses [OpenMMO's 37-second edit](https://github.com/Julian-adv/OpenMMO/blob/master/client/public/sounds/rain-loop.ogg) of seconds 505–545, with its three-second self-crossfade. See [the editor's provenance](https://github.com/Julian-adv/OpenMMO/blob/master/doc/assets/sfx.md#weather). The source edit is bundled as `audio-source/amb-rain-loop-2.ogg` (SHA-256 `daeb4eec29dbd488b69a4191986562dbb371c9be6303f0cfb8f1db5a7b871fc5`). `python3 generate.py` resamples, levels and crossfades copies of that same recording for the native player. It adds no other layer to the rain. The script uses FFmpeg and NumPy.

**Pink noise:** Original generated sound, supplied as a separate optional stem. It is not audible or loaded for rain-only playback.
