import React, { createContext, useContext, useState, useEffect } from 'react';
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

interface AppContextType {
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
  // Clinical state
  clinicalData: ClinicalData;
  setClinicalData: React.Dispatch<React.SetStateAction<ClinicalData>>;
  clinicalResult: ClinicalAnalysisResult | null;
  runClinicalAnalysis: () => void;
  loadClinicalPreset: (key: string) => void;
  // ECG state
  selectedEcgPresetKey: string;
  ecgLead: 'Lead I' | 'Lead II' | 'V1' | 'V5';
  setEcgLead: (lead: 'Lead I' | 'Lead II' | 'V1' | 'V5') => void;
  ecgFilters: { bandpass: boolean; notch: boolean; baselineWander: boolean };
  setEcgFilters: React.Dispatch<React.SetStateAction<{ bandpass: boolean; notch: boolean; baselineWander: boolean }>>;
  ecgSignal: EcgSignalData;
  loadEcgPreset: (key: string) => void;
  handleCustomEcgUpload: (fileData: { name: string; rawPoints: number[]; hr: number; diagnosis: string }) => void;
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<PageId>('overview');

  // Clinical state
  const [clinicalData, setClinicalData] = useState<ClinicalData>(CLINICAL_PRESETS.cad_risk.data);
  const [clinicalResult, setClinicalResult] = useState<ClinicalAnalysisResult | null>(() =>
    evaluateClinicalData(CLINICAL_PRESETS.cad_risk.data)
  );

  // ECG state
  const [selectedEcgPresetKey, setSelectedEcgPresetKey] = useState<string>('anterior_stemi');
  const [ecgLead, setEcgLead] = useState<'Lead I' | 'Lead II' | 'V1' | 'V5'>('Lead II');
  const [ecgFilters, setEcgFilters] = useState({
    bandpass: true,
    notch: true,
    baselineWander: true,
  });

  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 4000);
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

  const loadClinicalPreset = (key: string) => {
    if (CLINICAL_PRESETS[key]) {
      setClinicalData(CLINICAL_PRESETS[key].data);
      const res = evaluateClinicalData(CLINICAL_PRESETS[key].data);
      setClinicalResult(res);
      showNotification(`Loaded preset: ${CLINICAL_PRESETS[key].label}`);
    }
  };

  const runClinicalAnalysis = () => {
    const res = evaluateClinicalData(clinicalData);
    setClinicalResult(res);
    showNotification('Clinical indicators validated & risk attribution model updated.');
  };

  const loadEcgPreset = (key: string) => {
    if (ECG_PRESETS[key]) {
      setSelectedEcgPresetKey(key);
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
    showNotification(`Uploaded & calibrated ${fileData.name} (${fileData.rawPoints.length} samples)`);
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
        selectedEcgPresetKey,
        ecgLead,
        setEcgLead,
        ecgFilters,
        setEcgFilters,
        ecgSignal,
        loadEcgPreset,
        handleCustomEcgUpload,
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
