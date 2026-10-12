#!/usr/bin/env python3
"""
Reproducible Training Script: ECG Random Forest Model
Based on paper-reported specifications:
- Model: RandomForestClassifier
- n_estimators: 250
- random_state: 42
- Task: Annotation-pattern detection from extracted waveform morphometry (NOT standalone primary diagnosis)
"""

import os
import sys
import argparse
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

FEATURE_COUNT = 191

def extract_191_ecg_features(waveform_window, sample_rate_hz=250):
    """
    Extracts deterministic 191 ECG features:
    - 180 resampled waveform samples
    - 11 statistical, derivative, and spectral descriptors
    Pure-Python capable to run hermetically across test environments.
    """
    import math

    raw = [float(x) for x in waveform_window]
    n_in = len(raw)

    # 1. Linear interpolation to exactly 180 points
    if n_in == 180:
        resampled = list(raw)
    elif n_in == 0:
        resampled = [0.0] * 180
    else:
        resampled = []
        for i in range(180):
            orig_idx = (i / 179.0) * (n_in - 1)
            lower = int(math.floor(orig_idx))
            upper = min(n_in - 1, int(math.ceil(orig_idx)))
            frac = orig_idx - lower
            val = (1.0 - frac) * raw[lower] + frac * raw[upper]
            resampled.append(float(val))

    # 2. Extract 11 paper-defined descriptors
    mean_val = sum(resampled) / 180.0
    var_val = sum((x - mean_val) ** 2 for x in resampled) / 180.0
    std_val = math.sqrt(var_val)
    min_val = min(resampled)
    max_val = max(resampled)
    ptp_val = max_val - min_val

    # Skewness and kurtosis
    eps = 1e-8
    m3 = sum((x - mean_val) ** 3 for x in resampled) / 180.0
    m4 = sum((x - mean_val) ** 4 for x in resampled) / 180.0
    skew_val = m3 / ((std_val ** 3) + eps)
    kurt_val = (m4 / ((std_val ** 4) + eps)) - 3.0

    # First difference (derivatives)
    diffs = [resampled[i+1] - resampled[i] for i in range(179)]
    mean_diff = sum(diffs) / 179.0
    var_diff = sum((d - mean_diff) ** 2 for d in diffs) / 179.0
    std_diff = math.sqrt(var_diff)

    # Spectral descriptors via discrete Fourier components approximation
    # Sum of squared amplitudes
    fft_amps = []
    n_freqs = 32
    for k in range(n_freqs):
        re = sum(resampled[t] * math.cos(2.0 * math.pi * k * t / 180.0) for t in range(180))
        im = sum(resampled[t] * math.sin(2.0 * math.pi * k * t / 180.0) for t in range(180))
        fft_amps.append(math.sqrt(re**2 + im**2))

    energy = sum(a**2 for a in fft_amps) / float(n_freqs)
    total_amp = sum(fft_amps) + eps
    psd_norm = [a / total_amp for a in fft_amps]
    entropy = -sum(p * math.log2(p + eps) for p in psd_norm if p > 0)

    descriptors = [
        mean_val, std_val, min_val, max_val, skew_val,
        kurt_val, ptp_val, mean_diff, std_diff, energy, entropy
    ]

    features = resampled + descriptors
    assert len(features) == FEATURE_COUNT, f"Extracted {len(features)} != {FEATURE_COUNT}"
    return features

def train_ecg_model(data_path: str, output_path: str):
    try:
        import pandas as pd
        import numpy as np
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import accuracy_score, roc_auc_score, classification_report
        import joblib
    except ImportError as e:
        logger.error(f"Missing required packages: {e}. Install via 'pip install -r backend/requirements.txt'")
        sys.exit(1)

    if not os.path.exists(data_path):
        logger.error(f"Dataset file not found at: {data_path}")
        logger.info("Please provide the extracted ECG feature CSV.")
        sys.exit(1)

    df = pd.read_csv(data_path)
    target_col = "label" if "label" in df.columns else ("target" if "target" in df.columns else df.columns[-1])

    X = df.drop(columns=[target_col])
    y = df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    logger.info(f"Training ECG Random Forest (250 trees, seed 42) on {len(X_train)} samples...")
    rf = RandomForestClassifier(
        n_estimators=250,
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train, y_train)

    y_pred = rf.predict(X_test)
    y_prob = rf.predict_proba(X_test)[:, 1] if hasattr(rf, "predict_proba") else None

    acc = accuracy_score(y_test, y_pred)
    logger.info(f"Test Accuracy: {acc * 100:.2f}%")
    if y_prob is not None:
        auroc = roc_auc_score(y_test, y_prob)
        logger.info(f"Test ROC-AUC:  {auroc:.4f}")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    joblib.dump(rf, output_path)
    logger.info(f"Saved trained artifact to: {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train ECG Random Forest model")
    parser.add_argument("--data", default="data/ecg_features.csv", help="Path to ECG features CSV")
    parser.add_argument("--out", default="backend/models/ecg_rf_model.joblib", help="Output path for joblib artifact")
    args = parser.parse_args()

    train_ecg_model(args.data, args.out)
