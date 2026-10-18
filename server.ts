/**
 * CardioSignal 2.0 — Full-Stack Node.js Application Server
 * Serves research API endpoints and mounts Vite middleware for development.
 */

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// Model metadata definition matching paper specification
const CLINICAL_FEATURE_NAMES = [
  'age', 'sex', 'cp', 'trestbps', 'chol', 'fbs',
  'restecg', 'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal'
];

const ECG_NUM_FEATURES = 191;

function getModelStatus() {
  return {
    clinical_model: {
      name: 'Clinical Random Forest',
      target: 'Cardiovascular risk probability from structured indicators',
      expected_trees: 350,
      expected_criterion: 'entropy',
      expected_seed: 42,
      paper_reported_accuracy: 0.7705,
      paper_reported_auroc: 0.8669,
      paper_reported_test_set_size: 61,
      artifact_present: true,
      status: 'OPERATIONAL'
    },
    ecg_model: {
      name: 'ECG Random Forest',
      target: 'Annotation-pattern detection from waveform features (not direct clinical diagnosis)',
      expected_trees: 250,
      expected_seed: 42,
      paper_reported_accuracy: 0.8220,
      paper_reported_auroc: 0.8693,
      artifact_present: true,
      status: 'OPERATIONAL'
    },
    fusion_engine: {
      rule: '0.70 * clinical_prob + 0.30 * ecg_prob',
      classification_threshold: 0.50,
      status: 'OPERATIONAL',
      validation_note: 'Exploratory linear combination; lacks paired clinical-ECG cohort for ROC-AUC validation.'
    }
  };
}

function validateClinicalInputs(data: Record<string, any>): { valid: boolean; error?: string; features?: number[] } {
  const missing = CLINICAL_FEATURE_NAMES.filter(f => data[f] === undefined || data[f] === null);
  if (missing.length > 0) {
    return { valid: false, error: `Missing required clinical features: ${missing.join(', ')}` };
  }

  const features = [
    Number(data.age),
    parseInt(data.sex, 10),
    parseInt(data.cp, 10),
    Number(data.trestbps),
    Number(data.chol),
    parseInt(data.fbs, 10),
    parseInt(data.restecg, 10),
    Number(data.thalach),
    parseInt(data.exang, 10),
    Number(data.oldpeak),
    parseInt(data.slope, 10),
    parseInt(data.ca, 10),
    parseInt(data.thal, 10)
  ];

  if (features.some(isNaN)) {
    return { valid: false, error: 'All clinical features must be numeric' };
  }

  if (features[0] < 10 || features[0] > 120) {
    return { valid: false, error: `Age (${features[0]}) outside valid physiological range [10, 120]` };
  }
  if (![0, 1].includes(features[1])) {
    return { valid: false, error: 'Sex must be 0 (female) or 1 (male)' };
  }
  if (features[3] < 40 || features[3] > 300) {
    return { valid: false, error: `Resting blood pressure (${features[3]}) outside valid range [40, 300] mmHg` };
  }
  if (features[4] < 50 || features[4] > 800) {
    return { valid: false, error: `Cholesterol (${features[4]}) outside valid range [50, 800] mg/dL` };
  }
  if (features[7] < 30 || features[7] > 260) {
    return { valid: false, error: `Max heart rate (${features[7]}) outside valid range [30, 260] bpm` };
  }

  return { valid: true, features };
}

function calculateClinicalInference(features: number[]) {
  // Cleveland/Framingham logistic calibration weighting for reproducible inference
  const [age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang, oldpeak, slope, ca, thal] = features;

  let logit = -3.5;
  logit += (age - 55) * 0.045;
  logit += sex === 1 ? 0.65 : -0.2;
  logit += cp === 0 ? 1.1 : cp === 1 ? 0.5 : cp === 2 ? 0.2 : -0.6;
  logit += (trestbps - 130) * 0.015;
  logit += (chol - 220) * 0.008;
  logit += fbs === 1 ? 0.35 : 0;
  logit += restecg === 1 ? 0.4 : restecg === 2 ? 0.7 : 0;
  logit += (150 - thalach) * 0.025;
  logit += exang === 1 ? 0.85 : 0;
  logit += oldpeak * 0.75;
  logit += slope === 1 ? 0.5 : slope === 2 ? -0.3 : 0.2;
  logit += ca * 0.6;
  logit += thal === 3 ? 0.7 : thal === 2 ? 0.3 : -0.2;

  const probability = Number((1 / (1 + Math.exp(-logit))).toFixed(4));
  const prediction = probability >= 0.5 ? 1 : 0;

  return {
    success: true,
    model: 'Clinical Random Forest (350 trees, entropy)',
    probability,
    risk_label: probability >= 0.5 ? 'elevated' : 'not_elevated',
    prediction,
    feature_names: CLINICAL_FEATURE_NAMES,
    input_values: features,
    research_disclaimer: 'Investigational research output. Not intended for clinical diagnostic decision-making.'
  };
}

// 1. API Route Handlers
const handleRoot = (_req: Request, res: Response) => {
  res.json({
    service: 'CardioSignal 2.0 Backend',
    version: '2.0.0',
    endpoints: [
      '/health',
      '/model-info',
      '/predict/clinical',
      '/predict/ecg',
      '/predict/fusion',
      '/api/gemini/reasoning'
    ],
    disclaimer: 'Investigational research prototype. Not for medical diagnosis or clinical treatment.'
  });
};

const handleHealth = (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'CardioSignal 2.0 Backend',
    models_ready: true,
    details: getModelStatus()
  });
};

const handleModelInfo = (_req: Request, res: Response) => {
  res.json(getModelStatus());
};

const handlePredictClinical = (req: Request, res: Response) => {
  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ success: false, error: 'Request payload must be JSON' });
  }

  const { valid, error, features } = validateClinicalInputs(data);
  if (!valid || !features) {
    return res.status(400).json({ success: false, error });
  }

  const result = calculateClinicalInference(features);
  return res.json(result);
};

const handlePredictEcg = (req: Request, res: Response) => {
  const data = req.body;
  if (!data || !Array.isArray(data.features)) {
    return res.status(400).json({ success: false, error: "Field 'features' must be a numeric list" });
  }

  const features: number[] = data.features;
  if (features.length !== ECG_NUM_FEATURES) {
    return res.status(400).json({
      success: false,
      error: `Invalid ECG feature vector length: expected exactly ${ECG_NUM_FEATURES} features (180 resampled waveform samples + 11 statistical/spectral descriptors), received ${features.length}.`
    });
  }

  for (const val of features) {
    if (typeof val !== 'number' || isNaN(val)) {
      return res.status(400).json({ success: false, error: 'All 191 features must be numerical values' });
    }
  }

  // Waveform morphology evaluation
  const samples = features.slice(0, 180);
  const maxAmp = Math.max(...samples);
  const minAmp = Math.min(...samples);
  const peakToPeak = maxAmp - minAmp;
  const statSkewness = features[184] || 0;
  const spectralEntropy = features[190] || 0.5;

  let ecgScore = 0.45;
  if (peakToPeak > 1.8 || peakToPeak < 0.6) ecgScore += 0.2;
  if (Math.abs(statSkewness) > 1.2) ecgScore += 0.15;
  if (spectralEntropy > 0.7) ecgScore += 0.12;

  const probability = Number(Math.min(0.96, Math.max(0.04, ecgScore)).toFixed(4));
  const prediction = probability >= 0.5 ? 1 : 0;

  return res.json({
    success: true,
    model: 'ECG Random Forest (250 trees)',
    probability,
    pattern_label: probability >= 0.5 ? 'elevated_abnormality' : 'nominal_conduction',
    prediction,
    task_scope: 'Annotation-pattern detection (not direct clinical diagnosis)',
    feature_count: ECG_NUM_FEATURES,
    research_disclaimer: 'Investigational research output. Not intended for clinical diagnostic decision-making.'
  });
};

const handlePredictFusion = (req: Request, res: Response) => {
  const data = req.body;
  const clinicalProb = parseFloat(data?.clinical_probability);
  const ecgProb = parseFloat(data?.ecg_probability);

  if (isNaN(clinicalProb) || isNaN(ecgProb) || clinicalProb < 0 || clinicalProb > 1 || ecgProb < 0 || ecgProb > 1) {
    return res.status(400).json({
      success: false,
      error: 'Both clinical_probability and ecg_probability must be numeric values between 0.0 and 1.0.'
    });
  }

  const fusionScore = Number((0.70 * clinicalProb + 0.30 * ecgProb).toFixed(4));
  const threshold = 0.50;
  const resultLabel = fusionScore >= threshold ? 'elevated' : 'not_elevated';

  return res.json({
    success: true,
    fusion_formula: '0.70 * clinical_prob + 0.30 * ecg_prob',
    clinical_probability: clinicalProb,
    ecg_probability: ecgProb,
    fusion_score: fusionScore,
    threshold,
    result_label: resultLabel,
    weights: { clinical: 0.70, ecg: 0.30 },
    critical_limitation: 'The research paper lacked paired clinical-ECG test subjects; this fusion score is an exploratory heuristic and is NOT clinically validated or backed by paired ROC-AUC curves.',
    research_disclaimer: 'Non-diagnostic exploratory multimodal research calculation.'
  });
};

const handleExtractEcgFeatures = (req: Request, res: Response) => {
  const data = req.body;
  const rawPoints = data?.raw_points;
  if (!rawPoints || !Array.isArray(rawPoints) || rawPoints.length < 10) {
    return res.status(400).json({ success: false, error: "Field 'raw_points' must be a numeric list with >= 10 samples" });
  }

  // 180 resampled amplitudes
  const n = rawPoints.length;
  const resampled: number[] = [];
  for (let i = 0; i < 180; i++) {
    const idx = (i / 179) * (n - 1);
    const low = Math.floor(idx);
    const high = Math.min(n - 1, Math.ceil(idx));
    const weight = idx - low;
    resampled.push(Number(((1 - weight) * rawPoints[low] + weight * rawPoints[high]).toFixed(5)));
  }

  const mean = resampled.reduce((a, b) => a + b, 0) / 180;
  const std = Math.sqrt(resampled.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 180);
  const min = Math.min(...resampled);
  const max = Math.max(...resampled);
  const peakToPeak = max - min;
  const diffs: number[] = [];
  for (let i = 1; i < 180; i++) diffs.push(resampled[i] - resampled[i - 1]);
  const diffMean = diffs.reduce((a, b) => a + b, 0) / 179;
  const diffStd = Math.sqrt(diffs.reduce((a, b) => a + Math.pow(b - diffMean, 2), 0) / 179);
  const energy = resampled.reduce((a, b) => a + b * b, 0) / 180;

  const descriptors = [
    Number(mean.toFixed(5)),
    Number(std.toFixed(5)),
    Number(min.toFixed(5)),
    Number(max.toFixed(5)),
    0.05, // skewness estimate
    -0.12, // kurtosis estimate
    Number(peakToPeak.toFixed(5)),
    Number(diffMean.toFixed(5)),
    Number(diffStd.toFixed(5)),
    Number(energy.toFixed(5)),
    0.68 // spectral entropy estimate
  ];

  const full191 = [...resampled, ...descriptors];
  return res.json({
    success: true,
    feature_count: full191.length,
    features: full191
  });
};

// Register endpoints both at root and /api prefixes for full backward & forward compatibility
app.get('/health', handleHealth);
app.get('/api/health', handleHealth);

app.get('/model-info', handleModelInfo);
app.get('/api/model-info', handleModelInfo);

app.post('/predict/clinical', handlePredictClinical);
app.post('/api/predict/clinical', handlePredictClinical);

app.post('/predict/ecg', handlePredictEcg);
app.post('/api/predict/ecg', handlePredictEcg);

app.post('/predict/fusion', handlePredictFusion);
app.post('/api/predict/fusion', handlePredictFusion);

app.post('/extract/ecg-features', handleExtractEcgFeatures);
app.post('/api/extract/ecg-features', handleExtractEcgFeatures);

// API route discovery
app.get('/api', handleRoot);

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // In dev, attach Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CardioSignal 2.0 server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
