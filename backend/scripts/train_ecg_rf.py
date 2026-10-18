#!/usr/bin/env python3
"""
CardioSignal 2.0 — Train ECG Random Forest Classifier
Paper target configuration: 250 trees, random_state 42.
Features: 191 extracted waveform descriptors (180 resampled amplitudes + 11 stats/spectral metrics).
Target: Annotation-pattern detection (normal annotated beat vs non-normal annotated beat).
"""

import os
import sys
import argparse
import json
import time
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.ecg_features import signal_features, feature_names

def train_ecg_model(data_path: str, output_model_path: str, output_metrics_path: str):
    import pandas as pd
    import numpy as np
    import joblib
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import (
        accuracy_score, precision_score, recall_score, f1_score,
        roc_auc_score, classification_report, confusion_matrix
    )

    data_file = Path(data_path)
    if not data_file.is_file():
        raise FileNotFoundError(f"Feature dataset not found at {data_path}")

    df = pd.read_csv(data_file)
    print(f"Loaded ECG dataset from {data_path}: {df.shape[0]} rows, {df.shape[1]} columns.")

    # Safe target column validation - check explicit target column names
    possible_target_cols = ["target", "label", "is_abnormal", "abnormal", "y"]
    target_col = None
    for col in possible_target_cols:
        if col in df.columns:
            target_col = col
            break

    if target_col is None:
        raise ValueError(
            f"Unsafe target column inference prevented: No explicit target column found in {list(df.columns)}. "
            f"Expected one of: {possible_target_cols}."
        )

    print(f"Validated target column: '{target_col}'")
    metadata_cols = ["record_id", "beat_type", "split", target_col]
    feature_cols = [c for c in df.columns if c not in metadata_cols]
    
    if len(feature_cols) != 191:
        print(f"Warning: Expected 191 feature columns, found {len(feature_cols)}.")

    y = df[target_col].astype(int).values
    unique_targets = set(np.unique(y))
    if not unique_targets.issubset({0, 1}):
        raise ValueError(f"Target column '{target_col}' must be binary (0 or 1), got unique values: {unique_targets}")

    # Use inter-patient record-level separation when split column is present to prevent data leakage
    if "split" in df.columns and "train" in df["split"].values and "test" in df["split"].values:
        train_mask = (df["split"] == "train")
        test_mask = (df["split"] == "test")
        X_train = df.loc[train_mask, feature_cols].values
        y_train = df.loc[train_mask, target_col].astype(int).values
        X_test = df.loc[test_mask, feature_cols].values
        y_test = df.loc[test_mask, target_col].astype(int).values
        split_strategy = "Inter-patient record separation (independent patient cohorts for train vs test)"
    else:
        X = df[feature_cols].values
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.20, stratify=y if len(unique_targets) > 1 else None, random_state=42
        )
        split_strategy = "Stratified random split (80% train, 20% test, seed 42)"

    print(f"Split strategy: {split_strategy}")
    print(f"Training 250-tree Random Forest on {len(X_train)} samples, evaluating on {len(X_test)} held-out samples...")
    start_time = time.perf_counter()
    rf = RandomForestClassifier(
        n_estimators=250,
        max_features="sqrt",
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train, y_train)
    duration = time.perf_counter() - start_time

    # Evaluate
    test_probs = rf.predict_proba(X_test)[:, 1]
    test_preds = (test_probs >= 0.50).astype(int)

    acc = float(accuracy_score(y_test, test_preds))
    prec = float(precision_score(y_test, test_preds, zero_division=0))
    rec = float(recall_score(y_test, test_preds, zero_division=0))
    f1 = float(f1_score(y_test, test_preds, zero_division=0))
    auroc = float(roc_auc_score(y_test, test_probs)) if len(unique_targets) == 2 else None

    metrics = {
        "model_name": "ECG Random Forest",
        "task": "normal beat vs non-normal annotated beat (MIT-BIH classification)",
        "training_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "hyperparameters": {
            "n_estimators": 250,
            "max_features": "sqrt",
            "min_samples_leaf": 2,
            "class_weight": "balanced",
            "random_state": 42
        },
        "feature_count": int(X_train.shape[1]),
        "feature_names": feature_names() if X_train.shape[1] == 191 else feature_cols,
        "split_strategy": split_strategy,
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "test_metrics": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "auroc": round(auroc, 4) if auroc is not None else None,
            "confusion_matrix": confusion_matrix(y_test, test_preds).tolist()
        },
        "training_seconds": round(duration, 3)
    }

    out_dir = Path(output_model_path).parent
    out_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(rf, output_model_path)
    print(f"Saved trained ECG model artifact to: {output_model_path}")

    Path(output_metrics_path).write_text(json.dumps(metrics, indent=2))
    print(f"Saved measured test metrics to: {output_metrics_path}")
    print(f"Test Accuracy: {acc:.4f}, AUROC: {auroc if auroc else 'N/A'}, F1: {f1:.4f}")

    return metrics

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train ECG Random Forest for CardioSignal 2.0")
    parser.add_argument("--data", default="data/ecg_features.csv", help="Path to ecg_features.csv")
    parser.add_argument("--out", default="backend/models/ecg_rf_model.joblib", help="Output model path")
    parser.add_argument("--metrics", default="backend/models/ecg_metrics.json", help="Output metrics path")
    args = parser.parse_args()

    train_ecg_model(args.data, args.out, args.metrics)
