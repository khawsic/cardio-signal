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

def compute_ecg_sqi(window_signal, sampling_rate: float = 360.0) -> dict:
    """
    Computes ECG Signal Quality Indices (SQI) for physiological reliability filtering:
    - kSQI: Kurtosis-based SQI (QRS complexes exhibit high peakedness)
    - sSQI: Skewness-based SQI
    - basSQI: Baseline wander ratio (power < 1 Hz / total power)
    - hfSQI: High-frequency muscle noise ratio (power > 40 Hz / total power)
    - clipSQI: Proportion of saturated/clipped samples
    - overall_score: 0.0 to 1.0 composite signal quality index
    - acceptable: Boolean flag indicating if signal meets quality threshold for diagnostic inference
    """
    arr = np.asarray(window_signal, dtype=np.float64)
    if arr.ndim != 1 or len(arr) < 10:
        return {
            "acceptable": False,
            "overall_score": 0.0,
            "reason": "Signal too short (less than 10 samples)"
        }
    if not np.all(np.isfinite(arr)):
        arr = np.nan_to_num(arr, nan=0.0, posinf=1.0, neginf=-1.0)

    n = len(arr)
    std_val = float(np.std(arr))
    mean_val = float(np.mean(arr))
    
    if std_val < 1e-6:
        return {
            "acceptable": False,
            "overall_score": 0.0,
            "ksqi_kurtosis": 0.0,
            "ssqi_skewness": 0.0,
            "baseline_wander_ratio": 1.0,
            "high_frequency_noise_ratio": 0.0,
            "clipping_ratio": 1.0,
            "snr_db": -99.0,
            "recommendations": ["Reject: Flatline or dead lead detected."]
        }

    # Kurtosis & Skewness
    z = (arr - mean_val) / std_val
    kurtosis_val = float(np.mean(z ** 4) - 3.0)
    skewness_val = float(np.mean(z ** 3))

    # Clipping detection
    max_val = np.max(arr)
    min_val = np.min(arr)
    span = max_val - min_val
    clip_thresh = 0.01 * span
    clipped = np.sum((arr >= max_val - clip_thresh) | (arr <= min_val + clip_thresh))
    clip_ratio = float(clipped / n)

    # FFT frequency analysis
    fft_vals = np.abs(np.fft.rfft(arr))
    freqs = np.fft.rfftfreq(n, d=1.0 / sampling_rate)
    power = fft_vals ** 2
    total_power = float(np.sum(power)) + 1e-12

    # Baseline wander power (< 1 Hz)
    bas_power = float(np.sum(power[freqs < 1.0]))
    bas_sqi = bas_power / total_power

    # High frequency noise (> 40 Hz)
    hf_power = float(np.sum(power[freqs > 40.0]))
    hf_sqi = hf_power / total_power

    # QRS band power (5 - 20 Hz)
    qrs_power = float(np.sum(power[(freqs >= 5.0) & (freqs <= 20.0)]))

    # SNR estimate
    noise_power = total_power - qrs_power
    snr_db = float(10.0 * np.log10(max(1e-6, qrs_power / max(1e-6, noise_power))))

    # Quality scoring
    k_score = 1.0 if (3.0 <= kurtosis_val <= 30.0) else (0.5 if kurtosis_val > 0 else 0.1)
    bas_score = max(0.0, 1.0 - bas_sqi * 2.0)
    hf_score = max(0.0, 1.0 - hf_sqi * 3.0)
    clip_score = max(0.0, 1.0 - clip_ratio * 4.0)

    overall_score = float(np.clip(
        0.30 * k_score + 0.30 * bas_score + 0.25 * hf_score + 0.15 * clip_score,
        0.0, 1.0
    ))
    is_acceptable = bool(overall_score >= 0.55 and clip_ratio < 0.25 and bas_sqi < 0.60)

    recommendations = []
    if clip_ratio > 0.15:
        recommendations.append("High amplitude clipping detected; check amplifier gain.")
    if bas_sqi > 0.40:
        recommendations.append("Significant baseline wander detected; check patient respiration or electrode contact.")
    if hf_sqi > 0.35:
        recommendations.append("Excessive high-frequency interference detected; check for EMG muscle artifact or electrical noise.")
    if is_acceptable:
        recommendations.append("Signal meets physiological criteria for machine learning feature extraction.")

    return {
        "acceptable": is_acceptable,
        "overall_score": round(overall_score, 4),
        "ksqi_kurtosis": round(kurtosis_val, 4),
        "ssqi_skewness": round(skewness_val, 4),
        "baseline_wander_ratio": round(bas_sqi, 4),
        "high_frequency_noise_ratio": round(hf_sqi, 4),
        "clipping_ratio": round(clip_ratio, 4),
        "snr_db": round(snr_db, 2),
        "recommendations": recommendations
    }
