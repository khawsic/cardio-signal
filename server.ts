/**
 * CardioSignal 2.0 — Full-Stack Research Application Server
 * Connects directly to the genuine scikit-learn Random Forest inference engine.
 * Serves research API endpoints and mounts Vite middleware for development.
 */

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// Helper to execute Python inference CLI with PYTHONPATH pointing to backend
async function runPythonCli(action: string, payload?: any): Promise<{ stdout: string; stderr: string; code: number; data: any }> {
  const cliScript = path.resolve(__dirname, 'backend/services/inference_cli.py');
  const args = [cliScript, action];
  if (payload !== undefined) {
    args.push(JSON.stringify(payload));
  }

  try {
    const { stdout, stderr } = await execFileAsync('python3', args, {
      env: {
        ...process.env,
        PYTHONPATH: path.resolve(__dirname, 'backend')
      },
      timeout: 15000,
      maxBuffer: 10 * 1024 * 1024
    });

    let data: any = {};
    try {
      data = JSON.parse(stdout.trim());
    } catch {
      data = { raw: stdout.trim() };
    }
    return { stdout, stderr, code: 0, data };
  } catch (err: any) {
    let data: any = {};
    if (err.stdout) {
      try {
        data = JSON.parse(err.stdout.trim());
      } catch {
        data = { error: err.stdout.trim() };
      }
    } else {
      data = { error: err.message || 'Execution error' };
    }
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || err.message,
      code: err.code || 1,
      data
    };
  }
}

// 1. Root & Discovery
const handleRoot = (_req: Request, res: Response) => {
  res.json({
    service: 'CardioSignal 2.0 Research Backend',
    version: '2.0.0',
    engine: 'scikit-learn Random Forest (Genuine Model Artifacts)',
    endpoints: [
      '/health',
      '/model-info',
      '/eval/comparison',
      '/predict/clinical',
      '/predict/ecg',
      '/extract/ecg-features',
      '/extract/ecg-sqi',
      '/predict/fusion'
    ],
    disclaimer: 'Investigational research prototype. Not intended for clinical diagnostic decision-making.'
  });
};

// 2. Health Check (returns 503 if models missing or unhealthy)
const handleHealth = async (_req: Request, res: Response) => {
  // First check file presence on disk directly
  const clinicalModelPath = path.resolve(__dirname, 'backend/models/clinical_rf_model.joblib');
  const ecgModelPath = path.resolve(__dirname, 'backend/models/ecg_rf_model.joblib');
  const clinicalExists = fs.existsSync(clinicalModelPath);
  const ecgExists = fs.existsSync(ecgModelPath);

  if (!clinicalExists || !ecgExists) {
    return res.status(503).json({
      status: 'unhealthy',
      service: 'CardioSignal 2.0 Backend',
      models_ready: false,
      error: 'One or more required model artifacts (clinical_rf_model.joblib, ecg_rf_model.joblib) are missing on disk.',
      details: {
        clinical_model_present: clinicalExists,
        ecg_model_present: ecgExists
      }
    });
  }

  const { data, code } = await runPythonCli('health');
  if (code !== 0 || data.models_ready === false) {
    return res.status(503).json(data);
  }
  return res.status(200).json(data);
};

// 3. Model Information & Provenance
const handleModelInfo = async (_req: Request, res: Response) => {
  const { data, code } = await runPythonCli('model-info');
  if (code !== 0) {
    return res.status(500).json(data);
  }
  return res.json(data);
};

// 4. Test Evaluation & Paper Comparison
const handleEvalComparison = async (_req: Request, res: Response) => {
  const { data, code } = await runPythonCli('eval-comparison');
  if (code !== 0) {
    return res.status(500).json(data);
  }
  return res.json(data);
};

// 5. Predict Clinical Random Forest
const handlePredictClinical = async (req: Request, res: Response) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ success: false, error: 'Request payload must be a JSON object' });
  }

  const { data, code } = await runPythonCli('predict-clinical', payload);
  if (code !== 0 || !data.success) {
    const statusCode = data.status_code || 400;
    return res.status(statusCode).json(data);
  }
  return res.json(data);
};

// 6. Predict ECG Random Forest
const handlePredictEcg = async (req: Request, res: Response) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ success: false, error: 'Request payload must be a JSON object' });
  }

  const { data, code } = await runPythonCli('predict-ecg', payload);
  if (code !== 0 || !data.success) {
    const statusCode = data.status_code || 400;
    return res.status(statusCode).json(data);
  }
  return res.json(data);
};

// 7. Extract ECG 191 Features
const handleExtractEcgFeatures = async (req: Request, res: Response) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ success: false, error: 'Request payload must be a JSON object' });
  }

  const { data, code } = await runPythonCli('extract-ecg', payload);
  if (code !== 0 || !data.success) {
    const statusCode = data.status_code || 400;
    return res.status(statusCode).json(data);
  }
  return res.json(data);
};

// 8. Extract ECG Signal Quality Indices (SQI)
const handleExtractEcgSqi = async (req: Request, res: Response) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ success: false, error: 'Request payload must be a JSON object' });
  }

  const { data, code } = await runPythonCli('extract-sqi', payload);
  if (code !== 0 || !data.success) {
    const statusCode = data.status_code || 400;
    return res.status(statusCode).json(data);
  }
  return res.json(data);
};

// 9. Multimodal Exploratory Fusion
const handlePredictFusion = async (req: Request, res: Response) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ success: false, error: 'Request payload must be a JSON object' });
  }

  const { data, code } = await runPythonCli('predict-fusion', payload);
  if (code !== 0 || !data.success) {
    const statusCode = data.status_code || 400;
    return res.status(statusCode).json(data);
  }
  return res.json(data);
};

// Register endpoints both at root and /api prefixes for full backward & forward compatibility
app.get('/health', handleHealth);
app.get('/api/health', handleHealth);

app.get('/model-info', handleModelInfo);
app.get('/api/model-info', handleModelInfo);

app.get('/eval/comparison', handleEvalComparison);
app.get('/api/eval/comparison', handleEvalComparison);

app.post('/predict/clinical', handlePredictClinical);
app.post('/api/predict/clinical', handlePredictClinical);

app.post('/predict/ecg', handlePredictEcg);
app.post('/api/predict/ecg', handlePredictEcg);

app.post('/extract/ecg-features', handleExtractEcgFeatures);
app.post('/api/extract/ecg-features', handleExtractEcgFeatures);

app.post('/extract/ecg-sqi', handleExtractEcgSqi);
app.post('/api/extract/ecg-sqi', handleExtractEcgSqi);

app.post('/predict/fusion', handlePredictFusion);
app.post('/api/predict/fusion', handlePredictFusion);

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
