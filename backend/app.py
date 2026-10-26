"""
CardioSignal 2.0 — Flask Research Backend API
Provides endpoints for model status, clinical RF prediction,
ECG RF prediction, and exploratory multimodal fusion.
"""

import os
import sys
import json
from flask import Flask, request, jsonify
from flask_cors import CORS

sys.path.insert(0, os.path.dirname(__file__))

from services.inference import (
    get_model_status,
    validate_clinical_inputs,
    predict_clinical,
    predict_ecg,
    compute_fusion
)
from services.ecg_features import signal_features, feature_names

def create_app():
    app = Flask(__name__)

    frontend_origins = os.environ.get("FRONTEND_ORIGIN", "*")
    if frontend_origins and frontend_origins != "*":
        origins = [o.strip() for o in frontend_origins.split(",") if o.strip()]
    else:
        origins = "*"

    CORS(app, resources={r"/*": {"origins": origins}})

    @app.route("/", methods=["GET"])
    def root():
        return jsonify({
            "service": "CardioSignal 2.0 Backend",
            "version": "2.0.0",
            "endpoints": [
                "/health",
                "/model-info",
                "/predict/clinical",
                "/predict/ecg",
                "/predict/fusion",
                "/extract/ecg-features"
            ],
            "disclaimer": "Investigational research prototype. Not for medical diagnosis or clinical treatment."
        })

    @app.route("/health", methods=["GET"])
    def health():
        status = get_model_status(attempt_load=True)
        clinical_ok = status["clinical_model"]["loaded"]
        ecg_ok = status["ecg_model"]["loaded"]
        models_ready = clinical_ok and ecg_ok

        if not models_ready:
            errors = []
            if not clinical_ok:
                errors.append(f"Clinical model: {status['clinical_model'].get('load_error') or 'Not loaded'}")
            if not ecg_ok:
                errors.append(f"ECG model: {status['ecg_model'].get('load_error') or 'Not loaded'}")
            return jsonify({
                "status": "unhealthy",
                "service": "CardioSignal 2.0 Backend",
                "models_ready": False,
                "error": "One or more required model artifacts failed to load or validate: " + "; ".join(errors),
                "details": status
            }), 503

        return jsonify({
            "status": "healthy",
            "service": "CardioSignal 2.0 Backend",
            "models_ready": True,
            "details": status
        }), 200

    @app.route("/model-info", methods=["GET"])
    def model_info():
        return jsonify(get_model_status()), 200

    @app.route("/predict/clinical", methods=["POST"])
    def endpoint_predict_clinical():
        if not request.is_json:
            return jsonify({"success": False, "error": "Request payload must be JSON"}), 400

        data = request.get_json()
        valid, err, features = validate_clinical_inputs(data)
        if not valid:
            return jsonify({"success": False, "error": err}), 400

        result = predict_clinical(features)
        if not result["success"]:
            return jsonify(result), result.get("status_code", 500)

        return jsonify(result), 200

    @app.route("/predict/ecg", methods=["POST"])
    def endpoint_predict_ecg():
        if not request.is_json:
            return jsonify({"success": False, "error": "Request payload must be JSON"}), 400

        data = request.get_json()
        features = data.get("features")
        
        # If raw points provided instead of pre-extracted 191 features, run canonical pipeline
        if not features and "raw_points" in data:
            raw_points = data["raw_points"]
            if isinstance(raw_points, list) and len(raw_points) >= 10:
                try:
                    features = signal_features(raw_points).tolist()
                except Exception as ex:
                    return jsonify({"success": False, "error": f"ECG feature extraction failed: {str(ex)}"}), 400

        if not features or not isinstance(features, list):
            return jsonify({"success": False, "error": "Field 'features' must be a 191-element numeric list or 'raw_points' must be provided"}), 400

        result = predict_ecg(features)
        if not result["success"]:
            return jsonify(result), result.get("status_code", 500)

        return jsonify(result), 200

    @app.route("/extract/ecg-features", methods=["POST"])
    def endpoint_extract_ecg_features():
        if not request.is_json:
            return jsonify({"success": False, "error": "Request payload must be JSON"}), 400

        data = request.get_json()
        raw_points = data.get("raw_points")
        if not raw_points or not isinstance(raw_points, list) or len(raw_points) < 10:
            return jsonify({"success": False, "error": "Field 'raw_points' must be a numeric list with at least 10 samples"}), 400

        try:
            feats = signal_features(raw_points)
            return jsonify({
                "success": True,
                "feature_count": len(feats),
                "feature_names": feature_names(),
                "features": feats.tolist()
            }), 200
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 400

    @app.route("/predict/fusion", methods=["POST"])
    def endpoint_predict_fusion():
        if not request.is_json:
            return jsonify({"success": False, "error": "Request payload must be JSON"}), 400

        data = request.get_json()
        try:
            clinical_prob = float(data.get("clinical_probability", -1))
            ecg_prob = float(data.get("ecg_probability", -1))
        except (ValueError, TypeError):
            return jsonify({"success": False, "error": "Probabilities must be numeric values"}), 400

        result = compute_fusion(clinical_prob, ecg_prob)
        if not result["success"]:
            return jsonify(result), result.get("status_code", 400)

        return jsonify(result), 200

    @app.route("/extract/ecg-sqi", methods=["POST"])
    def endpoint_extract_ecg_sqi():
        if not request.is_json:
            return jsonify({"success": False, "error": "Request payload must be JSON"}), 400
        data = request.get_json()
        raw_points = data.get("raw_points")
        if not raw_points or not isinstance(raw_points, list) or len(raw_points) < 10:
            return jsonify({"success": False, "error": "Field 'raw_points' must be a numeric list with at least 10 samples"}), 400
        try:
            from services.ecg_features import compute_ecg_sqi
            sqi_res = compute_ecg_sqi(raw_points)
            return jsonify({"success": True, "sqi": sqi_res}), 200
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 400

    @app.route("/eval/comparison", methods=["GET"])
    def endpoint_eval_comparison():
        models_dir = os.path.join(os.path.dirname(__file__), "models")
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

        return jsonify({
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
        }), 200

    return app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug_mode = os.environ.get("FLASK_ENV") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
