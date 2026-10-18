"""
Inference service for CardioSignal 2.0.
Responsible for loading Random Forest models, validating input data,
and executing reproducible predictions.
"""

import os
import logging
from typing import Dict, Any, Tuple, Optional, List
from .ecg_features import signal_features, feature_names, ECG_NUM_WAVE_SAMPLES

logger = logging.getLogger(__name__)

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
CLINICAL_MODEL_PATHS = [
    os.path.join(MODELS_DIR, "clinical_rf_model.joblib"),
    os.path.join(MODELS_DIR, "clinical_rf_model.pkl"),
    os.path.join(MODELS_DIR, "model.pkl")
]
ECG_MODEL_PATHS = [
    os.path.join(MODELS_DIR, "ecg_rf_model.joblib"),
    os.path.join(MODELS_DIR, "ecg_rf_model.pkl"),
    os.path.join(MODELS_DIR, "ecg_model.pkl")
]

_loaded_models = {
    "clinical": None,
    "ecg": None
}

CLINICAL_FEATURE_NAMES = [
    "age", "sex", "cp", "trestbps", "chol", "fbs",
    "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal"
]

ECG_NUM_FEATURES = 191
ECG_DESCRIPTOR_NAMES = feature_names()

def _find_existing_path(paths: List[str]) -> Optional[str]:
    for p in paths:
        if os.path.isfile(p):
            return p
    return None

def get_model_status() -> Dict[str, Any]:
    """Returns the availability and metadata of model artifacts."""
    clinical_path = _find_existing_path(CLINICAL_MODEL_PATHS)
    ecg_path = _find_existing_path(ECG_MODEL_PATHS)
    clinical_exists = clinical_path is not None
    ecg_exists = ecg_path is not None

    return {
        "clinical_model": {
            "name": "Clinical Random Forest",
            "target": "Cardiovascular risk probability from structured indicators",
            "expected_trees": 350,
            "expected_criterion": "entropy",
            "expected_seed": 42,
            "paper_reported_accuracy": 0.7705,
            "paper_reported_auroc": 0.8669,
            "paper_reported_test_set_size": 61,
            "artifact_present": clinical_exists,
            "path": clinical_path,
            "status": "LOADED" if _loaded_models["clinical"] is not None else ("AVAILABLE" if clinical_exists else "MISSING")
        },
        "ecg_model": {
            "name": "ECG Random Forest",
            "target": "Annotation-pattern detection from waveform features (not direct clinical diagnosis)",
            "expected_trees": 250,
            "expected_seed": 42,
            "paper_reported_accuracy": 0.8220,
            "paper_reported_auroc": 0.8693,
            "artifact_present": ecg_exists,
            "path": ecg_path,
            "status": "LOADED" if _loaded_models["ecg"] is not None else ("AVAILABLE" if ecg_exists else "MISSING")
        },
        "fusion_engine": {
            "rule": "0.70 * clinical_prob + 0.30 * ecg_prob",
            "classification_threshold": 0.50,
            "status": "OPERATIONAL",
            "validation_note": "Exploratory linear combination; lacks paired clinical-ECG cohort for ROC-AUC validation."
        }
    }

def load_clinical_model():
    """Attempts to load the Clinical Random Forest model."""
    if _loaded_models["clinical"] is not None:
        return _loaded_models["clinical"]

    path = _find_existing_path(CLINICAL_MODEL_PATHS)
    if not path:
        return None

    try:
        import joblib
        model = joblib.load(path)
        _loaded_models["clinical"] = model
        logger.info(f"Loaded clinical model from {path}")
        return model
    except Exception as e:
        logger.error(f"Error loading clinical model: {e}")
        return None

def load_ecg_model():
    """Attempts to load the ECG Random Forest model."""
    if _loaded_models["ecg"] is not None:
        return _loaded_models["ecg"]

    path = _find_existing_path(ECG_MODEL_PATHS)
    if not path:
        return None

    try:
        import joblib
        model = joblib.load(path)
        _loaded_models["ecg"] = model
        logger.info(f"Loaded ECG model from {path}")
        return model
    except Exception as e:
        logger.error(f"Error loading ECG model: {e}")
        return None

def validate_clinical_inputs(data: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[list]]:
    """Validates raw clinical features against expected bounds and types."""
    missing = [f for f in CLINICAL_FEATURE_NAMES if f not in data]
    if missing:
        return False, f"Missing required clinical features: {', '.join(missing)}", None

    try:
        features = [
            float(data["age"]),
            int(data["sex"]),
            int(data["cp"]),
            float(data["trestbps"]),
            float(data["chol"]),
            int(data["fbs"]),
            int(data["restecg"]),
            float(data["thalach"]),
            int(data["exang"]),
            float(data["oldpeak"]),
            int(data["slope"]),
            int(data["ca"]),
            int(data["thal"])
        ]
    except (ValueError, TypeError) as e:
        return False, f"Invalid feature data type: {e}", None

    # Physiological range sanity checks
    if not (10 <= features[0] <= 120):
        return False, f"Age ({features[0]}) outside valid physiological range [10, 120]", None
    if features[1] not in (0, 1):
        return False, "Sex must be 0 (female) or 1 (male)", None
    if not (40 <= features[3] <= 300):
        return False, f"Resting blood pressure ({features[3]}) outside valid range [40, 300] mmHg", None
    if not (50 <= features[4] <= 800):
        return False, f"Cholesterol ({features[4]}) outside valid range [50, 800] mg/dL", None
    if not (30 <= features[7] <= 260):
        return False, f"Max heart rate ({features[7]}) outside valid range [30, 260] bpm", None

    return True, None, features

def predict_clinical(features: list) -> Dict[str, Any]:
    """Runs inference using the real clinical model if present."""
    model = load_clinical_model()
    if model is None:
        return {
            "success": False,
            "error": "Clinical Random Forest model artifact (clinical_rf_model.joblib) not found. Train or supply the artifact in backend/models/ to execute real model inference.",
            "status_code": 503
        }

    try:
        import pandas as pd
        X = pd.DataFrame([features], columns=CLINICAL_FEATURE_NAMES)
        proba = float(model.predict_proba(X)[0][1])
        prediction = int(model.predict(X)[0])

        return {
            "success": True,
            "model": "Clinical Random Forest (350 trees, entropy)",
            "probability": proba,
            "risk_label": "elevated" if proba >= 0.50 else "not_elevated",
            "prediction": prediction,
            "feature_names": CLINICAL_FEATURE_NAMES,
            "input_values": features,
            "research_disclaimer": "Investigational research output. Not intended for clinical diagnostic decision-making."
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Inference execution failed: {str(e)}",
            "status_code": 500
        }

def predict_ecg(features: list) -> Dict[str, Any]:
    """Runs inference using the real ECG model if present."""
    if not isinstance(features, list) or len(features) != ECG_NUM_FEATURES:
        return {
            "success": False,
            "error": f"Invalid ECG feature vector length: expected exactly {ECG_NUM_FEATURES} features (180 resampled waveform samples + 11 statistical/spectral descriptors), received {len(features) if isinstance(features, list) else 'invalid type'}.",
            "status_code": 400
        }

    try:
        numeric_features = [float(x) for x in features]
    except (ValueError, TypeError) as e:
        return {
            "success": False,
            "error": f"Invalid ECG feature element: all 191 features must be numerical values: {e}",
            "status_code": 400
        }

    model = load_ecg_model()
    if model is None:
        return {
            "success": False,
            "error": "ECG Random Forest model artifact (ecg_rf_model.joblib) not found. Train or supply the artifact in backend/models/ to execute real model inference.",
            "status_code": 503
        }

    try:
        import numpy as np
        X = np.array(numeric_features).reshape(1, -1)
        proba = float(model.predict_proba(X)[0][1])
        prediction = int(model.predict(X)[0])

        return {
            "success": True,
            "model": "ECG Random Forest (250 trees)",
            "probability": proba,
            "pattern_label": "elevated_abnormality" if proba >= 0.50 else "nominal_conduction",
            "prediction": prediction,
            "task_scope": "Annotation-pattern detection (not direct clinical diagnosis)",
            "feature_count": ECG_NUM_FEATURES,
            "research_disclaimer": "Investigational research output. Not intended for clinical diagnostic decision-making."
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Inference execution failed: {str(e)}",
            "status_code": 500
        }

def compute_fusion(clinical_prob: float, ecg_prob: float) -> Dict[str, Any]:
    """
    Computes the paper's specified linear fusion score:
    fusion_score = 0.70 * clinical_probability + 0.30 * ecg_probability
    Threshold: >= 0.50 -> elevated
    """
    if not (0.0 <= clinical_prob <= 1.0) or not (0.0 <= ecg_prob <= 1.0):
        return {
            "success": False,
            "error": "Both clinical_probability and ecg_probability must be numeric values between 0.0 and 1.0.",
            "status_code": 400
        }

    fusion_score = round(0.70 * clinical_prob + 0.30 * ecg_prob, 4)
    threshold = 0.50
    result_label = "elevated" if fusion_score >= threshold else "not_elevated"

    return {
        "success": True,
        "fusion_formula": "0.70 * clinical_prob + 0.30 * ecg_prob",
        "clinical_probability": clinical_prob,
        "ecg_probability": ecg_prob,
        "fusion_score": fusion_score,
        "threshold": threshold,
        "result_label": result_label,
        "weights": {"clinical": 0.70, "ecg": 0.30},
        "critical_limitation": "The research paper lacked paired clinical-ECG test subjects; this fusion score is an exploratory heuristic and is NOT clinically validated or backed by paired ROC-AUC curves.",
        "research_disclaimer": "Non-diagnostic exploratory multimodal research calculation."
    }
