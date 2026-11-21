"""Build the app's 128-second rain stem from the bundled CC0 recording.
Requires Python 3, NumPy and FFmpeg. Does not touch the optional pink noise.
"""
import hashlib
import subprocess
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "audio-source" / "amb-rain-loop-2.ogg"
EXPECTED = "daeb4eec29dbd488b69a4191986562dbb371c9be6303f0cfb8f1db5a7b871fc5"
RATE, SECONDS = 24_000, 128


def main():
    if hashlib.sha256(SOURCE.read_bytes()).hexdigest() != EXPECTED:
        raise ValueError("Rain source does not match AUDIO-CREDITS.md")
    decoded = subprocess.check_output(
        ["ffmpeg", "-v", "error", "-i", str(SOURCE), "-ar", str(RATE),
         "-ac", "2", "-f", "f32le", "-"]
    )
    field = np.frombuffer(decoded, "<f4").reshape(-1, 2)
    if len(field) != RATE * 37:
        raise ValueError("Unexpected source loop length")

    # Four repeats of the editor's already crossfaded excerpt. Only the
    # first and last four seconds overlap to make the 128s player join clean.
    fade, length = 4 * RATE, SECONDS * RATE
    raw = np.tile(field, (4, 1))[:length + fade]
    track = raw[fade:length + fade].copy()
    angle = np.linspace(0, np.pi / 2, fade, endpoint=False)[:, None]
    track[-fade:] = raw[length:length + fade] * np.cos(angle) + raw[:fade] * np.sin(angle)
    rms, peak = np.sqrt(np.mean(track ** 2)), np.max(np.abs(track))
    if not 0 < rms <= peak:
        raise ValueError("Source rain is silent or invalid")
    track *= min(0.15 / rms, 0.75 / peak)
    pcm = np.rint(track * 32767).astype("<i2")

    with wave.open(str(ROOT / "dist" / "rain.wav"), "wb") as out:
        out.setparams((2, 2, RATE, SECONDS * RATE, "NONE", "not compressed"))
        out.writeframes(pcm.tobytes())


if __name__ == "__main__":
    main()
