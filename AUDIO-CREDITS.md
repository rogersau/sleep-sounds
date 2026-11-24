# Audio credits

**Rain:** [AMB Rain Loop 2](https://opengameart.org/content/amb-rain-loop-2), an actual outdoor GoPro recording by Kresiek The Furry, dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

This app uses [OpenMMO's 37-second edit](https://github.com/Julian-adv/OpenMMO/blob/master/client/public/sounds/rain-loop.ogg) of seconds 505–545, with its three-second self-crossfade. See [the editor's provenance](https://github.com/Julian-adv/OpenMMO/blob/master/doc/assets/sfx.md#weather). The source edit is bundled as `audio-source/amb-rain-loop-2.ogg` (SHA-256 `daeb4eec29dbd488b69a4191986562dbb371c9be6303f0cfb8f1db5a7b871fc5`). `python3 generate.py` resamples, levels and crossfades copies of that same recording for the native player. It adds no other layer to the rain. The script uses FFmpeg and NumPy.

**Ocean surf:** [Oceanwaves-5.wav](https://freesound.org/people/Rmutt/sounds/148283/) by Rmutt, recorded at Point Reyes and released under CC0 1.0. The bundled high-quality preview `audio-source/ocean-waves-rmutt.mp3` has SHA-256 `96cf54a0aee5af8d8a05c7acec7668721205c153ee5cd272b5387da906bc4eea`.

**Fireplace:** [Fire crackling in fireplace](https://freesound.org/people/NomadApe/sounds/444920/) by NomadApe, released under CC0 1.0. The bundled high-quality preview `audio-source/fireplace-nomadape.mp3` has SHA-256 `75c29c436bb6ae70ca324602e7747a7cbcebf18b6a088ed93c331ce890c1c28b`.

**Forest stream:** [LargeStreamOverLoginForestMarch.wav](https://freesound.org/people/kvgarlic/sounds/149743/) by kvgarlic, recorded in Shawnee National Forest and released under CC0 1.0. The bundled high-quality preview `audio-source/forest-stream-kvgarlic.mp3` has SHA-256 `3e62b56b78a6db4683e63c3672879141c153f0324815798265d9db7adf1406b1`.

**Pink, brown and white noise:** Generated stereo sounds, each available as a separate optional layer.

**Airplane cabin:** [Airplane Ambiance (Airliner)](https://freesound.org/people/RyanKingArt/sounds/702132/) by RyanKingArt, released under CC0 1.0. The bundled high-quality preview `audio-source/airplane-ryankingart.mp3` has SHA-256 `35108522839917eb4fe6b2f52869133f69052c2b19ad5d64114978c6848cd545`.

**Train:** [Train Track Joints Slow (Loop)](https://freesound.org/people/KayleRustone/sounds/474977/) by KayleRustone, released under CC0 1.0. The bundled high-quality preview `audio-source/train-kaylerustone.mp3` has SHA-256 `651f31394b3a3a78c2b1adb50dc386fa82130ac048f4e92f1936621367eccee0`.

**Coffee shop:** [Coffee Shop Ambience](https://freesound.org/people/AwenAudio/sounds/403064/) by AwenAudio, released under CC0 1.0. The bundled high-quality preview `audio-source/coffee-shop-awenaudio.mp3` has SHA-256 `b9ac2765ae67dba69a579babf01fa6773e907278f0c1c588bffb7eb81906278b`.

`python3 generate.py --library` reproduces the additional recordings and brown and white noise using FFmpeg and NumPy. It resamples and crossfades the recordings, softens loud hits, and keeps the train rhythm in a 16-second loop. The other recordings it generates loop every 64 seconds. Brown and white noise use seeded generation to produce 32-second loops.
