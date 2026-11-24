"""Build the original rain stem, or the expanded library with --library."""
import argparse
import hashlib
import os
import subprocess
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "audio-source" / "amb-rain-loop-2.ogg"
EXPECTED = "daeb4eec29dbd488b69a4191986562dbb371c9be6303f0cfb8f1db5a7b871fc5"
RATE, SECONDS = 24_000, 128
FFMPEG = os.environ.get("SLEEP_SOUNDS_FFMPEG", "ffmpeg")
RECORDINGS = {
    # Source file, SHA-256, duration, overlap, trim, target RMS, replay speed.
    "ocean": ("ocean-waves-rmutt.mp3", "96cf54a0aee5af8d8a05c7acec7668721205c153ee5cd272b5387da906bc4eea",
              64, 2.5, 0.25, 0.10, 1),
    "fireplace": ("fireplace-nomadape.mp3", "75c29c436bb6ae70ca324602e7747a7cbcebf18b6a088ed93c331ce890c1c28b",
                  64, 2.5, 0.30, 0.11, 1),
    "stream": ("forest-stream-kvgarlic.mp3", "3e62b56b78a6db4683e63c3672879141c153f0324815798265d9db7adf1406b1",
               64, 1.25, 0.30, 0.13, 1),
    "airplane": ("airplane-ryankingart.mp3", "35108522839917eb4fe6b2f52869133f69052c2b19ad5d64114978c6848cd545",
                 64, 3.0, 1.0, 0.13, 1),
    # Fit four periods of the rail-joint pattern into 16 seconds without cutting a beat.
    "train": ("train-kaylerustone.mp3", "651f31394b3a3a78c2b1adb50dc386fa82130ac048f4e92f1936621367eccee0",
              16, 0.06, 0.0, 0.09, 17.54 / 16),
    "coffee-shop": ("coffee-shop-awenaudio.mp3", "b9ac2765ae67dba69a579babf01fa6773e907278f0c1c588bffb7eb81906278b",
                    64, 3.5, 20.5, 0.085, 1),
}


def decode(path, expected, speed=1):
    if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
        raise ValueError(f"{path.name} does not match AUDIO-CREDITS.md")
    command = [FFMPEG, "-v", "error", "-i", str(path)]
    if speed != 1:
        command.extend(["-af", f"aresample={RATE},asetrate={round(RATE * speed)}"])
    raw = subprocess.check_output(command + ["-ar", str(RATE), "-ac", "2", "-f", "f32le", "-"])
    return np.frombuffer(raw, "<f4").reshape(-1, 2)


def write_wave(name, track, target_rms):
    rms, peak = np.sqrt(np.mean(track ** 2)), np.max(np.abs(track))
    if not 0 < rms <= peak:
        raise ValueError(f"{name} is silent or invalid")
    track *= min(target_rms / rms, 0.75 / peak)
    pcm = np.rint(track * 32767).astype("<i2")
    with wave.open(str(ROOT / "dist" / f"{name}.wav"), "wb") as out:
        out.setparams((2, 2, RATE, len(track), "NONE", "not compressed"))
        out.writeframes(pcm.tobytes())


def rain():
    field = decode(SOURCE, EXPECTED)
    if len(field) != RATE * 37:
        raise ValueError("Unexpected source loop length")

    # Four repeats of the editor's already crossfaded excerpt. Only the
    # first and last four seconds overlap to make the 128s player join clean.
    fade, length = 4 * RATE, SECONDS * RATE
    raw = np.tile(field, (4, 1))[:length + fade]
    track = raw[fade:length + fade].copy()
    angle = np.linspace(0, np.pi / 2, fade, endpoint=False)[:, None]
    track[-fade:] = raw[length:length + fade] * np.cos(angle) + raw[:fade] * np.sin(angle)
    write_wave("rain", track, 0.15)


def library():
    for name, (file, digest, seconds, overlap_seconds, trim_seconds, target, speed) in RECORDINGS.items():
        length = seconds * RATE
        field = decode(ROOT / "audio-source" / file, digest, speed)
        fade, trim = round(overlap_seconds * RATE), round(trim_seconds * RATE)
        raw = field[trim:trim + length + fade].copy()
        if len(raw) != length + fade:
            raise ValueError(f"{name} source is too short")
        raw -= np.mean(raw, axis=0)
        if name in ("ocean", "fireplace", "train", "coffee-shop"):
            # Soften loud transients while keeping the room tone and rhythmic sounds.
            ceiling = 4 * np.sqrt(np.mean(raw ** 2))
            raw = ceiling * np.tanh(raw / ceiling)
        track = raw[fade:].copy()
        angle = np.linspace(0, np.pi / 2, fade)[:, None]
        track[-fade:] = raw[length:] * np.cos(angle) + raw[:fade] * np.sin(angle)
        write_wave(name, track, target)

    frames = 32 * RATE
    frequencies = np.fft.rfftfreq(frames, 1 / RATE)
    for name, seed, target in (("brown", 635, 0.15), ("white", 53719, 0.10)):
        samples = np.random.default_rng(seed).standard_normal((frames, 2))
        spectrum = np.fft.rfft(samples, axis=0)
        response = 1 / np.sqrt(1 + (frequencies / 8_000) ** 8)
        if name == "brown":
            # The 55 Hz knee keeps very low frequencies from dominating the mix.
            response /= np.sqrt(1 + (frequencies / 55) ** 2)
        response[0] = 0
        track = np.fft.irfft(spectrum * response[:, None], n=frames, axis=0)
        write_wave(name, track, target)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--library", action="store_true", help="build the additional recordings and brown and white noise")
    if parser.parse_args().library:
        library()
    else:
        rain()
