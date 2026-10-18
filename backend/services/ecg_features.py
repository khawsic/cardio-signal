"""
Canonical 191-feature ECG signal extraction module.
Paper specification:
- 180 resampled waveform amplitude values (0-179)
- 11 statistical, derivative, and spectral descriptors (180-190):
  [stat_mean, stat_std, stat_min, stat_max, stat_skewness,
   stat_kurtosis, stat_peak_to_peak, deriv_mean_diff, deriv_std_diff,
   spectral_energy, spectral_entropy]
"""

import numpy as np

ECG_NUM_WAVE_SAMPLES = 180
ECG_DESCRIPTOR_NAMES = [
    "stat_mean", "stat_std", "stat_min", "stat_max", "stat_skewness",
    "stat_kurtosis", "stat_peak_to_peak", "deriv_mean_diff", "deriv_std_diff",
    "spectral_energy", "spectral_entropy"
]

def feature_names() -> list:
    """Returns the ordered list of 191 feature names."""
    wave_names = [f"wave_sample_{i}" for i in range(ECG_NUM_WAVE_SAMPLES)]
    return wave_names + ECG_DESCRIPTOR_NAMES

def signal_features(window_signal) -> np.ndarray:
    """
    Extracts the exact 191-dimensional feature vector from an ECG waveform segment.
    
    Parameters:
        window_signal: 1D array-like sequence of voltage amplitudes.
        
    Returns:
        1D numpy array of shape (191,) with float64 values.
    """
    arr = np.asarray(window_signal, dtype=np.float64)
    if arr.ndim != 1 or len(arr) < 10:
        raise ValueError(f"Signal window must be a 1D array with at least 10 samples, got shape {arr.shape}")
        
    # Handle NaN or Inf values
    if not np.all(np.isfinite(arr)):
        arr = np.nan_to_num(arr, nan=0.0, posinf=1.0, neginf=-1.0)

    # 1. Resample waveform segment to exactly 180 points using linear interpolation
    orig_indices = np.linspace(0, 1, len(arr))
    target_indices = np.linspace(0, 1, ECG_NUM_WAVE_SAMPLES)
    resampled_wave = np.interp(target_indices, orig_indices, arr)

    # 2. Extract 11 statistical and morphological descriptors from the resampled segment
    mean_val = float(np.mean(resampled_wave))
    std_val = float(np.std(resampled_wave))
    min_val = float(np.min(resampled_wave))
    max_val = float(np.max(resampled_wave))
    peak_to_peak = float(max_val - min_val)

    # Third standardized moment (skewness)
    if std_val > 1e-8:
        skewness = float(np.mean(((resampled_wave - mean_val) / std_val) ** 3))
        kurtosis = float(np.mean(((resampled_wave - mean_val) / std_val) ** 4) - 3.0)
    else:
        skewness = 0.0
        kurtosis = 0.0

    # 1st-order temporal differences
    diffs = np.diff(resampled_wave)
    deriv_mean = float(np.mean(diffs)) if len(diffs) > 0 else 0.0
    deriv_std = float(np.std(diffs)) if len(diffs) > 0 else 0.0

    # Spectral descriptors via normalized FFT power distribution
    fft_vals = np.abs(np.fft.rfft(resampled_wave))
    power = fft_vals ** 2
    total_power = float(np.sum(power))
    spectral_energy = total_power / len(power) if len(power) > 0 else 0.0

    if total_power > 1e-12:
        norm_power = power / total_power
        # Filter zero elements for entropy calculation
        non_zero = norm_power[norm_power > 0]
        spectral_entropy = float(-np.sum(non_zero * np.log2(non_zero)))
    else:
        spectral_entropy = 0.0

    descriptors = np.array([
        mean_val, std_val, min_val, max_val, skewness,
        kurtosis, peak_to_peak, deriv_mean, deriv_std,
        spectral_energy, spectral_entropy
    ], dtype=np.float64)

    full_vector = np.concatenate([resampled_wave, descriptors])
    assert len(full_vector) == 191, f"Expected 191 features, got {len(full_vector)}"
    return full_vector
