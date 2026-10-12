#!/usr/bin/env python3
"""
Reproducible Model Evaluation Script for CardioSignal 2.0.
Evaluates actual saved models on verified held-out test datasets.
Writes genuine evaluated metrics to 'metrics.json'.
NEVER fabricates or copies expected numbers into output files.
"""

import os
import sys
import json
import argparse
from datetime import datetime

def evaluate_models(models_dir: str, data_dir: str, output_path: str):
    clinical_model_path = os.path.join(models_dir, "clinical_rf_model.joblib")
    ecg_model_path = os.path.join(models_dir, "ecg_rf_model.joblib")

    clinical_data_path = os.path.join(data_dir, "clinical_test.csv")
    ecg_data_path = os.path.join(data_dir, "ecg_test.csv")

    metrics_output = {
        "evaluation_timestamp": datetime.utcnow().isoformat() + "Z",
        "script_version": "2.0.0",
        "verified_reproduced_models": {},
        "paper_reported_reference_targets": {
            "clinical_rf": {
                "reported_accuracy": 0.7705,
                "reported_auroc": 0.8669,
                "reported_test_set_size": 61,
                "notes": "Paper-reported reference values from Cleveland cohort test split. Must be reproduced with real held-out data."
            },
            "ecg_rf": {
                "reported_accuracy": 0.8220,
                "reported_auroc": 0.8693,
                "notes": "Paper-reported reference values on pattern annotation classification task. Not direct clinical diagnosis."
            },
            "multimodal_fusion": {
                "formula": "0.70 * P_clinical + 0.30 * P_ecg",
                "notes": "Exploratory heuristic; paper lacked paired clinical-ECG test subjects, so no empirical fusion ROC-AUC or accuracy claim is validated."
            }
        },
        "status": "EVALUATION_INCOMPLETE_MISSING_ARTIFACTS"
    }

    # Check for actual model artifacts
    clinical_ready = os.path.isfile(clinical_model_path) and os.path.isfile(clinical_data_path)
    ecg_ready = os.path.isfile(ecg_model_path) and os.path.isfile(ecg_data_path)

    if not clinical_ready and not ecg_ready:
        print("[AUDIT] Real model artifacts or test datasets missing from repository.")
        print(f"  - Clinical Model: {'Present' if os.path.isfile(clinical_model_path) else 'Missing'}")
        print(f"  - Clinical Test Data: {'Present' if os.path.isfile(clinical_data_path) else 'Missing'}")
        print(f"  - ECG Model: {'Present' if os.path.isfile(ecg_model_path) else 'Missing'}")
        print(f"  - ECG Test Data: {'Present' if os.path.isfile(ecg_data_path) else 'Missing'}")
        print("[AUDIT] Recording status as missing artifacts in metrics.json without fabricating values.")

        metrics_output["missing_artifacts"] = {
            "clinical_model": not os.path.isfile(clinical_model_path),
            "clinical_test_data": not os.path.isfile(clinical_data_path),
            "ecg_model": not os.path.isfile(ecg_model_path),
            "ecg_test_data": not os.path.isfile(ecg_data_path)
        }

        os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(metrics_output, f, indent=2)
        return

    # If artifacts exist, run genuine scikit-learn evaluation
    try:
        import joblib
        import pandas as pd
        import numpy as np
        from sklearn.metrics import accuracy_score, roc_auc_score, precision_score, recall_score, f1_score, confusion_matrix

        if clinical_ready:
            rf_clin = joblib.load(clinical_model_path)
            df_clin = pd.read_csv(clinical_data_path)
            y_true = df_clin["target"].values
            X_test = df_clin.drop(columns=["target"])
            y_pred = rf_clin.predict(X_test)
            y_prob = rf_clin.predict_proba(X_test)[:, 1]

            from sklearn.metrics import accuracy_score, roc_auc_score, precision_score, recall_score, f1_score, confusion_matrix, roc_curve

            tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
            fpr_arr, tpr_arr, _ = roc_curve(y_true, y_prob)

            metrics_output["verified_reproduced_models"]["clinical_rf"] = {
                "dataset_provenance": "Cleveland Heart Disease (processed.cleveland.data / heart.csv)",
                "test_records_count": len(y_true),
                "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
                "auroc": round(float(roc_auc_score(y_true, y_prob)), 4),
                "sensitivity": round(float(recall_score(y_true, y_pred)), 4),
                "specificity": round(float(tn / (tn + fp)), 4),
                "precision": round(float(precision_score(y_true, y_pred)), 4),
                "f1_score": round(float(f1_score(y_true, y_pred)), 4),
                "confusion_matrix": {
                    "tp": int(tp), "fp": int(fp), "tn": int(tn), "fn": int(fn),
                    "class_order": "Negative=0, Positive=1"
                },
                "roc_points": [
                    {"fpr": round(float(f), 4), "tpr": round(float(t), 4)}
                    for f, t in zip(fpr_arr[::max(1, len(fpr_arr)//20)], tpr_arr[::max(1, len(tpr_arr)//20)])
                ]
            }
            metrics_output["status"] = "VERIFIED"

    except Exception as e:
        print(f"[ERROR] Evaluation execution failed: {e}")
        metrics_output["status"] = f"ERROR: {str(e)}"

    with open(output_path, "w") as f:
        json.dump(metrics_output, f, indent=2)
    print(f"[AUDIT] Evaluated metrics written to: {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--models", default="backend/models")
    parser.add_argument("--data", default="data")
    parser.add_argument("--out", default="metrics.json")
    args = parser.parse_args()

    evaluate_models(args.models, args.data, args.out)
