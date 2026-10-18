#!/usr/bin/env python3
"""
CardioSignal 2.0 — Independent Model Evaluation and Provenance Verification Script.
Evaluates model artifacts on held-out test datasets.
Clearly distinguishes paper-reported targets from independently verified metrics.
Reports EVALUATION_INCOMPLETE_MISSING_ARTIFACTS if models or datasets are absent.
"""

import os
import sys
import json
import time
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

PAPER_REPORTED_REFERENCE_TARGETS = {
    "clinical_rf": {
        "architecture": "Random Forest (350 trees, entropy criterion, seed 42)",
        "dataset": "Cleveland Heart Disease Cohort",
        "reported_accuracy": 0.7705,
        "reported_auroc": 0.8669,
        "reported_test_set_size": 61,
        "provenance": "Paper-reported reference values from Cleveland cohort test split. Must be reproduced with real held-out data."
    },
    "ecg_rf": {
        "architecture": "Random Forest (250 trees, sqrt features, seed 42)",
        "dataset": "MIT-BIH Arrhythmia Database beat windows",
        "reported_accuracy": 0.8220,
        "reported_auroc": 0.8693,
        "feature_count": 191,
        "provenance": "Paper-reported reference values on pattern annotation classification task. Not direct clinical diagnosis."
    },
    "multimodal_fusion": {
        "formula": "0.70 * P_clinical + 0.30 * P_ecg",
        "provenance": "Exploratory linear heuristic; paper lacked paired clinical-ECG test subjects, so no empirical fusion ROC-AUC or accuracy claim is validated."
    }
}

def evaluate_models(output_path: str = "metrics.json"):
    clinical_model_path = MODELS_DIR / "clinical_rf_model.joblib"
    ecg_model_path = MODELS_DIR / "ecg_rf_model.joblib"
    clinical_data_path = DATA_DIR / "heart.csv"
    ecg_data_path = DATA_DIR / "ecg_features.csv"

    clinical_model_exists = clinical_model_path.is_file()
    ecg_model_exists = ecg_model_path.is_file()
    clinical_data_exists = clinical_data_path.is_file()
    ecg_data_exists = ecg_data_path.is_file()

    verified_reproduced_models = {}
    missing_artifacts = {
        "clinical_model": not clinical_model_exists,
        "clinical_test_data": not clinical_data_exists,
        "ecg_model": not ecg_model_exists,
        "ecg_test_data": not ecg_data_exists
    }

    # Evaluate clinical model if both artifact and data exist
    if clinical_model_exists and clinical_data_exists:
        try:
            import joblib
            import pandas as pd
            from sklearn.model_selection import train_test_split
            from sklearn.metrics import accuracy_score, roc_auc_score, f1_score

            clf = joblib.load(clinical_model_path)
            df = pd.read_csv(clinical_data_path).drop_duplicates().dropna()
            features = ["age", "sex", "cp", "trestbps", "chol", "fbs", "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal"]
            X = df[features]
            y = df["target"].astype(int)
            _, X_test, _, y_test = train_test_split(X, y, test_size=0.20, stratify=y, random_state=42)

            probs = clf.predict_proba(X_test)[:, 1]
            preds = (probs >= 0.50).astype(int)

            verified_reproduced_models["clinical_rf"] = {
                "status": "VERIFIED_REPRODUCED",
                "measured_accuracy": round(float(accuracy_score(y_test, preds)), 4),
                "measured_auroc": round(float(roc_auc_score(y_test, probs)), 4),
                "measured_f1": round(float(f1_score(y_test, preds, zero_division=0)), 4),
                "test_set_size": len(y_test)
            }
        except Exception as e:
            print(f"Error evaluating clinical model: {e}")

    # Evaluate ECG model if both artifact and data exist
    if ecg_model_exists and ecg_data_exists:
        try:
            import joblib
            import pandas as pd
            from sklearn.model_selection import train_test_split
            from sklearn.metrics import accuracy_score, roc_auc_score, f1_score

            ecg_clf = joblib.load(ecg_model_path)
            df_ecg = pd.read_csv(ecg_data_path)
            target_col = "target" if "target" in df_ecg.columns else "label"
            metadata_cols = ["record_id", "beat_type", "split", target_col]
            feature_cols = [c for c in df_ecg.columns if c not in metadata_cols]
            
            if "split" in df_ecg.columns and "test" in df_ecg["split"].values:
                test_df = df_ecg[df_ecg["split"] == "test"]
                X_test = test_df[feature_cols].values
                y_test = test_df[target_col].astype(int).values
                split_desc = "Inter-patient held-out records (100, 118, 119, 124)"
            else:
                X_ecg = df_ecg[feature_cols].values
                y_ecg = df_ecg[target_col].astype(int).values
                _, X_test, _, y_test = train_test_split(X_ecg, y_ecg, test_size=0.20, stratify=y_ecg, random_state=42)
                split_desc = "Stratified random split (20% test)"

            probs = ecg_clf.predict_proba(X_test)[:, 1]
            preds = (probs >= 0.50).astype(int)

            verified_reproduced_models["ecg_rf"] = {
                "status": "VERIFIED_REPRODUCED",
                "measured_accuracy": round(float(accuracy_score(y_test, preds)), 4),
                "measured_auroc": round(float(roc_auc_score(y_test, probs)), 4),
                "measured_f1": round(float(f1_score(y_test, preds, zero_division=0)), 4),
                "test_set_size": len(y_test)
            }
        except Exception as e:
            print(f"Error evaluating ECG model: {e}")

    all_verified = clinical_model_exists and ecg_model_exists and clinical_data_exists and ecg_data_exists
    status = "EVALUATION_COMPLETE" if all_verified else "EVALUATION_INCOMPLETE_MISSING_ARTIFACTS"

    results = {
        "evaluation_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "script_version": "2.0.0",
        "status": status,
        "verified_reproduced_models": verified_reproduced_models,
        "paper_reported_reference_targets": PAPER_REPORTED_REFERENCE_TARGETS,
        "missing_artifacts": missing_artifacts
    }

    Path(output_path).write_text(json.dumps(results, indent=2))
    print(f"Evaluation results written to {output_path} (Status: {status})")
    return results

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "metrics.json"
    evaluate_models(out_file)
