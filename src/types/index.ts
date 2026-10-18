export type PageId =
  | 'overview'
  | 'clinical'
  | 'ecg'
  | 'multimodal'
  | 'knowledge'
  | 'reports';

export interface ClinicalData {
  age: number;
  sex: 'male' | 'female';
  chestPainType: 'typical_angina' | 'atypical_angina' | 'non_anginal' | 'asymptomatic';
  restingBP: number; // mmHg
  cholesterol: number; // mg/dL
  fastingBloodSugar: boolean; // > 120 mg/dL
  restingECG: 'normal' | 'st_t_wave_abnormality' | 'left_ventricular_hypertrophy';
  maxHeartRate: number; // bpm
  exerciseAngina: boolean;
  stDepression: number; // mm / ST depression induced by exercise
  stSlope: 'upsloping' | 'flat' | 'downsloping';
  majorVessels: number; // 0-3 colored by fluoroscopy
  thalassemia: 'normal' | 'fixed_defect' | 'reversible_defect';
}

export interface ShapAttribution {
  feature: string;
  label: string;
  value: string;
  shapValue: number; // positive = pushes risk higher, negative = protective
  direction: 'elevated' | 'protective';
  description: string;
}

export interface ClinicalAnalysisResult {
  riskProbability: number;
  confidenceInterval: [number, number];
  riskCategory: 'Elevated Probability' | 'Intermediate Probability' | 'Low Probability';
  shapAttributions: ShapAttribution[];
  framinghamComparison: {
    cohortMedianRisk: number;
    patientRiskPercentile: number;
  };
  zScores: {
    restingBP: number;
    cholesterol: number;
    maxHeartRate: number;
    stDepression: number;
  };
  validatedTimestamp: string;
}

export interface EcgSignalData {
  id: string;
  patientId: string;
  lead: 'Lead I' | 'Lead II' | 'V1' | 'V5';
  sourceName: string;
  sampleRateHz: number;
  durationSec: number;
  heartRateBpm: number;
  prIntervalMs: number;
  qrsDurationMs: number;
  qtIntervalMs: number;
  qtcIntervalMs: number;
  rhythmDiagnosis: string;
  diagnosisConfidence: number;
  points: number[]; // raw or filtered waveform points in mV
  rPeakIndices: number[];
  saliencySegments: Array<{
    startMs: number;
    endMs: number;
    score: number; // 0 to 1
    reason: string;
  }>;
  filters: {
    bandpass: boolean; // 0.5 - 45 Hz
    notch: boolean; // 50/60 Hz
    baselineWander: boolean;
  };
  snrDb: number;
  stSegmentDeviationMv: number;
}

export interface MultimodalFusionState {
  clinicalRisk: number;
  ecgRisk: number;
  fusedRisk: number;
  concordanceScore: number;
  validationStatus: 'Paper-Reported Exploratory Heuristic' | 'Evaluation Incomplete (Missing Paired Cohort)';
  concordanceAlignments: Array<{
    clinicalFeature: string;
    ecgSegment: string;
    weight: number;
    pathophysiology: string;
  }>;
}

export interface KnowledgeNode {
  id: string;
  label: string;
  category: 'model_output' | 'waveform_biomarker' | 'clinical_phenotype' | 'pathophysiology' | 'guideline';
  definition: string;
  evidenceGrade: 'Class I (Level A)' | 'Class IIa (Level B)' | 'Class IIb (Level B)' | 'Class III';
  citations: string[];
  provenance: string;
  x: number;
  y: number;
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  relationship: string;
  strength: number; // 0 to 1
  evidenceSource: string;
}

export interface ModelBenchmark {
  modelName: string;
  architecture: string;
  modality: 'Tabular Clinical' | '12-Lead ECG' | 'Multimodal Decision Fusion';
  auroc: number | null;
  accuracy?: number | null;
  f1Score: number | null;
  sensitivity: number | null;
  specificity: number | null;
  testSetSize: number | null;
  sourceDataset: string;
  provenanceType: 'paper_reported' | 'measured_reproduced' | 'illustrative_heuristic' | 'evaluation_incomplete';
  provenanceNotes: string;
}

export interface ExperimentRecord {
  id: string;
  runDate: string;
  architecture: string;
  datasetSplit: string;
  modality: string;
  learningRate: string;
  auroc: number | null;
  f1: number | null;
  validationLoss: number | null;
  reproducibleSeed: number;
  status: 'Paper Target' | 'Empirically Measured' | 'Evaluation Incomplete';
  provenanceCategory: 'paper_reported' | 'locally_measured' | 'unvalidated_heuristic';
  notes: string;
}
