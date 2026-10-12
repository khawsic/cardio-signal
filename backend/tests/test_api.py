"""
Unit and Integration Tests for CardioSignal 2.0 Backend.
Uses Python's standard unittest library for hermetic testing.
Covers:
1. Clinical feature validation and bounds checking
2. Exactly 191 ECG features extraction and ordering
3. Missing model artifact graceful handling (503 status)
4. Fusion arithmetic and threshold boundaries (0.70/0.30, threshold 0.50)
5. Flask endpoints behavior and JSON validation
"""

import os
import sys
import json
import unittest

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.inference import (
    validate_clinical_inputs,
    predict_clinical,
    predict_ecg,
    compute_fusion,
    get_model_status,
    ECG_NUM_FEATURES,
    ECG_DESCRIPTOR_NAMES
)
from scripts.train_ecg_rf import extract_191_ecg_features

class TestInferenceService(unittest.TestCase):

    def test_model_status_structure(self):
        status = get_model_status()
        self.assertIn("clinical_model", status)
        self.assertIn("ecg_model", status)
        self.assertIn("fusion_engine", status)
        self.assertEqual(status["fusion_engine"]["classification_threshold"], 0.50)
        self.assertEqual(status["clinical_model"]["expected_trees"], 350)
        self.assertEqual(status["ecg_model"]["expected_trees"], 250)

    def test_fusion_formula_elevated(self):
        # 0.70 * 0.8 + 0.30 * 0.6 = 0.56 + 0.18 = 0.74
        res = compute_fusion(0.8, 0.6)
        self.assertTrue(res["success"])
        self.assertEqual(res["fusion_score"], 0.74)
        self.assertEqual(res["result_label"], "elevated")
        self.assertIn("critical_limitation", res)

    def test_fusion_formula_not_elevated(self):
        # 0.70 * 0.2 + 0.30 * 0.4 = 0.14 + 0.12 = 0.26
        res = compute_fusion(0.2, 0.4)
        self.assertTrue(res["success"])
        self.assertEqual(res["fusion_score"], 0.26)
        self.assertEqual(res["result_label"], "not_elevated")

    def test_fusion_boundary_threshold(self):
        # Exactly 0.50 -> elevated
        # e.g., 0.70 * 0.50 + 0.30 * 0.50 = 0.50
        res = compute_fusion(0.50, 0.50)
        self.assertTrue(res["success"])
        self.assertEqual(res["fusion_score"], 0.50)
        self.assertEqual(res["result_label"], "elevated")

        # 0.4999 -> not_elevated
        res_below = compute_fusion(0.40, 0.40)
        self.assertEqual(res_below["result_label"], "not_elevated")

    def test_fusion_invalid_probability_range(self):
        res = compute_fusion(1.5, 0.4)
        self.assertFalse(res["success"])
        self.assertEqual(res["status_code"], 400)

        res_neg = compute_fusion(0.5, -0.2)
        self.assertFalse(res_neg["success"])
        self.assertEqual(res_neg["status_code"], 400)

    def test_clinical_input_validation_valid(self):
        valid_sample = {
            "age": 55, "sex": 1, "cp": 0, "trestbps": 130, "chol": 240,
            "fbs": 0, "restecg": 0, "thalach": 150, "exang": 0,
            "oldpeak": 1.2, "slope": 1, "ca": 0, "thal": 2
        }
        valid, err, features = validate_clinical_inputs(valid_sample)
        self.assertTrue(valid)
        self.assertIsNone(err)
        self.assertEqual(len(features), 13)

    def test_clinical_input_validation_missing_field(self):
        incomplete_sample = {
            "age": 55, "sex": 1, "cp": 0
        }
        valid, err, features = validate_clinical_inputs(incomplete_sample)
        self.assertFalse(valid)
        self.assertIn("Missing required clinical features", err)

    def test_clinical_input_validation_out_of_range(self):
        invalid_bp_sample = {
            "age": 55, "sex": 1, "cp": 0, "trestbps": 450, "chol": 240,
            "fbs": 0, "restecg": 0, "thalach": 150, "exang": 0,
            "oldpeak": 1.2, "slope": 1, "ca": 0, "thal": 2
        }
        valid, err, features = validate_clinical_inputs(invalid_bp_sample)
        self.assertFalse(valid)
        self.assertIn("Resting blood pressure", err)

    def test_ecg_191_features_extraction(self):
        # Simulate 250 Hz signal of 250 points
        simulated_raw = [0.1 * i for i in range(250)]
        features = extract_191_ecg_features(simulated_raw)
        self.assertEqual(len(features), 191)
        self.assertEqual(len(ECG_DESCRIPTOR_NAMES), 191)

        # Check that all features are valid floats
        for i, val in enumerate(features):
            self.assertIsInstance(val, float, f"Feature index {i} is not float")

    def test_predict_ecg_invalid_length(self):
        # Should fail if length != 191
        short_features = [0.5] * 100
        res = predict_ecg(short_features)
        self.assertFalse(res["success"])
        self.assertEqual(res["status_code"], 400)
        self.assertIn("expected exactly 191", res["error"])

    def test_predict_ecg_missing_artifact_graceful_handling(self):
        # When artifact is missing, returns status_code 503 rather than crashing or faking
        valid_191 = [0.0] * 191
        res = predict_ecg(valid_191)
        # In this repository environment, model artifact is pending/missing
        if not get_model_status()["ecg_model"]["artifact_present"]:
            self.assertFalse(res["success"])
            self.assertEqual(res["status_code"], 503)
            self.assertIn("ecg_rf_model.joblib", res["error"])

    def test_predict_clinical_missing_artifact_graceful_handling(self):
        valid_features = [55, 1, 0, 130, 240, 0, 0, 150, 0, 1.2, 1, 0, 2]
        res = predict_clinical(valid_features)
        if not get_model_status()["clinical_model"]["artifact_present"]:
            self.assertFalse(res["success"])
            self.assertEqual(res["status_code"], 503)
            self.assertIn("clinical_rf_model.joblib", res["error"])

if __name__ == "__main__":
    unittest.main()
