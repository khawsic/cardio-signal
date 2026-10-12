# Model Artifacts Directory

This folder is designated for trusted, serialized trained model artifacts.

## Expected Artifacts

1. **`clinical_rf_model.joblib`**
   - **Architecture**: `RandomForestClassifier` (scikit-learn)
   - **Configuration**: 350 estimators, criterion='entropy', random_state=42
   - **Expected Input Features** (in order):
     - `age` (float, years)
     - `sex` (int, 1 = male, 0 = female)
     - `cp` (int, chest pain type: 0=typical angina, 1=atypical angina, 2=non-anginal, 3=asymptomatic)
     - `trestbps` (float, resting blood pressure in mmHg)
     - `chol` (float, serum cholesterol in mg/dL)
     - `fbs` (int, fasting blood sugar > 120 mg/dL: 1=true, 0=false)
     - `restecg` (int, resting ECG: 0=normal, 1=ST-T abnormality, 2=LVH)
     - `thalach` (float, maximum heart rate achieved)
     - `exang` (int, exercise induced angina: 1=yes, 0=no)
     - `oldpeak` (float, ST depression induced by exercise relative to rest)
     - `slope` (int, slope of the peak exercise ST segment: 0=upsloping, 1=flat, 2=downsloping)
     - `ca` (int, number of major vessels colored by fluoroscopy: 0-3)
     - `thal` (int, thalassemia: 1=normal, 2=fixed defect, 3=reversible defect)
   - **Target**: Binary classification of coronary heart disease presence (0 = not elevated, 1 = elevated risk)

2. **`ecg_rf_model.joblib`**
   - **Architecture**: `RandomForestClassifier` (scikit-learn)
   - **Configuration**: 250 estimators, random_state=42
   - **Expected Input Features**: Extracted ECG morphology attributes (heart rate, PR interval, QRS duration, QT interval, ST elevation/depression deviation, R-peak amplitude).
   - **Target**: ECG pattern detection (annotation-pattern detection, NOT autonomous standalone primary diagnosis).

## Security Warning
- Only load `.joblib` or `.pkl` files originating from trusted training pipelines. Never load untrusted model files downloaded from unverified external URLs, as Python object deserialization can execute arbitrary code.
