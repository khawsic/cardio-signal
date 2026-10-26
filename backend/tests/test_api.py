"""
Comprehensive API and validation test suite for CardioSignal 2.0 backend.
Tests endpoints, input boundaries, feature shape checks, failure modes, and fusion mathematics.
"""

import sys
import os
import json
import pytest
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import create_app
from services.inference import (
    validate_clinical_inputs,
    compute_fusion,
    CLINICAL_FEATURE_NAMES,
    ECG_NUM_FEATURES
)
from services.ecg_features import signal_features, feature_names

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_root_endpoint(client):
    res = client.get("/")
    assert res.status_code == 200
    data = res.get_json()
    assert data["service"] == "CardioSignal 2.0 Backend"
    assert "/health" in data["endpoints"]
    assert "disclaimer" in data

def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert "models_ready" in data
    assert "clinical_model" in data["details"]
    assert "ecg_model" in data["details"]
    assert "fusion_engine" in data["details"]

def test_model_info_endpoint(client):
    res = client.get("/model-info")
    assert res.status_code == 200
    data = res.get_json()
    assert data["clinical_model"]["expected_trees"] == 350
    assert data["ecg_model"]["expected_trees"] == 250
    assert data["fusion_engine"]["rule"] == "0.70 * clinical_prob + 0.30 * ecg_prob"

def test_validate_clinical_inputs_valid():
    valid_payload = {
        "age": 55, "sex": 1, "cp": 2, "trestbps": 130, "chol": 220, "fbs": 0,
        "restecg": 1, "thalach": 150, "exang": 0, "oldpeak": 1.2, "slope": 2,
        "ca": 0, "thal": 2
    }
    valid, err, features = validate_clinical_inputs(valid_payload)
    assert valid is True
    assert err is None
    assert len(features) == 13

def test_validate_clinical_inputs_missing_fields():
    incomplete = {"age": 55, "sex": 1}
    valid, err, features = validate_clinical_inputs(incomplete)
    assert valid is False
    assert "Missing required clinical features" in err

def test_validate_clinical_inputs_out_of_bounds():
    out_of_bounds = {
        "age": 160, # invalid
        "sex": 1, "cp": 2, "trestbps": 130, "chol": 220, "fbs": 0,
        "restecg": 1, "thalach": 150, "exang": 0, "oldpeak": 1.2, "slope": 2,
        "ca": 0, "thal": 2
    }
    valid, err, features = validate_clinical_inputs(out_of_bounds)
    assert valid is False
    assert "Age" in err

def test_fusion_computation_formula():
    # Exactly 0.70 * 0.60 + 0.30 * 0.40 = 0.42 + 0.12 = 0.54
    res = compute_fusion(0.60, 0.40)
    assert res["success"] is True
    assert res["fusion_score"] == 0.54
    assert res["result_label"] == "elevated"

    # Low risk: 0.70 * 0.20 + 0.30 * 0.30 = 0.14 + 0.09 = 0.23
    res_low = compute_fusion(0.20, 0.30)
    assert res_low["success"] is True
    assert res_low["fusion_score"] == 0.23
    assert res_low["result_label"] == "not_elevated"

def test_fusion_invalid_ranges():
    res = compute_fusion(1.5, 0.4)
    assert res["success"] is False
    res2 = compute_fusion(-0.1, 0.4)
    assert res2["success"] is False

def test_fusion_endpoint(client):
    res = client.post("/predict/fusion", json={"clinical_probability": 0.70, "ecg_probability": 0.50})
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    # 0.70 * 0.70 + 0.30 * 0.50 = 0.49 + 0.15 = 0.64
    assert data["fusion_score"] == 0.64
    assert data["result_label"] == "elevated"

def test_ecg_feature_extraction_canonical():
    dummy_signal = [0.1 * i for i in range(250)]
    feats = signal_features(dummy_signal)
    assert len(feats) == ECG_NUM_FEATURES
    assert len(feature_names()) == 191

def test_ecg_feature_endpoint(client):
    dummy_signal = [0.05 * (i % 20) for i in range(200)]
    res = client.post("/extract/ecg-features", json={"raw_points": dummy_signal})
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["feature_count"] == 191
    assert len(data["features"]) == 191

def test_extract_ecg_sqi_endpoint(client):
    # Simulated lead with realistic QRS-like peaks
    import numpy as np
    t = np.linspace(0, 1, 360)
    signal = np.sin(2 * np.pi * 1.2 * t) + 1.8 * np.exp(-((t - 0.5) ** 2) / 0.001)
    res = client.post("/extract/ecg-sqi", json={"raw_points": signal.tolist()})
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "sqi" in data
    assert "overall_score" in data["sqi"]
    assert "acceptable" in data["sqi"]
    assert "ksqi_kurtosis" in data["sqi"]
    assert "baseline_wander_ratio" in data["sqi"]

def test_eval_comparison_endpoint(client):
    res = client.get("/eval/comparison")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "clinical_comparison" in data
    assert "ecg_comparison" in data
    assert "investigation_findings" in data["ecg_comparison"]

def test_predict_clinical_real_model(client):
    payload = {
        "age": 63, "sex": 1, "cp": 3, "trestbps": 145, "chol": 233, "fbs": 1,
        "restecg": 0, "thalach": 150, "exang": 0, "oldpeak": 2.3, "slope": 0,
        "ca": 0, "thal": 1
    }
    res = client.post("/predict/clinical", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "probability" in data
    assert 0.0 <= data["probability"] <= 1.0
    assert data["model"] == "Clinical Random Forest (350 trees, entropy)"
    assert data["risk_label"] in ("elevated", "not_elevated")

def test_predict_ecg_real_model(client):
    dummy_signal = [0.1 * ((i % 30) - 15) for i in range(250)]
    feats = signal_features(dummy_signal).tolist()
    res = client.post("/predict/ecg", json={"features": feats})
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "probability" in data
    assert 0.0 <= data["probability"] <= 1.0
    assert data["model"] == "ECG Random Forest (250 trees)"

def test_health_503_when_model_missing(monkeypatch, client):
    import services.inference as inf
    inf._loaded_models["clinical"] = None
    monkeypatch.setattr(inf, "CLINICAL_MODEL_PATHS", ["/non/existent/path/model.joblib"])
    res = client.get("/health")
    assert res.status_code == 503
    data = res.get_json()
    assert data["status"] == "unhealthy"
    assert data["models_ready"] is False
    assert "error" in data
    assert data["details"]["clinical_model"]["status"] == "MISSING"

def test_health_503_when_model_fails_to_load(monkeypatch, client):
    import services.inference as inf
    import joblib
    inf._loaded_models["clinical"] = None
    inf._loaded_models["ecg"] = None

    def mock_load(path):
        raise ValueError("node array from the pickle has an incompatible dtype")

    monkeypatch.setattr(joblib, "load", mock_load)
    res = client.get("/health")
    assert res.status_code == 503
    data = res.get_json()
    assert data["status"] == "unhealthy"
    assert data["models_ready"] is False
    assert data["details"]["clinical_model"]["status"] == "LOAD_FAILED"
    assert "incompatible dtype" in data["details"]["clinical_model"]["load_error"]
    assert "Scikit-Learn Version Mismatch" in data["details"]["clinical_model"]["load_error"]

def test_predict_clinical_503_informative_error_when_load_fails(monkeypatch, client):
    import services.inference as inf
    import joblib
    inf._loaded_models["clinical"] = None

    def mock_load(path):
        raise ValueError("node array from the pickle has an incompatible dtype")

    monkeypatch.setattr(joblib, "load", mock_load)
    payload = {
        "age": 63, "sex": 1, "cp": 3, "trestbps": 145, "chol": 233, "fbs": 1,
        "restecg": 0, "thalach": 150, "exang": 0, "oldpeak": 2.3, "slope": 0,
        "ca": 0, "thal": 1
    }
    res = client.post("/predict/clinical", json=payload)
    assert res.status_code == 503
    data = res.get_json()
    assert data["success"] is False
    # Verifies error does NOT claim file is missing, but states it exists and cannot be loaded
    assert "exists at" in data["error"]
    assert "cannot be loaded" in data["error"]
    assert "incompatible dtype" in data["error"]

def test_model_feature_count_validation(monkeypatch, client):
    import services.inference as inf
    import joblib
    inf._loaded_models["clinical"] = None

    class MockModel:
        n_features_in_ = 99  # Wrong feature count, expected 13
        def predict_proba(self, X):
            return [[0.2, 0.8]]

    monkeypatch.setattr(joblib, "load", lambda path: MockModel())
    res = client.get("/health")
    assert res.status_code == 503
    data = res.get_json()
    assert data["models_ready"] is False
    assert "Feature count validation failed" in data["details"]["clinical_model"]["load_error"]
