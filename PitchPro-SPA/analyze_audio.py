import librosa
import numpy as np
import os

def analyze_start():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(script_dir, "audio/piano/C4.mp3")
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    print(f"Analyzing {file_path}...")
    y, sr = librosa.load(file_path, sr=None)
    
    print(f"Sample Rate: {sr}")
    print("First 20 samples:")
    print(y[:20])
    
    max_amp_first_10ms = np.max(np.abs(y[:int(sr * 0.01)]))
    print(f"Max amplitude in first 10ms: {max_amp_first_10ms:.6f}")
    
    if abs(y[0]) > 0.01:
        print("⚠️ WARNING: Waveform does not start at 0!")
    else:
        print("✅ Starts near 0.")

if __name__ == "__main__":
    analyze_start()
