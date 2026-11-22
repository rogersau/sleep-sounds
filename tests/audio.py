"""Check the shipped PCM formats, levels, loop boundaries and noise spectra."""
from pathlib import Path
import wave

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
RATE = 24_000
STEMS = {
    "rain": (128, 0.04, 4),
    "pink": (128, 0.04, 4),
    "ocean": (64, 0.01, 25),
    "fireplace": (64, 0.04, 10),
    "stream": (64, 0.04, 8),
    "brown": (32, 0.04, 4),
    "white": (32, 0.04, 4),
}

for name, (seconds, minimum_rms, maximum_variation) in STEMS.items():
    with wave.open(str(ROOT / "dist" / f"{name}.wav")) as audio:
        assert (audio.getnchannels(), audio.getsampwidth(), audio.getframerate()) == (2, 2, RATE)
        assert audio.getnframes() == RATE * seconds
        x = np.frombuffer(audio.readframes(audio.getnframes()), "<i2").reshape(-1, 2) / 32768.0
    rms = np.sqrt(np.mean(x.reshape(-1, RATE, 2) ** 2, axis=(1, 2)))
    peak = float(np.max(np.abs(x)))
    assert peak < 0.85, (name, "peak exceeds mixer headroom bound")
    assert np.min(rms) > minimum_rms, (name, "quiet or silent block")
    variation = 20 * np.log10(rms.max() / rms.min())
    assert variation < maximum_variation, (name, variation)
    within = np.quantile(np.abs(np.diff(x, axis=0)), 0.999, axis=0)
    seam = np.abs(x[0] - x[-1])
    assert np.all(seam <= within), (name, seam, within)
    if name in ("brown", "white"):
        frequency = np.fft.rfftfreq(len(x), 1 / RATE)
        power = np.abs(np.fft.rfft(x[:, 0])) ** 2
        low = power[(frequency >= 100) & (frequency < 400)].mean()
        high = power[(frequency >= 2_000) & (frequency < 4_000)].mean()
        if name == "brown":
            assert low > 20 * high, (name, low / high)
        else:
            assert 0.8 < low / high < 1.3, (name, low / high)
    print(f"{name}: {seconds}s stereo, peak {peak:.3f}, 1s level range {variation:.2f} dB, seam within natural sample deltas")
