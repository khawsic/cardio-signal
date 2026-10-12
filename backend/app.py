"""
CardioSignal 2.0 — Flask Research Backend API
Provides endpoints for model status, clinical RF prediction,
ECG RF prediction, and exploratory multimodal fusion.
"""

import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(__file__))

from services.inference import (
    get_model_status,
    validate_clinical_inputs,
    predict_clinical,
    predict_ecg,
    compute_fusion
)

app = Flask(__name__)

# Configure CORS with optional FRONTEND_ORIGIN environment variable (e.g. https://cardio-signal.vercel.app)
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
            "/predict/fusion"
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
    """Returns technical metadata for paper models and current availability."""
    return jsonify(get_model_status()), 200

@app.route("/predict/clinical", methods=["POST"])
def endpoint_predict_clinical():
    """
    Runs Clinical Random Forest inference.
    Expects JSON containing Cleveland/Framingham indicator features.
    """
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
    """
    Runs ECG Random Forest inference.
    Expects extracted waveform feature vector.
    """
    if not request.is_json:
        return jsonify({"success": False, "error": "Request payload must be JSON"}), 400

    data = request.get_json()
    features = data.get("features")
    if not features or not isinstance(features, list):
        return jsonify({"success": False, "error": "Field 'features' must be a numeric list"}), 400

    result = predict_ecg(features)
    if not result["success"]:
        return jsonify(result), result.get("status_code", 500)

    return jsonify(result), 200

@app.route("/predict/fusion", methods=["POST"])
def endpoint_predict_fusion():
    """
    Computes the paper's linear fusion rule:
    fusion_score = 0.70 * clinical_prob + 0.30 * ecg_prob
    """
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

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
