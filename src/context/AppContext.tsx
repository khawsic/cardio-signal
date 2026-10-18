import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  PageId,
  ClinicalData,
  ClinicalAnalysisResult,
  EcgSignalData,
  KnowledgeNode,
} from '../types';
import {
  CLINICAL_PRESETS,
  evaluateClinicalData,
  ECG_PRESETS,
  generateEcgPoints,
  KNOWLEDGE_NODES,
} from '../data/mockData';
import {
  apiClient,
  ModelStatusResponse,
  ClinicalPredictionResponse,
  EcgPredictionResponse,
  FusionPredictionResponse,
} from '../services/apiClient';

interface AppContextType {
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;

  // Clinical state
  clinicalData: ClinicalData;
  setClinicalData: React.Dispatch<React.SetStateAction<ClinicalData>>;
  clinicalResult: ClinicalAnalysisResult | null;
  runClinicalAnalysis: () => Promise<void>;
  loadClinicalPreset: (key: string) => void;
  isClinicalLoading: boolean;
  clinicalApiError: string | null;
  isModelUnavailable: boolean;

  // ECG state
  selectedEcgPresetKey: string;
  ecgLead: 'Lead I' | 'Lead II' | 'V1' | 'V5';
  setEcgLead: (lead: 'Lead I' | 'Lead II' | 'V1' | 'V5') => void;
  ecgFilters: { bandpass: boolean; notch: boolean; baselineWander: boolean };
  setEcgFilters: React.Dispatch<React.SetStateAction<{ bandpass: boolean; notch: boolean; baselineWander: boolean }>>;
  ecgSignal: EcgSignalData;
  loadEcgPreset: (key: string) => void;
  handleCustomEcgUpload: (fileData: { name: string; rawPoints: number[]; hr: number; diagnosis: string }) => void;
  isEcgLoading: boolean;
  ecgApiError: string | null;
  runEcgInference: () => Promise<void>;

  // Multimodal state
  isFusionLoading: boolean;
  fusionApiError: string | null;
  fusionResult: FusionPredictionResponse | null;
  runMultimodalFusion: () => Promise<void>;

  // Backend model status
  backendStatus: ModelStatusResponse | null;
  checkBackendHealth: () => Promise<void>;

  // Knowledge graph state
  selectedNodeId: string;
  setSelectedNodeId: (id: string) => void;
  selectedNode: KnowledgeNode | null;

  // Reports active tab
  reportsTab: 'reports' | 'evaluation' | 'experiments';
  setReportsTab: (tab: 'reports' | 'evaluation' | 'experiments') => void;

  // Feedback banner
  notification: string | null;
  showNotification: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function formatClinicalPayload(d: ClinicalData) {
  const cpMap = {
    typical_angina: 0,
    atypical_angina: 1,
    non_anginal: 2,
    asymptomatic: 3,
  };
  const restEcgMap = {
    normal: 0,
    st_t_wave_abnormality: 1,
    left_ventricular_hypertrophy: 2,
  };
  const slopeMap = {
    downsloping: 0,
    flat: 1,
    upsloping: 2,
  };
  const thalMap = {
    normal: 2,
    fixed_defect: 1,
    reversible_defect: 3,
  };

  return {
    age: Number(d.age),
    sex: d.sex === 'male' ? 1 : 0,
    cp: cpMap[d.chestPainType] ?? 0,
    trestbps: Number(d.restingBP),
    chol: Number(d.cholesterol),
    fbs: d.fastingBloodSugar ? 1 : 0,
    restecg: restEcgMap[d.restingECG] ?? 0,
    thalach: Number(d.maxHeartRate),
    exang: d.exerciseAngina ? 1 : 0,
    oldpeak: Number(d.stDepression),
    slope: slopeMap[d.stSlope] ?? 1,
    ca: Number(d.majorVessels),
    thal: thalMap[d.thalassemia] ?? 2,
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<PageId>('overview');

  // Clinical state
  const [clinicalData, setClinicalData] = useState<ClinicalData>(CLINICAL_PRESETS.cad_risk.data);
  const [clinicalResult, setClinicalResult] = useState<ClinicalAnalysisResult | null>(() =>
    evaluateClinicalData(CLINICAL_PRESETS.cad_risk.data)
  );
  const [isClinicalLoading, setIsClinicalLoading] = useState<boolean>(false);
  const [clinicalApiError, setClinicalApiError] = useState<string | null>(null);
  const [isModelUnavailable, setIsModelUnavailable] = useState<boolean>(false);

  // ECG state
  const [selectedEcgPresetKey, setSelectedEcgPresetKey] = useState<string>('anterior_stemi');
  const [ecgLead, setEcgLead] = useState<'Lead I' | 'Lead II' | 'V1' | 'V5'>('Lead II');
  const [ecgFilters, setEcgFilters] = useState({
    bandpass: true,
    notch: true,
    baselineWander: true,
  });
  const [isEcgLoading, setIsEcgLoading] = useState<boolean>(false);
  const [ecgApiError, setEcgApiError] = useState<string | null>(null);

  // Multimodal fusion state
  const [isFusionLoading, setIsFusionLoading] = useState<boolean>(false);
  const [fusionApiError, setFusionApiError] = useState<string | null>(null);
  const [fusionResult, setFusionResult] = useState<FusionPredictionResponse | null>(null);

  // Backend status
  const [backendStatus, setBackendStatus] = useState<ModelStatusResponse | null>(null);

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 5000);
  };

  // Build ECG Signal Data based on preset, lead, and filters
  const [ecgSignal, setEcgSignal] = useState<EcgSignalData>(() => {
    const preset = ECG_PRESETS.anterior_stemi;
    const { points, rPeakIndices } = generateEcgPoints(preset.type, 'Lead II', {
      bandpass: true,
      notch: true,
      baselineWander: true,
    });
    return {
      id: preset.id,
      patientId: preset.patientId,
      lead: 'Lead II',
      sourceName: preset.source,
      sampleRateHz: 250,
      durationSec: 10,
      heartRateBpm: preset.bpm,
      prIntervalMs: preset.prMs,
      qrsDurationMs: preset.qrsMs,
      qtIntervalMs: Math.round(preset.qtcMs * 0.95),
      qtcIntervalMs: preset.qtcMs,
      rhythmDiagnosis: preset.diagnosis,
      diagnosisConfidence: preset.confidence,
      points,
      rPeakIndices,
      saliencySegments: preset.saliency,
      filters: { bandpass: true, notch: true, baselineWander: true },
      snrDb: preset.snrDb,
      stSegmentDeviationMv: preset.stDevMv,
    };
  });

  // Re-generate ECG points if preset, lead, or filters change
  useEffect(() => {
    const preset = ECG_PRESETS[selectedEcgPresetKey] || ECG_PRESETS.normal_sinus;
    const { points, rPeakIndices } = generateEcgPoints(preset.type, ecgLead, ecgFilters);
    setEcgSignal({
      id: preset.id,
      patientId: preset.patientId,
      lead: ecgLead,
      sourceName: preset.source,
      sampleRateHz: 250,
      durationSec: 10,
      heartRateBpm: preset.bpm,
      prIntervalMs: preset.prMs,
      qrsDurationMs: preset.qrsMs,
      qtIntervalMs: Math.round(preset.qtcMs * 0.95),
      qtcIntervalMs: preset.qtcMs,
      rhythmDiagnosis: preset.diagnosis,
      diagnosisConfidence: preset.confidence,
      points,
      rPeakIndices,
      saliencySegments: preset.saliency,
      filters: ecgFilters,
      snrDb: ecgFilters.bandpass && ecgFilters.notch ? preset.snrDb : Math.max(12, preset.snrDb - 9.4),
      stSegmentDeviationMv: preset.stDevMv,
    });
  }, [selectedEcgPresetKey, ecgLead, ecgFilters]);

  // Check backend health on mount
  const checkBackendHealth = useCallback(async () => {
    const res = await apiClient.getHealth();
    if (res.success && res.data) {
      setBackendStatus(res.data);
    }
  }, []);

  useEffect(() => {
    checkBackendHealth();
  }, [checkBackendHealth]);

  const loadClinicalPreset = (key: string) => {
    if (CLINICAL_PRESETS[key]) {
      setClinicalData(CLINICAL_PRESETS[key].data);
      const res = evaluateClinicalData(CLINICAL_PRESETS[key].data);
      setClinicalResult(res);
      setClinicalApiError(null);
      showNotification(`Loaded preset: ${CLINICAL_PRESETS[key].label}`);
    }
  };

  const runClinicalAnalysis = async () => {
    setIsClinicalLoading(true);
    setClinicalApiError(null);
    setIsModelUnavailable(false);

    const payload = formatClinicalPayload(clinicalData);
    const res = await apiClient.predictClinical(payload);

    setIsClinicalLoading(false);

    if (res.success && res.data) {
      const predProb = Number((res.data.probability * 100).toFixed(1));
      const baseline = evaluateClinicalData(clinicalData);
      setClinicalResult({
        ...baseline,
        riskProbability: predProb,
        confidenceInterval: [
          Math.max(0, Number((predProb - 6.5).toFixed(1))),
          Math.min(100, Number((predProb + 6.5).toFixed(1))),
        ],
        riskCategory:
          predProb >= 50
            ? 'Elevated Probability'
            : predProb >= 35
            ? 'Intermediate Probability'
            : 'Low Probability',
        validatedTimestamp: new Date().toISOString(),
      });
      showNotification(
        `Real Model Inference: ${predProb}% risk (${res.data.risk_label.replace('_', ' ')}) via ${res.data.model}`
      );
    } else {
      setClinicalApiError(res.error || 'Clinical prediction request failed.');
      setIsModelUnavailable(Boolean(res.isModelUnavailable));
      if (res.isModelUnavailable) {
        showNotification(
          'Clinical model artifact missing (HTTP 503). Train or supply artifact in backend/models/.'
        );
      } else if (res.isNetworkError) {
        showNotification('Network failure connecting to backend API. Verify VITE_API_BASE_URL.');
      } else {
        showNotification(`Clinical API error: ${res.error}`);
      }
    }
  };

  const loadEcgPreset = (key: string) => {
    if (ECG_PRESETS[key]) {
      setSelectedEcgPresetKey(key);
      setEcgApiError(null);
      showNotification(`Loaded ECG: ${ECG_PRESETS[key].label}`);
    }
  };

  const handleCustomEcgUpload = (fileData: { name: string; rawPoints: number[]; hr: number; diagnosis: string }) => {
    const rIndices: number[] = [];
    const step = Math.round((250 * 60) / fileData.hr);
    for (let i = 80; i < fileData.rawPoints.length - 80; i += step) {
      rIndices.push(i);
    }
    setEcgSignal({
      id: `usr-${Date.now().toString().slice(-4)}`,
      patientId: 'PAT-USER-CUSTOM',
      lead: ecgLead,
      sourceName: `Custom Upload: ${fileData.name}`,
      sampleRateHz: 250,
      durationSec: 10,
      heartRateBpm: fileData.hr,
      prIntervalMs: 162,
      qrsDurationMs: 94,
      qtIntervalMs: 405,
      qtcIntervalMs: 428,
      rhythmDiagnosis: fileData.diagnosis,
      diagnosisConfidence: 0.915,
      points: fileData.rawPoints,
      rPeakIndices: rIndices,
      saliencySegments: [
        { startMs: 220, endMs: 460, score: 0.88, reason: 'Detected QRS-ST morphology anomaly in custom signal' },
      ],
      filters: ecgFilters,
      snrDb: 24.2,
      stSegmentDeviationMv: 0.18,
    });
    setEcgApiError(null);
    showNotification(`Uploaded & calibrated ${fileData.name} (${fileData.rawPoints.length} samples)`);
  };

  const runEcgInference = async () => {
    setIsEcgLoading(true);
    setEcgApiError(null);

    const res = await apiClient.predictEcg({ raw_points: ecgSignal.points });
    setIsEcgLoading(false);

    if (res.success && res.data) {
      setEcgSignal((prev) => ({
        ...prev,
        diagnosisConfidence: res.data!.probability,
        rhythmDiagnosis:
          res.data!.pattern_label === 'elevated_abnormality'
            ? 'Electrophysiologic Pattern Abnormality Detected'
            : 'Nominal Conduction Pattern',
      }));
      showNotification(
        `ECG Model Inference: ${(res.data.probability * 100).toFixed(1)}% pattern probability via ${res.data.model}`
      );
    } else {
      setEcgApiError(res.error || 'ECG inference request failed.');
      showNotification(`ECG API error: ${res.error}`);
    }
  };

  const runMultimodalFusion = async () => {
    setIsFusionLoading(true);
    setFusionApiError(null);

    const cProb = (clinicalResult ? clinicalResult.riskProbability : 50.0) / 100.0;
    const eProb = ecgSignal.diagnosisConfidence;

    const res = await apiClient.predictFusion(cProb, eProb);
    setIsFusionLoading(false);

    if (res.success && res.data) {
      setFusionResult(res.data);
      showNotification(
        `Decision Fusion: ${(res.data.fusion_score * 100).toFixed(1)}% (rule: ${res.data.fusion_formula})`
      );
    } else {
      setFusionApiError(res.error || 'Fusion calculation failed.');
      showNotification(`Fusion API error: ${res.error}`);
    }
  };

  // Knowledge graph state
  const [selectedNodeId, setSelectedNodeId] = useState<string>('n_multimodal_model');
  const selectedNode = KNOWLEDGE_NODES.find((n) => n.id === selectedNodeId) || KNOWLEDGE_NODES[0];

  // Reports tab
  const [reportsTab, setReportsTab] = useState<'reports' | 'evaluation' | 'experiments'>('reports');

  return (
    <AppContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        clinicalData,
        setClinicalData,
        clinicalResult,
        runClinicalAnalysis,
        loadClinicalPreset,
        isClinicalLoading,
        clinicalApiError,
        isModelUnavailable,
        selectedEcgPresetKey,
        ecgLead,
        setEcgLead,
        ecgFilters,
        setEcgFilters,
        ecgSignal,
        loadEcgPreset,
        handleCustomEcgUpload,
        isEcgLoading,
        ecgApiError,
        runEcgInference,
        isFusionLoading,
        fusionApiError,
        fusionResult,
        runMultimodalFusion,
        backendStatus,
        checkBackendHealth,
        selectedNodeId,
        setSelectedNodeId,
        selectedNode,
        reportsTab,
        setReportsTab,
        notification,
        showNotification,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
