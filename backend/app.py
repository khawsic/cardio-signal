"""
CardioSignal 2.0 — Flask Research Backend API
Provides endpoints for model status, clinical RF prediction,
ECG RF prediction, and exploratory multimodal fusion.
"""

import os
import sys
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
        status = get_model_status()
        models_ready = (
            status["clinical_model"]["artifact_present"] and
            status["ecg_model"]["artifact_present"]
        )
        return jsonify({
            "status": "healthy",
            "service": "CardioSignal 2.0 Backend",
            "models_ready": models_ready,
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

    return app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug_mode = os.environ.get("FLASK_ENV") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
