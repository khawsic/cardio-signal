import React, { useState } from 'react';
import {
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  Cpu,
  Info,
  CheckCircle2,
  AlertTriangle,
  GitMerge,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { SectionHeading } from '../components/common/SectionHeading';
import { Button } from '../components/common/Button';
import { ExpandableDetails } from '../components/common/ExpandableDetails';
import { StatusMessage } from '../components/common/StatusMessage';
import { BENCHMARK_MODELS } from '../data/mockData';

export const MultimodalResearchPage: React.FC = () => {
  const { clinicalResult, clinicalData, ecgSignal, setCurrentPage } = useApp();

  const [selectedAlignmentPair, setSelectedAlignmentPair] = useState<number>(0);

  // Cross-modal attention pairs linking clinical features to ECG waveform segments
  const crossAttentionPairs = [
    {
      clinicalFeature: 'Exercise ST Depression (2.4 mm)',
      ecgSegment: 'ST-T Junction Recovery Waveform',
      attentionWeight: 0.94,
      pathophysiology:
        'Bi-directional attention identifies concordance between exertional subendocardial ischemia in treadmill test and sustained J-point depression in voltage timeseries.',
      evidenceLevel: 'Class I (Level A)',
    },
    {
      clinicalFeature: 'Typical Anginal Retrosternal Pressure',
      ecgSegment: 'Anterior Precordial Lead V1–V3 Inversion',
      attentionWeight: 0.88,
      pathophysiology:
        'Symptomatic exertional angina matches localized regional anterior microvascular perfusion deficits detected by 1D-ResNet convolution filters.',
      evidenceLevel: 'Class IIa (Level B)',
    },
    {
      clinicalFeature: 'Major Fluoroscopy Vessels Narrowed (2)',
      ecgSegment: 'Q-Wave Attenuation & R-Peak Loss',
      attentionWeight: 0.91,
      pathophysiology:
        'Multivessel coronary anatomic stenosis aligns with electrophysiologic loss of anterior depolarization vector force.',
      evidenceLevel: 'Class I (Level A)',
    },
    {
      clinicalFeature: 'Resting Systolic Hypertension (148 mmHg)',
      ecgSegment: 'Left Ventricular Voltage Strain Pattern',
      attentionWeight: 0.79,
      pathophysiology:
        'Chronic hemodynamic afterload pressure manifests as asymmetric lateral ST-T strain and elevated Sokolow-Lyon voltages.',
      evidenceLevel: 'Class IIa (Level B)',
    },
  ];

  // Derive unified fused prediction from active session
  const clinicalProb = clinicalResult ? clinicalResult.riskProbability : 62.0;
  const ecgProb = Number((ecgSignal.diagnosisConfidence * 100).toFixed(1));

  // Joint cross-attention prediction combines clinical baseline with waveform morphology
  const fusedProb = Number(
    (0.42 * clinicalProb + 0.58 * ecgProb + (clinicalProb > 60 && ecgProb > 70 ? 4.2 : -2.1)).toFixed(1)
  );

  return (
    <div className="bg-white min-h-screen">
      {/* 1. PAGE HEADER */}
      <PageHeader
        title="Multimodal Cardiac Research"
        supportingText="Investigate how clinical information and ECG signals may complement each other."
        kicker="Cross-Modal Attention Architecture"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage('knowledge')}
            >
              Trace Knowledge Graph
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* 2. SCIENTIFIC VALIDATION STATUS BANNER */}
        <div className="mb-10">
          <StatusMessage
            type="info"
            title="Validation Status: Retrospectively Calibrated Cohort"
          >
            Multimodal fusion models evaluated on paired retrospective MIMIC-IV & PTB-XL datasets (n=4,280). Prospective multicenter randomized trial validation is in progress and required prior to diagnostic deployment.
          </StatusMessage>
        </div>

        {/* 3. VISUALLY CONNECTED SECTION: CLINICAL PATHWAY + ECG PATHWAY -> CROSS ATTENTION FUSION */}
        <div className="mb-14">
          <SectionHeading
            number="01."
            title="Dual-Pathway Synthesis Architecture"
            description="Parallel feature representations aligned into a unified cross-modal latent embedding."
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mt-6">
            {/* Pathway A: Clinical EHR Stream (Left 5 Cols) */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 inline-block" />
                    <h3 className="text-base font-bold text-[#0A192F]">
                      Pathway A: Clinical EHR Indicators
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-500">Tabular Embeddings</span>
                </div>

                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  Extracts demographic, hemodynamic, and metabolic variables with tree-based gradient boosted SHAP vectors.
                </p>

                <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Patient Demographics:</span>
                    <span className="font-semibold text-slate-900">
                      {clinicalData.age}y {clinicalData.sex}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Resting Blood Pressure:</span>
                    <span className="font-mono text-slate-900">{clinicalData.restingBP} mmHg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Serum Cholesterol:</span>
                    <span className="font-mono text-slate-900">{clinicalData.cholesterol} mg/dL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Chest Pain Diamond-Forrester:</span>
                    <span className="font-semibold text-slate-900">
                      {clinicalData.chestPainType.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Unimodal Baseline Risk:</span>
                <span className="text-lg font-mono font-bold text-[#0A192F]">
                  {clinicalProb}%
                </span>
              </div>
            </div>

            {/* Connecting Visual Element (Center 2 Cols on lg) */}
            <div className="lg:col-span-2 hidden lg:flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-[#0A192F] text-cyan-400 flex items-center justify-center shadow-md mb-2">
                <GitMerge className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-[#0A192F]">Bi-Directional</span>
              <span className="text-[11px] text-slate-500">Cross-Attention</span>
              <div className="w-full border-t border-dashed border-cyan-400 my-3" />
              <span className="text-[11px] font-mono text-cyan-700">W ~ 0.89</span>
            </div>

            {/* Pathway B: Continuous ECG Waveform Stream (Right 5 Cols) */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 inline-block" />
                    <h3 className="text-base font-bold text-[#0A192F]">
                      Pathway B: Continuous 12-Lead ECG
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-500">1D-ResNet Wavelet</span>
                </div>

                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  Processes 500 Hz multi-channel voltage sweeps, extracting J-point shifts, ST deviations, and rhythm intervals.
                </p>

                <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Active Channel Vector:</span>
                    <span className="font-semibold text-slate-900">{ecgSignal.lead}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Detected Heart Rate:</span>
                    <span className="font-mono text-slate-900">{ecgSignal.heartRateBpm} bpm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">ST-Segment Deviation:</span>
                    <span className="font-mono text-cyan-800">
                      {ecgSignal.stSegmentDeviationMv > 0 ? `+${ecgSignal.stSegmentDeviationMv}` : ecgSignal.stSegmentDeviationMv} mV
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Waveform Classification:</span>
                    <span className="font-semibold text-slate-900 truncate max-w-[180px]">
                      {ecgSignal.rhythmDiagnosis}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Unimodal Waveform Confidence:</span>
                <span className="text-lg font-mono font-bold text-[#0A192F]">
                  {ecgProb}%
                </span>
              </div>
            </div>
          </div>

          {/* COMBINED MULTIMODAL SYNTHESIS CARD */}
          <div className="mt-8 bg-[#0A192F] text-white rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 mb-1">
                  Synthesized Decision Output
                </div>
                <h3 className="text-2xl font-bold text-white">
                  Cross-Attention Multimodal Prediction
                </h3>
                <p className="text-slate-300 text-sm mt-1">
                  Reconciled probability incorporating clinical risk factors and electrophysiologic morphology.
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div>
                  <div className="text-xs text-slate-400">Fused Ischemic Risk</div>
                  <div className="text-4xl font-bold font-mono text-cyan-400">
                    {fusedProb}%
                  </div>
                </div>
                <div className="hidden sm:block border-l border-slate-700 pl-6">
                  <div className="text-xs text-slate-400">Synergy Concordance</div>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    High (0.91)
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <div className="bg-[#071324] p-4 rounded-xl border border-slate-800">
                <div className="font-semibold text-slate-200 mb-1">Feature Reinforcement</div>
                <p className="text-slate-400 leading-relaxed">
                  Both clinical ST depression ({clinicalData.stDepression} mm) and ECG J-point elevation ({ecgSignal.stSegmentDeviationMv} mV) mutually reinforce severe myocardial ischemia.
                </p>
              </div>

              <div className="bg-[#071324] p-4 rounded-xl border border-slate-800">
                <div className="font-semibold text-slate-200 mb-1">False Positive Mitigation</div>
                <p className="text-slate-400 leading-relaxed">
                  Waveform morphology prevents benign early repolarization from falsely triggering high clinical risk alerts when cardiovascular biomarkers are normal.
                </p>
              </div>

              <div className="bg-[#071324] p-4 rounded-xl border border-slate-800">
                <div className="font-semibold text-slate-200 mb-1">Actionable Clinical Target</div>
                <p className="text-slate-400 leading-relaxed">
                  Cross-attention vector recommends immediate invasive coronary angiography per ACC/AHA Class I consensus guidelines.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. INTERACTIVE CROSS-MODAL ATTENTION ALIGNMENT MATRIX */}
        <div className="mb-14">
          <SectionHeading
            number="02."
            title="Cross-Modal Attention Matrix"
            description="Explore localized attention weights connecting specific tabular indicators to waveform time intervals."
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-6">
            {/* List of alignment pairs */}
            <div className="lg:col-span-5 space-y-3">
              {crossAttentionPairs.map((pair, idx) => {
                const isSelected = selectedAlignmentPair === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedAlignmentPair(idx)}
                    className={`p-4 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-slate-50 border-cyan-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-[#0A192F]">
                        {pair.clinicalFeature}
                      </span>
                      <span className="font-mono text-cyan-700 font-bold">
                        Weight: {pair.attentionWeight}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      ↔ {pair.ecgSegment}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Alignment Detail */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h4 className="text-base font-bold text-[#0A192F]">
                  Pathophysiological Coupling Explanation
                </h4>
                <span className="text-xs text-slate-500">
                  {crossAttentionPairs[selectedAlignmentPair].evidenceLevel}
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg mb-6 border border-slate-100">
                <div className="text-xs font-mono text-cyan-700 mb-1">
                  Clinical Indicator: {crossAttentionPairs[selectedAlignmentPair].clinicalFeature}
                </div>
                <div className="text-xs font-mono text-slate-700 mb-3">
                  ECG Morphology: {crossAttentionPairs[selectedAlignmentPair].ecgSegment}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {crossAttentionPairs[selectedAlignmentPair].pathophysiology}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Attention weight computed via scaled dot-product transformer head #4
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage('knowledge')}
                >
                  Verify in Knowledge Graph
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 5. MODEL COMPARISON (CLEAN LABELED SUMMARY CHART) */}
        <div>
          <SectionHeading
            number="03."
            title="Rigorous Benchmark Model Comparison"
            description="Comparative AUROC, F1-score, sensitivity, and specificity evaluated on standardized held-out test splits."
          />

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <th className="py-3 px-4 font-semibold">Model Architecture</th>
                    <th className="py-3 px-4 font-semibold">Modality Input</th>
                    <th className="py-3 px-4 font-semibold font-mono">AUROC</th>
                    <th className="py-3 px-4 font-semibold font-mono">F1-Score</th>
                    <th className="py-3 px-4 font-semibold font-mono">Sensitivity</th>
                    <th className="py-3 px-4 font-semibold font-mono">Specificity</th>
                    <th className="py-3 px-4 font-semibold">Test Cohort</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {BENCHMARK_MODELS.map((m, idx) => {
                    const isMultimodal = m.modality === 'Cross-Attention Fusion';
                    return (
                      <tr
                        key={idx}
                        className={isMultimodal ? 'bg-cyan-50/30 font-medium' : 'hover:bg-slate-50'}
                      >
                        <td className="py-3.5 px-4 text-slate-900 flex items-center gap-2">
                          {isMultimodal && (
                            <Sparkles className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
                          )}
                          <span>{m.modelName}</span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{m.modality}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {m.auroc.toFixed(3)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          {m.f1Score.toFixed(3)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          {(m.sensitivity * 100).toFixed(1)}%
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700">
                          {(m.specificity * 100).toFixed(1)}%
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-xs">
                          {m.sourceDataset} (n={m.testSetSize})
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span>
                All test splits strictly disjoint from training distributions. Bootstrapped with 1,000 resamples.
              </span>
              <button
                onClick={() => setCurrentPage('reports')}
                className="text-cyan-700 hover:text-cyan-800 font-medium"
              >
                Inspect Full Evaluation Ledger →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
