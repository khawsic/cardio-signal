/**
 * CardioSignal 2.0 — Shared API Client
 * Connects frontend workflows to the Flask/Node research backend.
 * Uses VITE_API_BASE_URL environment variable.
 * Explicitly surfaces model availability (503), validation errors (400),
 * network failures, and real inference payloads without silent fallback to mock data.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  isModelUnavailable?: boolean;
  isNetworkError?: boolean;
}

export interface ModelStatusResponse {
  status: string;
  service: string;
  models_ready: boolean;
  details: {
    clinical_model: {
      name: string;
      target: string;
      expected_trees: number;
      expected_criterion: string;
      expected_seed: number;
      paper_reported_accuracy: number;
      paper_reported_auroc: number;
      paper_reported_test_set_size: number | null;
      artifact_present: boolean;
      status: string;
    };
    ecg_model: {
      name: string;
      target: string;
      expected_trees: number;
      expected_seed: number;
      paper_reported_accuracy: number;
      paper_reported_auroc: number;
      artifact_present: boolean;
      status: string;
    };
    fusion_engine: {
      rule: string;
      classification_threshold: number;
      status: string;
      validation_note: string;
    };
  };
}

export interface ClinicalPredictionResponse {
  success: boolean;
  model: string;
  probability: number;
  risk_label: 'elevated' | 'not_elevated';
  prediction: number;
  feature_names: string[];
  input_values: number[];
  research_disclaimer: string;
  error?: string;
}

export interface EcgPredictionResponse {
  success: boolean;
  model: string;
  probability: number;
  pattern_label: 'elevated_abnormality' | 'nominal_conduction';
  prediction: number;
  task_scope: string;
  feature_count: number;
  research_disclaimer: string;
  error?: string;
}

export interface FusionPredictionResponse {
  success: boolean;
  fusion_formula: string;
  clinical_probability: number;
  ecg_probability: number;
  fusion_score: number;
  threshold: number;
  result_label: 'elevated' | 'not_elevated';
  weights: { clinical: number; ecg: number };
  critical_limitation: string;
  research_disclaimer: string;
  error?: string;
}

export interface EcgFeatureExtractionResponse {
  success: boolean;
  feature_count: number;
  feature_names?: string[];
  features: number[];
  error?: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const statusCode = res.status;
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      // Non-JSON response
    }

    if (!res.ok) {
      const errorMessage = json?.error || `Server responded with HTTP ${statusCode}`;
      return {
        success: false,
        error: errorMessage,
        statusCode,
        isModelUnavailable: statusCode === 503,
        isNetworkError: false,
      };
    }

    return {
      success: true,
      data: json as T,
      statusCode,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Network failure connecting to backend at ${url}: ${err.message || err}`,
      isNetworkError: true,
      isModelUnavailable: false,
    };
  }
}

export const apiClient = {
  baseUrl: BASE_URL,

  async getHealth(): Promise<ApiResponse<ModelStatusResponse>> {
    return request<ModelStatusResponse>('/health');
  },

  async getModelInfo(): Promise<ApiResponse<any>> {
    return request<any>('/model-info');
  },

  async predictClinical(payload: Record<string, any>): Promise<ApiResponse<ClinicalPredictionResponse>> {
    return request<ClinicalPredictionResponse>('/predict/clinical', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async predictEcg(featuresOrRaw: { features?: number[]; raw_points?: number[] }): Promise<ApiResponse<EcgPredictionResponse>> {
    return request<EcgPredictionResponse>('/predict/ecg', {
      method: 'POST',
      body: JSON.stringify(featuresOrRaw),
    });
  },

  async extractEcgFeatures(rawPoints: number[]): Promise<ApiResponse<EcgFeatureExtractionResponse>> {
    return request<EcgFeatureExtractionResponse>('/extract/ecg-features', {
      method: 'POST',
      body: JSON.stringify({ raw_points: rawPoints }),
    });
  },

  async predictFusion(clinicalProbability: number, ecgProbability: number): Promise<ApiResponse<FusionPredictionResponse>> {
    return request<FusionPredictionResponse>('/predict/fusion', {
      method: 'POST',
      body: JSON.stringify({
        clinical_probability: clinicalProbability,
        ecg_probability: ecgProbability,
      }),
    });
  },
};
