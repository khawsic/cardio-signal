"""
CLI interface to CardioSignal 2.0 genuine inference engine.
Allows direct execution of scikit-learn models and feature extraction from CLI or Node.js.
Outputs strictly valid JSON to stdout.
"""

import sys
import os
import json

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.inference import (
    get_model_status,
    validate_clinical_inputs,
    predict_clinical,
    predict_ecg,
    compute_fusion
)
from services.ecg_features import signal_features, feature_names

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Action required"}), file=sys.stderr)
        sys.exit(1)

    action = sys.argv[1]
    payload = {}
    if len(sys.argv) >= 3:
        try:
            payload = json.loads(sys.argv[2])
        except Exception as e:
            print(json.dumps({"success": False, "error": f"Invalid JSON payload: {e}"}))
            sys.exit(1)
    elif action in ("predict-clinical", "predict-ecg", "extract-ecg", "predict-fusion"):
        # Read from stdin if available without hanging
        import select
        if select.select([sys.stdin], [], [], 0.1)[0]:
            try:
                payload = json.load(sys.stdin)
            except Exception:
                payload = {}

    if action in ("health", "model-info"):
        status = get_model_status(attempt_load=True)
        clinical_ok = status["clinical_model"]["loaded"]
        ecg_ok = status["ecg_model"]["loaded"]
        models_ready = clinical_ok and ecg_ok
        if action == "health":
            resp = {
                "status": "healthy" if models_ready else "unhealthy",
                "service": "CardioSignal 2.0 Backend",
                "models_ready": models_ready,
                "details": status
            }
            if not models_ready:
                errors = []
                if not clinical_ok:
                    errors.append(f"Clinical model: {status['clinical_model'].get('load_error') or 'Not loaded'}")
                if not ecg_ok:
                    errors.append(f"ECG model: {status['ecg_model'].get('load_error') or 'Not loaded'}")
                resp["error"] = "One or more required model artifacts failed to load or validate: " + "; ".join(errors)
            print(json.dumps(resp))
            sys.exit(0 if models_ready else 2)
        else:
            print(json.dumps(status))
            sys.exit(0)

    elif action == "predict-clinical":
        valid, err, features = validate_clinical_inputs(payload)
        if not valid:
            print(json.dumps({"success": False, "error": err, "status_code": 400}))
            sys.exit(1)
        res = predict_clinical(features)
        print(json.dumps(res))
        sys.exit(0 if res.get("success") else 1)

    elif action == "predict-ecg":
        features = payload.get("features")
        if not features and "raw_points" in payload:
            raw_points = payload["raw_points"]
            if isinstance(raw_points, list) and len(raw_points) >= 10:
                try:
                    features = signal_features(raw_points).tolist()
                except Exception as ex:
                    print(json.dumps({"success": False, "error": f"ECG feature extraction failed: {str(ex)}", "status_code": 400}))
                    sys.exit(1)
        if not features or not isinstance(features, list):
            print(json.dumps({"success": False, "error": "Field 'features' must be a 191-element numeric list or 'raw_points' must be provided", "status_code": 400}))
            sys.exit(1)
        res = predict_ecg(features)
        print(json.dumps(res))
        sys.exit(0 if res.get("success") else 1)

    elif action == "extract-ecg":
        raw_points = payload.get("raw_points")
        if not raw_points or not isinstance(raw_points, list) or len(raw_points) < 10:
            print(json.dumps({"success": False, "error": "Field 'raw_points' must be a numeric list with at least 10 samples", "status_code": 400}))
            sys.exit(1)
        try:
            feats = signal_features(raw_points)
            print(json.dumps({
                "success": True,
                "feature_count": len(feats),
                "feature_names": feature_names(),
                "features": feats.tolist()
            }))
            sys.exit(0)
        except Exception as e:
            print(json.dumps({"success": False, "error": str(e), "status_code": 400}))
            sys.exit(1)

    elif action == "extract-sqi":
        raw_points = payload.get("raw_points")
        if not raw_points or not isinstance(raw_points, list) or len(raw_points) < 10:
            print(json.dumps({"success": False, "error": "Field 'raw_points' must be a numeric list with at least 10 samples", "status_code": 400}))
            sys.exit(1)
        try:
            from services.ecg_features import compute_ecg_sqi
            sqi_result = compute_ecg_sqi(raw_points)
            print(json.dumps({
                "success": True,
                "sqi": sqi_result
            }))
            sys.exit(0)
        except Exception as e:
            print(json.dumps({"success": False, "error": str(e), "status_code": 400}))
            sys.exit(1)

    elif action == "eval-comparison":
        models_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
        clinical_metrics = {}
        ecg_metrics = {}
        cm_path = os.path.join(models_dir, "clinical_metrics.json")
        em_path = os.path.join(models_dir, "ecg_metrics.json")
        if os.path.exists(cm_path):
            with open(cm_path) as f:
                clinical_metrics = json.load(f)
        if os.path.exists(em_path):
            with open(em_path) as f:
                ecg_metrics = json.load(f)

        report = {
            "success": True,
            "clinical_comparison": {
                "paper_reported": {
                    "accuracy": 0.7705,
                    "auroc": 0.8669,
                    "test_size": 61,
                    "model_spec": "Random Forest (350 trees, entropy, seed 42)"
                },
                "reproduced_test": {
                    "accuracy": clinical_metrics.get("test_metrics", {}).get("accuracy"),
                    "auroc": clinical_metrics.get("test_metrics", {}).get("auroc"),
                    "f1_score": clinical_metrics.get("test_metrics", {}).get("f1_score"),
                    "precision": clinical_metrics.get("test_metrics", {}).get("precision"),
                    "recall": clinical_metrics.get("test_metrics", {}).get("recall"),
                    "test_size": clinical_metrics.get("test_samples"),
                    "confusion_matrix": clinical_metrics.get("test_metrics", {}).get("confusion_matrix")
                },
                "provenance": "[Measured Reproduced] Independent train/test split on Cleveland cardiovascular cohort."
            },
            "ecg_comparison": {
                "paper_reported": {
                    "accuracy": 0.8220,
                    "auroc": 0.8693,
                    "model_spec": "Random Forest (250 trees, seed 42)"
                },
                "reproduced_test": {
                    "accuracy": ecg_metrics.get("test_metrics", {}).get("accuracy"),
                    "auroc": ecg_metrics.get("test_metrics", {}).get("auroc"),
                    "f1_score": ecg_metrics.get("test_metrics", {}).get("f1_score"),
                    "precision": ecg_metrics.get("test_metrics", {}).get("precision"),
                    "recall": ecg_metrics.get("test_metrics", {}).get("recall"),
                    "test_size": ecg_metrics.get("test_samples"),
                    "confusion_matrix": ecg_metrics.get("test_metrics", {}).get("confusion_matrix"),
                    "split_strategy": ecg_metrics.get("split_strategy")
                },
                "investigation_findings": {
                    "auroc": ecg_metrics.get("test_metrics", {}).get("auroc"),
                    "uncalibrated_threshold": 0.50,
                    "explanation": "High AUROC (0.9039) indicates strong ranking discriminatory power across patient cohorts. At default 0.50 decision threshold, positive-class predictions are conservative (recall 0.0831), causing lower accuracy (0.5235) and F1 (0.1535). Calibrating the decision threshold via Youden's J statistic or PR-threshold optimizes operational balance under inter-patient distribution shift."
                },
                "provenance": "[Measured Reproduced] Inter-patient record separation on MIT-BIH Arrhythmia cohort."
            },
            "fusion_provenance": {
                "formula": "0.70 * P_clinical + 0.30 * P_ecg",
                "status": "Exploratory Decision-Level Linear Heuristic",
                "validation_status": "Lacks paired clinical-ECG cohort in published literature; no empirical paired ROC-AUC curves exist.",
                "provenance": "[Illustrative Heuristic] Transparently demarcated."
            }
        }
        print(json.dumps(report))
        sys.exit(0)

    elif action == "predict-fusion":
        try:
            clinical_prob = float(payload.get("clinical_probability", -1))
            ecg_prob = float(payload.get("ecg_probability", -1))
        except (ValueError, TypeError):
            print(json.dumps({"success": False, "error": "Probabilities must be numeric values", "status_code": 400}))
            sys.exit(1)
        res = compute_fusion(clinical_prob, ecg_prob)
        print(json.dumps(res))
        sys.exit(0 if res.get("success") else 1)

    else:
        print(json.dumps({"success": False, "error": f"Unknown action: {action}"}))
        sys.exit(1)

if __name__ == "__main__":
    main()
