#!/usr/bin/env python3
"""
CardioSignal 2.0 — Train Clinical Random Forest Classifier
Paper target configuration: 350 trees, entropy criterion, seed 42.
Dataset: Cleveland / Framingham structured cardiovascular risk cohort (heart.csv).
"""

import os
import sys
import argparse
import json
import time
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

CLINICAL_FEATURES = [
    "age", "sex", "cp", "trestbps", "chol", "fbs",
    "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal"
]
TARGET_COL = "target"

def train_model(data_path: str, output_model_path: str, output_metrics_path: str):
    import pandas as pd
    import numpy as np
    import joblib
    from sklearn.model_selection import train_test_split
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.metrics import (
        accuracy_score, precision_score, recall_score, f1_score,
        roc_auc_score, average_precision_score, classification_report, confusion_matrix
    )

    data_file = Path(data_path)
    if not data_file.is_file():
        raise FileNotFoundError(f"Dataset not found at {data_path}")

    df = pd.read_csv(data_file)
    print(f"Loaded raw dataset from {data_path}: {df.shape[0]} rows, {df.shape[1]} columns.")

    # 1. Strict Target Column Validation (prevent unsafe target inference)
    if TARGET_COL not in df.columns:
        raise ValueError(f"Missing required target column '{TARGET_COL}'. Columns present: {list(df.columns)}")

    # Check for missing values & duplicates
    missing_counts = df[CLINICAL_FEATURES + [TARGET_COL]].isnull().sum()
    if missing_counts.any():
        print(f"Warning: Found missing values in columns: {missing_counts[missing_counts > 0].to_dict()}. Dropping rows.")
        df = df.dropna(subset=CLINICAL_FEATURES + [TARGET_COL])

    df = df.drop_duplicates(subset=CLINICAL_FEATURES + [TARGET_COL])
    print(f"Cleaned dataset: {df.shape[0]} unique rows.")

    X = df[CLINICAL_FEATURES]
    y = df[TARGET_COL].astype(int)

    unique_targets = set(y.unique())
    if not unique_targets.issubset({0, 1}):
        raise ValueError(f"Target column must be binary (0 or 1), got unique values: {unique_targets}")

    # 2. Stratified train/test split (80% train, 20% test, seed 42)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=42
    )

    print(f"Train split: {len(X_train)} samples, Test split: {len(X_test)} samples.")

    # 3. Fit Random Forest matching paper specification (350 trees, criterion='entropy')
    start_time = time.perf_counter()
    rf = RandomForestClassifier(
        n_estimators=350,
        criterion="entropy",
        max_features="sqrt",
        min_samples_leaf=1,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train, y_train)
    training_duration = time.perf_counter() - start_time

    # 4. Evaluate on held-out test split
    test_probs = rf.predict_proba(X_test)[:, 1]
    test_preds = (test_probs >= 0.50).astype(int)

    acc = float(accuracy_score(y_test, test_preds))
    prec = float(precision_score(y_test, test_preds, zero_division=0))
    rec = float(recall_score(y_test, test_preds, zero_division=0))
    f1 = float(f1_score(y_test, test_preds, zero_division=0))
    auroc = float(roc_auc_score(y_test, test_probs))
    pr_auc = float(average_precision_score(y_test, test_probs))
    conf_mat = confusion_matrix(y_test, test_preds).tolist()
    class_rep = classification_report(y_test, test_preds, output_dict=True, zero_division=0)

    # Feature importances
    feature_importances = {
        name: float(round(imp, 5))
        for name, imp in zip(CLINICAL_FEATURES, rf.feature_importances_)
    }

    metrics = {
        "model_name": "Clinical Random Forest",
        "training_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "hyperparameters": {
            "n_estimators": 350,
            "criterion": "entropy",
            "max_features": "sqrt",
            "class_weight": "balanced",
            "random_state": 42
        },
        "dataset": {
            "source": str(data_path),
            "total_samples": int(len(df)),
            "train_samples": int(len(X_train)),
            "test_samples": int(len(X_test))
        },
        "test_metrics": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "auroc": round(auroc, 4),
            "pr_auc": round(pr_auc, 4),
            "confusion_matrix": conf_mat
        },
        "feature_importances": feature_importances,
        "training_seconds": round(training_duration, 3)
    }

    # 5. Save Model and Metrics
    out_dir = Path(output_model_path).parent
    out_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(rf, output_model_path)
    print(f"Saved trained model artifact to: {output_model_path}")

    Path(output_metrics_path).write_text(json.dumps(metrics, indent=2))
    print(f"Saved measured test metrics to: {output_metrics_path}")
    print(f"Test Accuracy: {acc:.4f}, AUROC: {auroc:.4f}, F1: {f1:.4f}")

    return metrics

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Clinical Random Forest for CardioSignal 2.0")
    parser.add_argument("--data", default="data/heart.csv", help="Path to heart.csv dataset")
    parser.add_argument("--out", default="backend/models/clinical_rf_model.joblib", help="Output path for joblib model")
    parser.add_argument("--metrics", default="backend/models/clinical_metrics.json", help="Output path for metrics JSON")
    args = parser.parse_args()

    train_model(args.data, args.out, args.metrics)
