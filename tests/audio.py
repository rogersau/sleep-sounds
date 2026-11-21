"""Check the shipped PCM files, native mixer compatibility and rain seam."""
from pathlib import Path
import wave

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
RATE = 24_000

for name in ("rain", "pink"):
    with wave.open(str(ROOT / "dist" / f"{name}.wav")) as audio:
        assert (audio.getnchannels(), audio.getsampwidth(), audio.getframerate()) == (2, 2, RATE)
        assert audio.getnframes() == RATE * 128
        x = np.frombuffer(audio.readframes(audio.getnframes()), "<i2").reshape(-1, 2) / 32768.0
    rms = np.sqrt(np.mean(x.reshape(-1, RATE, 2) ** 2, axis=(1, 2)))
    peak = float(np.max(np.abs(x)))
    assert peak < 0.85, (name, "peak exceeds mixer headroom bound")
    assert np.min(rms) > 0.04, (name, "quiet or silent block")
    variation = 20 * np.log10(rms.max() / rms.min())
    assert variation < 4, (name, variation)
    within = np.quantile(np.abs(np.diff(x, axis=0)), 0.999, axis=0)
    seam = np.abs(x[0] - x[-1])
    assert np.all(seam <= within), (name, seam, within)
    print(f"{name}: 128s stereo, peak {peak:.3f}, 1s level range {variation:.2f} dB, seam within natural sample deltas")
