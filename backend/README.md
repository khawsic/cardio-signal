# CardioSignal 2.0 — Python Backend API

Honest, reproducible backend service for CardioSignal 2.0.

## Overview
This backend provides:
- Clinical Random Forest validation & inference endpoint (`/predict/clinical`).
- ECG Random Forest validation & inference endpoint (`/predict/ecg`).
- Linear multimodal fusion rule execution (`/predict/fusion`).
- Model status and provenance introspection (`/model-info`, `/health`).

## Setup & Running Locally

1. **Install Dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```

2. **Run Backend Service**:
   ```bash
   python backend/app.py
   ```
   The service will listen on `http://localhost:5000`.

3. **Run Automated Tests**:
   ```bash
   python backend/tests/test_api.py
   ```

## Endpoints

### 1. `GET /health`
Returns health status and flags whether model artifacts are present.

### 2. `GET /model-info`
Returns paper-reported model configurations (Clinical RF 350 trees entropy seed 42, ECG RF 250 trees seed 42) and artifact presence.

### 3. `POST /predict/clinical`
**Payload**:
```json
{
  "age": 64,
  "sex": 1,
  "cp": 0,
  "trestbps": 148,
  "chol": 278,
  "fbs": 1,
  "restecg": 1,
  "thalach": 132,
  "exang": 1,
  "oldpeak": 2.4,
  "slope": 1,
  "ca": 2,
  "thal": 3
}
```
If `backend/models/clinical_rf_model.joblib` is present, returns real prediction & probability. If missing, returns 503 explaining that the model artifact must be supplied.

### 4. `POST /predict/fusion`
**Payload**:
```json
{
  "clinical_probability": 0.74,
  "ecg_probability": 0.82
}
```
**Response**:
```json
{
  "success": true,
  "fusion_formula": "0.70 * clinical_prob + 0.30 * ecg_prob",
  "clinical_probability": 0.74,
  "ecg_probability": 0.82,
  "fusion_score": 0.764,
  "threshold": 0.5,
  "result_label": "elevated",
  "critical_limitation": "The research paper lacked paired clinical-ECG test subjects; this fusion score is an exploratory heuristic and is NOT clinically validated or backed by paired ROC-AUC curves.",
  "research_disclaimer": "Non-diagnostic exploratory multimodal research calculation."
}
```

## Reproducible Scripts
- `python backend/scripts/train_clinical_rf.py --data data/heart.csv --out backend/models/clinical_rf_model.joblib`: Trains the 350-tree Random Forest on Cleveland data.
- `python backend/scripts/train_ecg_rf.py --data data/ecg_features.csv --out backend/models/ecg_rf_model.joblib`: Trains the 250-tree ECG Random Forest (191 features).
- `python backend/scripts/evaluate_models.py --out metrics.json`: Evaluates saved models on held-out test splits and records measured results into `metrics.json`.

## Production Deployment (Render / Railway)

1. **Deploy Repository as Web Service**:
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `gunicorn --chdir backend app:app --bind 0.0.0.0:$PORT`
   - **Root Directory**: `.` (Procfile points directly to `backend.app:app`)

2. **Supply Real Model Artifacts**:
   - Authorized researchers can place `clinical_rf_model.joblib` and `ecg_rf_model.joblib` in `backend/models/`.
   - The backend detects artifact presence via `GET /health` and loads them on first inference request.

3. **Configure Frontend**:
   - In your frontend hosting platform (e.g., Vercel), add the environment variable:
     `VITE_API_BASE_URL="https://your-backend-service.onrender.com"`
   - The frontend API client automatically connects to the deployed backend for health and predictions.
