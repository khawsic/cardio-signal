import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Sliders,
  TrendingUp,
  TrendingDown,
  Info,
  ShieldAlert,
  Download,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { SectionHeading } from '../components/common/SectionHeading';
import { Button } from '../components/common/Button';
import { InputField, SelectField } from '../components/common/InputField';
import { ExpandableDetails } from '../components/common/ExpandableDetails';
import { CLINICAL_PRESETS } from '../data/mockData';

export const ClinicalAnalysisPage: React.FC = () => {
  const {
    clinicalData,
    setClinicalData,
    clinicalResult,
    runClinicalAnalysis,
    loadClinicalPreset,
    isClinicalLoading,
    clinicalApiError,
    isModelUnavailable,
    setCurrentPage,
  } = useApp();

  const [activePresetKey, setActivePresetKey] = useState<string>('cad_risk');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handlePresetSelect = (key: string) => {
    setActivePresetKey(key);
    loadClinicalPreset(key);
    setFormErrors({});
  };

  const handleFieldChange = (field: keyof typeof clinicalData, value: any) => {
    setClinicalData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateAndAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (clinicalData.age < 18 || clinicalData.age > 105) {
      errors.age = 'Age must be between 18 and 105.';
    }
    if (clinicalData.restingBP < 70 || clinicalData.restingBP > 260) {
      errors.restingBP = 'Resting BP must be between 70 and 260 mmHg.';
    }
    if (clinicalData.cholesterol < 100 || clinicalData.cholesterol > 600) {
      errors.cholesterol = 'Serum cholesterol must be between 100 and 600 mg/dL.';
    }
    if (clinicalData.maxHeartRate < 40 || clinicalData.maxHeartRate > 240) {
      errors.maxHeartRate = 'Max heart rate must be between 40 and 240 bpm.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    runClinicalAnalysis();
  };

  return (
    <div className="bg-white min-h-screen">
      {/* 1. PAGE HEADER */}
      <PageHeader
        title="Clinical Intelligence"
        supportingText="Explore structured clinical indicators through a transparent, model-driven workflow."
        kicker="EHR Biomarker Evaluation"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline">Reference Presets:</span>
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
              {Object.entries(CLINICAL_PRESETS).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePresetSelect(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activePresetKey === key
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {key === 'cad_risk'
                    ? 'CAD Risk'
                    : key === 'post_cabg'
                    ? 'Post-CABG'
                    : 'Healthy'}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* 2. PROGRESSION WORKFLOW STRIP */}
      <div className="border-b border-slate-100 bg-slate-50/50 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-6 text-xs text-slate-500 overflow-x-auto">
            <div className="flex items-center gap-1.5 font-semibold text-[#0A192F] shrink-0">
              <span className="w-5 h-5 rounded-full bg-[#0A192F] text-cyan-400 flex items-center justify-center text-[10px] font-mono">
                1
              </span>
              <span>Enter Biomarkers</span>
            </div>
            <span className="text-slate-300">→</span>
            <div className="flex items-center gap-1.5 text-slate-700 shrink-0">
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-mono">
                2
              </span>
              <span>Validate Ranges</span>
            </div>
            <span className="text-slate-300">→</span>
            <div className="flex items-center gap-1.5 text-slate-700 shrink-0">
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-mono">
                3
              </span>
              <span>Calculate SHAP Vectors</span>
            </div>
            <span className="text-slate-300">→</span>
            <div className="flex items-center gap-1.5 text-slate-700 shrink-0">
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-mono">
                4
              </span>
              <span>Review Calibrated Results</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TWO-COLUMN WORKSPACE: FORM (LEFT) + WORKFLOW GUIDANCE (RIGHT) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Structured Clinical Input Form */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-[#0A192F]">
                  Structured Clinical Indicators
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standardized cardiovascular risk features aligned with Cleveland / Framingham protocols.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handlePresetSelect('healthy_baseline')}
                className="text-xs text-slate-500 hover:text-cyan-700 flex items-center gap-1 transition-colors"
                title="Reset to baseline"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>

            {clinicalApiError && (
              <div
                className={`p-4 rounded-xl border mb-6 text-xs leading-relaxed ${
                  isModelUnavailable
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-current" />
                  <div>
                    <h4 className="font-bold text-sm">
                      {isModelUnavailable
                        ? 'Model Artifact Unavailable (HTTP 503)'
                        : 'Backend Communication Error'}
                    </h4>
                    <p className="mt-1">{clinicalApiError}</p>
                    <p className="mt-1.5 opacity-80 text-[11px]">
                      {isModelUnavailable
                        ? 'The backend inference service is running, but clinical_rf_model.joblib is not present in backend/models/. Run python backend/scripts/train_clinical_rf.py to train and supply the artifact.'
                        : 'Check that your Flask backend server is running and accessible via VITE_API_BASE_URL.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={validateAndAnalyze} className="space-y-6">
              {/* Demographics row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="Patient Age"
                  unit="years"
                  type="number"
                  value={clinicalData.age}
                  error={formErrors.age}
                  onChange={(e) => handleFieldChange('age', parseInt(e.target.value) || 0)}
                  min={18}
                  max={105}
                />
                <SelectField
                  label="Biological Sex"
                  value={clinicalData.sex}
                  onChange={(e) => handleFieldChange('sex', e.target.value)}
                >
                  <option value="male">Male (Standard Risk Baseline)</option>
                  <option value="female">Female (Standard Risk Baseline)</option>
                </SelectField>
              </div>

              {/* Hemodynamics row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="Resting Systolic Blood Pressure"
                  unit="mmHg"
                  type="number"
                  value={clinicalData.restingBP}
                  error={formErrors.restingBP}
                  onChange={(e) => handleFieldChange('restingBP', parseInt(e.target.value) || 0)}
                  helper="Normal physiological reference: 90–120 mmHg"
                />
                <InputField
                  label="Serum Total Cholesterol"
                  unit="mg/dL"
                  type="number"
                  value={clinicalData.cholesterol}
                  error={formErrors.cholesterol}
                  onChange={(e) => handleFieldChange('cholesterol', parseInt(e.target.value) || 0)}
                  helper="Desirable physiological reference: < 200 mg/dL"
                />
              </div>

              {/* Symptomatology & Stress row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField
                  label="Chest Pain Classification"
                  value={clinicalData.chestPainType}
                  onChange={(e) => handleFieldChange('chestPainType', e.target.value)}
                >
                  <option value="typical_angina">Typical Angina (Exertional Submultisite)</option>
                  <option value="atypical_angina">Atypical Angina</option>
                  <option value="non_anginal">Non-Anginal Discomfort</option>
                  <option value="asymptomatic">Asymptomatic Presentation</option>
                </SelectField>

                <InputField
                  label="Maximum Heart Rate Achieved"
                  unit="bpm"
                  type="number"
                  value={clinicalData.maxHeartRate}
                  error={formErrors.maxHeartRate}
                  onChange={(e) => handleFieldChange('maxHeartRate', parseInt(e.target.value) || 0)}
                  helper="Achieved during maximal exercise stress testing"
                />
              </div>

              {/* ST Segment & Vessels row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InputField
                  label="ST Depression"
                  unit="mm"
                  type="number"
                  step="0.1"
                  value={clinicalData.stDepression}
                  onChange={(e) => handleFieldChange('stDepression', parseFloat(e.target.value) || 0)}
                  helper="Exercise-induced ST depression"
                />
                <SelectField
                  label="ST Slope at Peak"
                  value={clinicalData.stSlope}
                  onChange={(e) => handleFieldChange('stSlope', e.target.value)}
                >
                  <option value="upsloping">Upsloping (Benign)</option>
                  <option value="flat">Flat (Equivocal)</option>
                  <option value="downsloping">Downsloping (Ischemic)</option>
                </SelectField>
                <SelectField
                  label="Fluoroscopy Vessels"
                  value={clinicalData.majorVessels}
                  onChange={(e) => handleFieldChange('majorVessels', parseInt(e.target.value) || 0)}
                  helper="0–3 colored major coronary vessels"
                >
                  <option value={0}>0 Vessels Narrowed</option>
                  <option value={1}>1 Major Vessel (≥50%)</option>
                  <option value={2}>2 Major Vessels (≥50%)</option>
                  <option value={3}>3 Major Vessels (Multivessel)</option>
                </SelectField>
              </div>

              {/* Toggles row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={clinicalData.exerciseAngina}
                    onChange={(e) => handleFieldChange('exerciseAngina', e.target.checked)}
                    className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800">
                      Exercise-Induced Angina Provocation
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Positive symptom reproduction during treadmill protocol
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={clinicalData.fastingBloodSugar}
                    onChange={(e) => handleFieldChange('fastingBloodSugar', e.target.checked)}
                    className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800">
                      Fasting Blood Sugar &gt; 120 mg/dL
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Marker of impaired glucose tolerance or diabetes mellitus
                    </p>
                  </div>
                </label>
              </div>

              {/* Action submission bar */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span className="text-xs text-slate-500">
                  Calibrated on Cleveland & Framingham Heart Study protocol
                </span>
                <Button type="submit" variant="primary" size="lg" disabled={isClinicalLoading}>
                  {isClinicalLoading ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin mr-2" />
                      Executing Model Inference...
                    </>
                  ) : (
                    <>
                      Validate & Run Clinical Analysis
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column: Concise Workflow & Guidance (Clean, spacious, editorial) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <div className="text-xs font-semibold tracking-wide uppercase text-cyan-700 mb-2">
                Workflow Guidance
              </div>
              <h3 className="text-base font-bold text-[#0A192F] mb-3">
                Transparent Attribution Engine
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                CardioSignal computes individual Shapley additive explanations (SHAP) for every input variable. Instead of treating patient features as an uninterpretable score, each indicator is decomposed into its positive (risk-elevating) or negative (protective) contribution.
              </p>

              <div className="border-t border-slate-200 pt-4 space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-slate-900 shrink-0">· Diamond-Forrester:</span>
                  <span>Categorizes exertional chest pain by retrosternal location, exertion provocation, and rest relief.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-slate-900 shrink-0">· ST Depression:</span>
                  <span>J-point displacement &gt; 1.0 mm flat or downsloping indicates significant myocardial ischemia.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-slate-900 shrink-0">· Fluoroscopy:</span>
                  <span>Luminal stenosis ≥ 50% in major epicardial coronary arteries provides anatomic validation.</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-sm font-bold text-[#0A192F] mb-2 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-cyan-700" />
                Clinical Reference Standards
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                Values outside physiological calibration bounds are flagged during input validation to ensure stability before passing to the multimodal decision fusion layer.
              </p>
              <div className="text-xs text-slate-500 flex items-center gap-4">
                <span>Normative Cohort Median: 22.4%</span>
                <span>·</span>
                <span>Threshold for Angiography: &gt; 65%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. RESULTS SECTION: SPACIOUS, READABLE CHARTS AND EXPLANATIONS */}
        {clinicalResult && (
          <div className="mt-14 pt-12 border-t border-slate-200">
            <SectionHeading
              number="02."
              title="Calibrated Clinical Results & Feature Attribution"
              description="Transparent risk probability index with individual feature contributions and confidence intervals."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage('multimodal')}
                >
                  Forward to Multimodal Fusion
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              }
            />

            {/* Hero result strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
              {/* Card 1: Risk Probability */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                <div className="text-xs text-slate-500 font-medium mb-1">
                  Cardiovascular Event Probability
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold font-mono tracking-tight text-[#0A192F]">
                    {clinicalResult.riskProbability}%
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    [95% CI: {clinicalResult.confidenceInterval[0]}%–{clinicalResult.confidenceInterval[1]}%]
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold">
                  <span
                    className={
                      clinicalResult.riskProbability >= 60
                        ? 'text-rose-700'
                        : clinicalResult.riskProbability >= 30
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }
                  >
                    ● {clinicalResult.riskCategory}
                  </span>
                </div>
              </div>

              {/* Card 2: Cohort Percentile */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                <div className="text-xs text-slate-500 font-medium mb-1">
                  Cohort Percentile Ranking
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold font-mono tracking-tight text-[#0A192F]">
                    {clinicalResult.framinghamComparison.patientRiskPercentile}th
                  </span>
                  <span className="text-xs text-slate-500">percentile of screened cohort</span>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Compared against age- and sex-matched Framingham prevention registry baselines.
                </p>
              </div>

              {/* Card 3: Dominant Clinical Driver */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
                <div className="text-xs text-slate-500 font-medium mb-1">
                  Primary Predictive Driver
                </div>
                <div className="text-lg font-bold text-[#0A192F] truncate">
                  {clinicalResult.shapAttributions[0]?.label}
                </div>
                <p className="mt-2 text-xs text-slate-600 line-clamp-2">
                  {clinicalResult.shapAttributions[0]?.description}
                </p>
                <div className="mt-2 text-xs font-mono text-cyan-700">
                  SHAP impact: +{clinicalResult.shapAttributions[0]?.shapValue} log-odds
                </div>
              </div>
            </div>

            {/* Feature Attribution (SHAP Waterfall / Bar View) */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 mb-8 shadow-xs">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-[#0A192F]">
                    Directional Feature Attribution (SHAP Vector)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Impact of individual indicators on the cardiovascular risk score relative to baseline.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5 text-rose-700">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                    Elevates Risk
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                    Protective Factor
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {clinicalResult.shapAttributions.map((attr, idx) => {
                  const maxAbsShap = 1.8;
                  const percentWidth = Math.min(100, (Math.abs(attr.shapValue) / maxAbsShap) * 100);
                  const isElevated = attr.direction === 'elevated';

                  return (
                    <div key={idx} className="group">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">{attr.label}</span>
                          <span className="text-slate-500 font-mono">({attr.value})</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span
                            className={
                              isElevated ? 'text-rose-600 font-semibold' : 'text-emerald-600 font-semibold'
                            }
                          >
                            {attr.shapValue > 0 ? `+${attr.shapValue}` : attr.shapValue}
                          </span>
                        </div>
                      </div>

                      {/* Directional Bar */}
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                        {isElevated ? (
                          <div
                            className="bg-rose-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${percentWidth}%` }}
                          />
                        ) : (
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${percentWidth}%` }}
                          />
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                        {attr.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Collapsible Advanced Technical Details */}
            <ExpandableDetails
              title="Advanced Technical Parameters & Standardized Z-Scores"
              summary="View normalized population deviations and log-odds coefficients"
            >
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 py-2">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-500 mb-0.5">Resting BP Z-Score</div>
                  <div className="text-base font-bold font-mono text-slate-800">
                    {clinicalResult.zScores.restingBP > 0 ? `+${clinicalResult.zScores.restingBP}` : clinicalResult.zScores.restingBP} σ
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Pop mean: 128 ± 17.5</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-500 mb-0.5">Cholesterol Z-Score</div>
                  <div className="text-base font-bold font-mono text-slate-800">
                    {clinicalResult.zScores.cholesterol > 0 ? `+${clinicalResult.zScores.cholesterol}` : clinicalResult.zScores.cholesterol} σ
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Pop mean: 245 ± 51.0</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-500 mb-0.5">Max HR Z-Score</div>
                  <div className="text-base font-bold font-mono text-slate-800">
                    {clinicalResult.zScores.maxHeartRate > 0 ? `+${clinicalResult.zScores.maxHeartRate}` : clinicalResult.zScores.maxHeartRate} σ
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Pop mean: 149 ± 23.0</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-500 mb-0.5">ST Depression Z-Score</div>
                  <div className="text-base font-bold font-mono text-slate-800">
                    {clinicalResult.zScores.stDepression > 0 ? `+${clinicalResult.zScores.stDepression}` : clinicalResult.zScores.stDepression} σ
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Pop mean: 1.04 ± 1.16</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>Model Version: CardioSignal Clinical LightGBM v2.4.1</span>
                <span>Validated Timestamp: {clinicalResult.validatedTimestamp}</span>
              </div>
            </ExpandableDetails>
          </div>
        )}
      </div>
    </div>
  );
};
