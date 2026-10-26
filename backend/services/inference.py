"""
Inference service for CardioSignal 2.0.
Responsible for loading Random Forest models, validating input data,
checking feature count conformance, and executing reproducible predictions.
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

_model_load_errors = {
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

def _get_sklearn_runtime_version() -> str:
    try:
        import sklearn
        return getattr(sklearn, "__version__", "unknown")
    except Exception:
        return "not installed"

def load_clinical_model(force_reload: bool = False):
    """
    Attempts to load and validate the Clinical Random Forest model.
    Validates that:
    1. The artifact file exists on disk.
    2. The pickle can be unpickled by the active scikit-learn runtime.
    3. The model object implements predict_proba.
    4. The model was trained with exactly 13 features matching CLINICAL_FEATURE_NAMES.
    """
    global _loaded_models, _model_load_errors

    if not force_reload and _loaded_models["clinical"] is not None:
        return _loaded_models["clinical"]

    path = _find_existing_path(CLINICAL_MODEL_PATHS)
    if not path:
        _loaded_models["clinical"] = None
        _model_load_errors["clinical"] = "Clinical Random Forest model artifact (clinical_rf_model.joblib) not found on disk."
        return None

    try:
        import joblib
        model = joblib.load(path)
    except Exception as e:
        _loaded_models["clinical"] = None
        err_msg = str(e)
        runtime_ver = _get_sklearn_runtime_version()
        hint = ""
        if "incompatible dtype" in err_msg or "missing_go_to_left" in err_msg:
            hint = (
                f" [Scikit-Learn Version Mismatch: Artifact was serialized with scikit-learn 1.2.1, "
                f"while current environment is running scikit-learn {runtime_ver}. "
                f"Align scikit-learn dependency in requirements.txt (e.g. scikit-learn==1.2.2) or retrain the artifact with scikit-learn {runtime_ver}.]"
            )
        _model_load_errors["clinical"] = f"Failed to unpickle artifact at {path}: {err_msg}{hint}"
        logger.error(_model_load_errors["clinical"])
        return None

    # Validate model capabilities
    if not hasattr(model, "predict_proba"):
        _loaded_models["clinical"] = None
        _model_load_errors["clinical"] = f"Invalid model artifact at {path}: Object of type {type(model).__name__} does not implement predict_proba."
        logger.error(_model_load_errors["clinical"])
        return None

    # Validate feature count
    n_features = getattr(model, "n_features_in_", None)
    expected_count = len(CLINICAL_FEATURE_NAMES)
    if n_features is not None and n_features != expected_count:
        _loaded_models["clinical"] = None
        _model_load_errors["clinical"] = (
            f"Feature count validation failed: Expected {expected_count} clinical features "
            f"({', '.join(CLINICAL_FEATURE_NAMES)}), but model artifact was trained on {n_features} features."
        )
        logger.error(_model_load_errors["clinical"])
        return None

    _loaded_models["clinical"] = model
    _model_load_errors["clinical"] = None
    logger.info(f"Loaded and validated clinical model from {path} (features={n_features}, trees={len(getattr(model, 'estimators_', []))})")
    return model

def load_ecg_model(force_reload: bool = False):
    """
    Attempts to load and validate the ECG Random Forest model.
    Validates that:
    1. The artifact file exists on disk.
    2. The pickle can be unpickled by the active scikit-learn runtime.
    3. The model object implements predict_proba.
    4. The model was trained with exactly 191 features matching ECG feature descriptors.
    """
    global _loaded_models, _model_load_errors

    if not force_reload and _loaded_models["ecg"] is not None:
        return _loaded_models["ecg"]

    path = _find_existing_path(ECG_MODEL_PATHS)
    if not path:
        _loaded_models["ecg"] = None
        _model_load_errors["ecg"] = "ECG Random Forest model artifact (ecg_rf_model.joblib) not found on disk."
        return None

    try:
        import joblib
        model = joblib.load(path)
    except Exception as e:
        _loaded_models["ecg"] = None
        err_msg = str(e)
        runtime_ver = _get_sklearn_runtime_version()
        hint = ""
        if "incompatible dtype" in err_msg or "missing_go_to_left" in err_msg:
            hint = (
                f" [Scikit-Learn Version Mismatch: Artifact was serialized with scikit-learn 1.2.1, "
                f"while current environment is running scikit-learn {runtime_ver}. "
                f"Align scikit-learn dependency in requirements.txt (e.g. scikit-learn==1.2.2) or retrain the artifact with scikit-learn {runtime_ver}.]"
            )
        _model_load_errors["ecg"] = f"Failed to unpickle artifact at {path}: {err_msg}{hint}"
        logger.error(_model_load_errors["ecg"])
        return None

    # Validate model capabilities
    if not hasattr(model, "predict_proba"):
        _loaded_models["ecg"] = None
        _model_load_errors["ecg"] = f"Invalid model artifact at {path}: Object of type {type(model).__name__} does not implement predict_proba."
        logger.error(_model_load_errors["ecg"])
        return None

    # Validate feature count
    n_features = getattr(model, "n_features_in_", None)
    if n_features is not None and n_features != ECG_NUM_FEATURES:
        _loaded_models["ecg"] = None
        _model_load_errors["ecg"] = (
            f"Feature count validation failed: Expected {ECG_NUM_FEATURES} ECG features "
            f"(180 waveform points + 11 descriptors), but model artifact was trained on {n_features} features."
        )
        logger.error(_model_load_errors["ecg"])
        return None

    _loaded_models["ecg"] = model
    _model_load_errors["ecg"] = None
    logger.info(f"Loaded and validated ECG model from {path} (features={n_features}, trees={len(getattr(model, 'estimators_', []))})")
    return model

def get_model_status(attempt_load: bool = True) -> Dict[str, Any]:
    """
    Returns the availability, actual load status, and metadata of model artifacts.
    Checks whether models can be successfully loaded and validated into memory.
    """
    clinical_path = _find_existing_path(CLINICAL_MODEL_PATHS)
    ecg_path = _find_existing_path(ECG_MODEL_PATHS)
    clinical_exists = clinical_path is not None
    ecg_exists = ecg_path is not None

    if attempt_load:
        load_clinical_model()
        load_ecg_model()

    clinical_loaded = _loaded_models["clinical"] is not None
    ecg_loaded = _loaded_models["ecg"] is not None

    if clinical_loaded:
        clinical_status = "LOADED"
    elif clinical_exists:
        clinical_status = "LOAD_FAILED"
    else:
        clinical_status = "MISSING"

    if ecg_loaded:
        ecg_status = "LOADED"
    elif ecg_exists:
        ecg_status = "LOAD_FAILED"
    else:
        ecg_status = "MISSING"

    return {
        "clinical_model": {
            "name": "Clinical Random Forest",
            "target": "Cardiovascular risk probability from structured indicators",
            "expected_trees": 350,
            "expected_criterion": "entropy",
            "expected_seed": 42,
            "expected_features": len(CLINICAL_FEATURE_NAMES),
            "paper_reported_accuracy": 0.7705,
            "paper_reported_auroc": 0.8669,
            "paper_reported_test_set_size": 61,
            "artifact_present": clinical_exists,
            "loaded": clinical_loaded,
            "path": clinical_path,
            "load_error": _model_load_errors["clinical"],
            "model_features": getattr(_loaded_models["clinical"], "n_features_in_", None) if clinical_loaded else None,
            "status": clinical_status
        },
        "ecg_model": {
            "name": "ECG Random Forest",
            "target": "Annotation-pattern detection from waveform features (not direct clinical diagnosis)",
            "expected_trees": 250,
            "expected_seed": 42,
            "expected_features": ECG_NUM_FEATURES,
            "paper_reported_accuracy": 0.8220,
            "paper_reported_auroc": 0.8693,
            "artifact_present": ecg_exists,
            "loaded": ecg_loaded,
            "path": ecg_path,
            "load_error": _model_load_errors["ecg"],
            "model_features": getattr(_loaded_models["ecg"], "n_features_in_", None) if ecg_loaded else None,
            "status": ecg_status
        },
        "fusion_engine": {
            "rule": "0.70 * clinical_prob + 0.30 * ecg_prob",
            "classification_threshold": 0.50,
            "status": "OPERATIONAL",
            "validation_note": "Exploratory linear combination; lacks paired clinical-ECG cohort for ROC-AUC validation."
        },
        "environment": {
            "scikit_learn_version": _get_sklearn_runtime_version()
        }
    }

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
    """Runs inference using the real clinical model if present and loaded."""
    model = load_clinical_model()
    if model is None:
        clinical_path = _find_existing_path(CLINICAL_MODEL_PATHS)
        if not clinical_path:
            error_message = (
                "Clinical Random Forest model artifact (clinical_rf_model.joblib) not found on disk. "
                "Supply or train the artifact in backend/models/ to execute real model inference."
            )
        else:
            load_err = _model_load_errors["clinical"] or "Failed to load model artifact into memory."
            error_message = (
                f"Clinical model artifact exists at {clinical_path} but cannot be loaded: {load_err}"
            )
        return {
            "success": False,
            "error": error_message,
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
    """Runs inference using the real ECG model if present and loaded."""
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
        ecg_path = _find_existing_path(ECG_MODEL_PATHS)
        if not ecg_path:
            error_message = (
                "ECG Random Forest model artifact (ecg_rf_model.joblib) not found on disk. "
                "Supply or train the artifact in backend/models/ to execute real model inference."
            )
        else:
            load_err = _model_load_errors["ecg"] or "Failed to load model artifact into memory."
            error_message = (
                f"ECG model artifact exists at {ecg_path} but cannot be loaded: {load_err}"
            )
        return {
            "success": False,
            "error": error_message,
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
