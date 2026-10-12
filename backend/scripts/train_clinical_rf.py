#!/usr/bin/env python3
"""
Reproducible Training Script: Clinical Random Forest Model
Based on the paper-reported specifications:
- Model: RandomForestClassifier
- n_estimators: 350
- criterion: 'entropy'
- random_state: 42
- Dataset: Cleveland Heart Disease dataset (UCI Machine Learning Repository / Kaggle)
"""

import os
import sys
import argparse
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

FEATURE_NAMES = [
    "age", "sex", "cp", "trestbps", "chol", "fbs",
    "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal"
]

def train_clinical_model(data_path: str, output_path: str):
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
        logger.info("Please provide the Cleveland heart disease CSV (heart.csv / processed.cleveland.data).")
        sys.exit(1)

    logger.info(f"Loading clinical dataset from: {data_path}")
    df = pd.read_csv(data_path)

    # Standardize column names
    df.columns = [c.lower().strip() for c in df.columns]

    target_col = "target" if "target" in df.columns else ("num" if "num" in df.columns else None)
    if not target_col:
        logger.error("Could not identify target label column ('target' or 'num').")
        sys.exit(1)

    # Convert multiclass disease status (0-4) to binary (0 = no CAD, 1 = CAD present) if needed
    if df[target_col].max() > 1:
        df[target_col] = (df[target_col] > 0).astype(int)

    X = df[FEATURE_NAMES].copy()
    y = df[target_col].copy()

    # Drop or impute missing values (represented as '?' in UCI data)
    for col in X.columns:
        X[col] = pd.to_numeric(X[col], errors='coerce')
    X = X.fillna(X.median())

    # Reproducible train-test split (80-20 with fixed seed 42)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    logger.info(f"Train split size: {len(X_train)} records | Test split size: {len(X_test)} records")

    # Paper-reported target architecture: 350 trees, entropy criterion, seed 42
    rf = RandomForestClassifier(
        n_estimators=350,
        criterion="entropy",
        random_state=42,
        n_jobs=-1
    )

    logger.info("Training Clinical Random Forest (350 trees, entropy, seed 42)...")
    rf.fit(X_train, y_train)

    # Evaluation on held-out test split
    y_pred = rf.predict(X_test)
    y_prob = rf.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    auroc = roc_auc_score(y_test, y_prob)

    logger.info("=== HELD-OUT TEST EVALUATION ===")
    logger.info(f"Test Accuracy: {acc * 100:.2f}%")
    logger.info(f"Test ROC-AUC:  {auroc:.4f}")
    logger.info("\n" + classification_report(y_test, y_pred))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    joblib.dump(rf, output_path)
    logger.info(f"Saved trained artifact to: {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Clinical Random Forest model")
    parser.add_argument("--data", default="data/cleveland_heart.csv", help="Path to Cleveland dataset CSV")
    parser.add_argument("--out", default="backend/models/clinical_rf_model.joblib", help="Output path for joblib artifact")
    args = parser.parse_args()

    train_clinical_model(args.data, args.out)
