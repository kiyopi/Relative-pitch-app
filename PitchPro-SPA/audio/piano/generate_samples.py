#!/usr/bin/env python3
"""
Generate multiple octave piano samples from C4.mp3
Uses librosa for high-quality pitch shifting

Installation:
    pip install librosa soundfile numpy

Usage:
    python generate_samples.py
"""

import librosa
import soundfile as sf
import numpy as np
import os

def pitch_shift_sample(input_file, output_file, semitones):
    """
    Pitch shift an audio file by specified semitones

    Args:
        input_file: Path to input MP3/WAV file
        output_file: Path to output MP3 file
        semitones: Number of semitones to shift (negative for down, positive for up)
    """
    print(f"Loading {input_file}...")
    # Load audio file
    y, sr = librosa.load(input_file, sr=None)

    print(f"Pitch shifting by {semitones} semitones...")
    # Pitch shift
    y_shifted = librosa.effects.pitch_shift(y, sr=sr, n_steps=semitones)

    print(f"Saving to {output_file}...")
    # Save as MP3 (requires ffmpeg)
    sf.write(output_file, y_shifted, sr, format='mp3')
    print(f"✓ Generated: {output_file}")

def main():
    """Generate C2, C3, and C5 samples from C4.mp3"""

    # Paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(script_dir, "C4.mp3")

    if not os.path.exists(input_file):
        print(f"❌ Error: {input_file} not found!")
        return

    # Define pitch shifts
    # C4 -> C2: -24 semitones (2 octaves down)
    # C4 -> C3: -12 semitones (1 octave down)
    # C4 -> C5: +12 semitones (1 octave up)
    samples = [
        ("C2.mp3", -24),  # 2 octaves down
        ("C3.mp3", -12),  # 1 octave down
        ("C5.mp3", +12),  # 1 octave up
    ]

    print("=" * 60)
    print("Piano Sample Generator")
    print("=" * 60)
    print(f"Source: {input_file}")
    print(f"Output directory: {script_dir}")
    print("=" * 60)

    for filename, semitones in samples:
        output_file = os.path.join(script_dir, filename)

        try:
            pitch_shift_sample(input_file, output_file, semitones)
        except Exception as e:
            print(f"❌ Error generating {filename}: {e}")
            continue

    print("=" * 60)
    print("✅ Sample generation complete!")
    print("=" * 60)
    print("\nGenerated files:")
    for filename, _ in samples:
        filepath = os.path.join(script_dir, filename)
        if os.path.exists(filepath):
            size_kb = os.path.getsize(filepath) / 1024
            print(f"  ✓ {filename} ({size_kb:.1f} KB)")
        else:
            print(f"  ✗ {filename} (failed)")

if __name__ == "__main__":
    main()
