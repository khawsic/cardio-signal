import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Database,
  Cpu,
  Share2,
  CheckCircle,
  Eye,
  Sliders,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/common/Button';
import { SectionHeading } from '../components/common/SectionHeading';

import cardiacHeroImage from '../assets/images/cardiac_digital_twin_hero_1791732267854.jpg';
import multimodalNetworkImage from '../assets/images/multimodal_cardiac_network_1791732294481.jpg';

export const OverviewPage: React.FC = () => {
  const { setCurrentPage, loadClinicalPreset, loadEcgPreset, ecgSignal } = useApp();
  const [activeStoryStep, setActiveStoryStep] = useState(0);

  const storySteps = [
    {
      step: '01',
      title: 'Multimodal Signal Intake',
      subtitle: 'Simultaneous acquisition of structured clinical markers and 12-lead electrophysiology.',
      detail:
        'CardioSignal harmonizes heterogeneous EHR attributes (lipid panels, arterial pressures, fluoroscopy records) alongside calibrated 500 Hz voltage timeseries.',
      actionLabel: 'Inspect ECG Lab',
      actionTarget: 'ecg' as const,
    },
    {
      step: '02',
      title: 'Decomposition & Saliency',
      subtitle: 'Continuous wavelet filtering, fiducial delineation, and neural attention mapping.',
      detail:
        'Pan-Tompkins fiducial detection extracts P-Q-R-S-T complexes while 1D-ResNet computes temporal gradient saliencies highlighting acute J-point and ST deviations.',
      actionLabel: 'View Waveform Saliency',
      actionTarget: 'ecg' as const,
    },
    {
      step: '03',
      title: 'Cross-Attention Synthesis',
      subtitle: 'Bi-directional attention aligning tabular indicators with localized waveform morphology.',
      detail:
        'Cross-attention mechanisms link exercise-induced angina directly to ST depression depth and hypercholesterolemia to structural microvascular risk.',
      actionLabel: 'Explore Multimodal Fusion',
      actionTarget: 'multimodal' as const,
    },
    {
      step: '04',
      title: 'Evidence-Grounded Reasoning',
      subtitle: 'Transparent provenance mapping back to published ACC/AHA guidelines and consensus definitions.',
      detail:
        'Every probabilistic prediction is linked to verified knowledge graph nodes and scientific literature citations, removing opaque black-box ambiguity.',
      actionLabel: 'Browse Knowledge Graph',
      actionTarget: 'knowledge' as const,
    },
  ];

  return (
    <div className="bg-white">
      {/* 1. EDITORIAL HERO SECTION */}
      <section className="relative isolate overflow-hidden pt-12 pb-16 lg:pt-16 lg:pb-24 border-b border-slate-100">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <img src={cardiacHeroImage} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-center opacity-[0.14] transition-opacity duration-700" />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-white/75" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Editorial Headline & Actions */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-700">
                <span>Computational Cardiology Research</span>
                <span className="text-slate-300">Â·</span>
                <span>Open Science Prototype</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0A192F] leading-[1.1] text-balance">
                Explainable Multimodal Cardiac Intelligence.
              </h1>

              <p className="text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed max-w-2xl text-balance">
                Bridging the semantic chasm between structured clinical indicators and raw 12-lead electrocardiography through transparent, attention-guided neural reasoning.
              </p>

              {/* Research Cohort Proof strip */}
              <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-slate-500 border-t border-slate-100">
                <div>
                  <strong className="text-slate-900 font-mono text-sm">21,837</strong>
                  <span className="ml-1.5 text-slate-500">PTB-XL ECGs</span>
                </div>
                <div className="hidden sm:inline text-slate-300">Â·</div>
                <div>
                  <strong className="text-slate-900 font-mono text-sm">4,280</strong>
                  <span className="ml-1.5 text-slate-500">Paired MIMIC-IV Cases</span>
                </div>
                <div className="hidden sm:inline text-slate-300">Â·</div>
                <div>
                  <strong className="text-cyan-700 font-mono text-sm">0.894</strong>
                  <span className="ml-1.5 text-slate-500">Multimodal AUROC</span>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setCurrentPage('clinical')}
                >
                  Launch Clinical Analysis
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                <Button
                  variant="navy"
                  size="lg"
                  onClick={() => setCurrentPage('ecg')}
                >
                  Open ECG Laboratory
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setCurrentPage('knowledge')}
                >
                  Trace Evidence Graph
                </Button>
              </div>
            </div>

            {/* Right Column: High-Fidelity Scientific Digital Twin Visual */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-xl bg-slate-50">
                <img
                  src={cardiacHeroImage}
                  alt="High-resolution 3D scientific rendering of cardiac electrical pathways"
                  referrerPolicy="no-referrer"
                  className="w-full h-auto object-cover aspect-16/10"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A192F]/80 via-transparent to-transparent flex flex-col justify-end p-5 text-white">
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                    <span>Conduction Pathway In Silico Model</span>
                    <span className="font-mono text-cyan-300">Active Lead II</span>
                  </div>
                  <p className="text-sm font-semibold text-white">
                    Bioelectrical Propagation & Subendocardial Vector Alignment
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THREE PILLARS OF CARDIOSIGNAL 2.0 */}
      <section className="py-16 sm:py-20 bg-slate-50/60 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-semibold tracking-wide uppercase text-cyan-700 mb-2">
              Foundational Architecture
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0A192F]">
              Three Pillars of Transparent Cardiology
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              CardioSignal rejects opaque neural predictions by guaranteeing attribution at every stage of the diagnostic workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1 */}
            <div className="bg-white p-7 rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center mb-5">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0A192F] mb-2">
                Transparent Clinical Biomarkers
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Structured clinical indicators are evaluated with exact SHAP attributions, establishing individual feature impact on cardiovascular risk odds.
              </p>
              <div className="text-xs text-slate-500 border-t border-slate-100 pt-3">
                <span>Diamond-Forrester</span> Â· <span>Framingham Risk Calibrated</span>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white p-7 rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center mb-5">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0A192F] mb-2">
                Neural Waveform Decomposition
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                12-lead signals undergo multi-scale wavelet denoising and temporal attention heatmapping to isolate ischemia and dysrhythmia complexes.
              </p>
              <div className="text-xs text-slate-500 border-t border-slate-100 pt-3">
                <span>Pan-Tompkins QRS</span> Â· <span>500 Hz Calibration Grid</span>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white p-7 rounded-xl border border-slate-200 hover:border-slate-300 transition-all shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center mb-5">
                <Share2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0A192F] mb-2">
                Knowledge-Grounded Explainability
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Every probabilistic output is verified against formal clinical ontology nodes and authoritative AHA/ACC consensus guideline literature.
              </p>
              <div className="text-xs text-slate-500 border-t border-slate-100 pt-3">
                <span>Class I Level A Evidence</span> Â· <span>Universal MI Criteria</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE STORYTELLING WALKTHROUGH */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            number="01."
            title="Interactive Research Walkthrough"
            description="Step through the four core stages of the explainable multimodal pipeline."
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mt-8">
            {/* Step selector list on left */}
            <div className="lg:col-span-5 space-y-3 flex flex-col justify-between">
              {storySteps.map((step, idx) => {
                const isActive = activeStoryStep === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveStoryStep(idx)}
                    className={`p-5 rounded-xl cursor-pointer transition-all border ${
                      isActive
                        ? 'bg-slate-50 border-cyan-500 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <span
                        className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                          isActive ? 'bg-[#0A192F] text-cyan-400' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {step.step}
                      </span>
                      <h3
                        className={`text-base font-bold ${
                          isActive ? 'text-[#0A192F]' : 'text-slate-700'
                        }`}
                      >
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {step.subtitle}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Detailed interactive visual stage on right */}
            <div className="lg:col-span-7 bg-[#0A192F] text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-4 mb-6">
                  <span className="font-mono text-cyan-400 uppercase tracking-wider">
                    Pipeline Execution State
                  </span>
                  <span>Stage {activeStoryStep + 1} of 4</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
                  {storySteps[activeStoryStep].title}
                </h3>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                  {storySteps[activeStoryStep].detail}
                </p>

                {/* Dynamic visual representation according to active step */}
                <div className="bg-[#071324] rounded-xl p-5 border border-slate-800 text-xs font-mono space-y-2 mb-6">
                  {activeStoryStep === 0 && (
                    <div className="space-y-1.5 text-slate-300">
                      <div className="text-cyan-400 font-semibold mb-2">
                        Tabular Biomarkers + Waveform Buffer:
                      </div>
                      <div>Â· Age: 64 yrs | Resting BP: 148 mmHg | Serum Chol: 278 mg/dL</div>
                      <div>Â· ECG Channel: Lead II @ 250 Hz | Duration: 10.0s | 2,500 samples</div>
                      <div className="text-emerald-400">âœ“ Signal validation checksum OK</div>
                    </div>
                  )}

                  {activeStoryStep === 1 && (
                    <div className="space-y-1.5 text-slate-300">
                      <div className="text-cyan-400 font-semibold mb-2">
                        ResNet-1D Gradient Saliency Layer:
                      </div>
                      <div>Â· ST segment elevation detected: +0.45 mV (Leads V1â€“V3)</div>
                      <div>Â· Pan-Tompkins R-peaks: 14 cardiac cycles extracted</div>
                      <div className="text-amber-400">
                        âš  Temporal Saliency Peak: 96% attention density on J-point recovery
                      </div>
                    </div>
                  )}

                  {activeStoryStep === 2 && (
                    <div className="space-y-1.5 text-slate-300">
                      <div className="text-cyan-400 font-semibold mb-2">
                        Cross-Attention Alignment Tensor:
                      </div>
                      <div>Â· Tabular Exertional Angina â†” Waveform ST Depression (Weight: 0.89)</div>
                      <div>Â· Fluoroscopy Vessels (2) â†” Anterior ST Vector Deviation (Weight: 0.94)</div>
                      <div className="text-cyan-300">
                        âœ“ Multimodal synergy gain: +0.110 AUROC over unimodal clinical baseline
                      </div>
                    </div>
                  )}

                  {activeStoryStep === 3 && (
                    <div className="space-y-1.5 text-slate-300">
                      <div className="text-cyan-400 font-semibold mb-2">
                        Ontology Grounding Engine:
                      </div>
                      <div>Â· Path: ST Elevation â†’ Myocardial Ischemia â†’ ACC/AHA Revasc Guideline</div>
                      <div>Â· Evidence Level: Class I (Level A Consensus)</div>
                      <div className="text-emerald-400">
                        âœ“ Citation: Thygesen K et al. Fourth Universal Def. Circulation 2018
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  {storySteps.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveStoryStep(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        activeStoryStep === i ? 'w-8 bg-cyan-400' : 'w-2 bg-slate-700'
                      }`}
                      aria-label={`Jump to step ${i + 1}`}
                    />
                  ))}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setCurrentPage(storySteps[activeStoryStep].actionTarget)}
                >
                  {storySteps[activeStoryStep].actionLabel}
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THE MULTIMODAL PARADIGM COMPARISON */}
      <section className="py-16 sm:py-20 bg-slate-50/50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            number="02."
            title="The Multimodal Synergy Advantage"
            description="Quantifying the diagnostic gain when combining tabular electronic records with continuous waveforms."
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mt-8">
            <div className="lg:col-span-6 space-y-4">
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Single-modality cardiac algorithms suffer from blind spots. Tabular clinical risk scores fail to detect acute electrical conduction failure, while standard ECG neural classifiers lack historical metabolic, lipid, and demographic context.
              </p>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                CardioSignal 2.0 fuses these streams via cross-attention layers that attend to time-series events when corresponding physiological risk markers are elevated.
              </p>

              <div className="space-y-3 pt-3">
                <div className="p-4 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">Tabular Clinical Model Only</span>
                    <span className="font-mono text-slate-600">0.784 AUROC</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-slate-400 h-full rounded-full" style={{ width: '78.4%' }} />
                  </div>
                </div>

                <div className="p-4 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">12-Lead ECG ResNet-1D Only</span>
                    <span className="font-mono text-slate-600">0.836 AUROC</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-slate-500 h-full rounded-full" style={{ width: '83.6%' }} />
                  </div>
                </div>

                <div className="p-4 bg-white rounded-lg border border-cyan-400 shadow-xs">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-[#0A192F] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                      Multimodal Cross-Attention Fusion
                    </span>
                    <span className="font-mono font-bold text-cyan-700">0.894 AUROC (+0.110 gain)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-cyan-600 h-full rounded-full" style={{ width: '89.4%' }} />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage('multimodal')}
                >
                  Explore Multimodal Research Section
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white p-3 shadow-md">
                <img
                  src={multimodalNetworkImage}
                  alt="Multimodal cardiac network cross-attention diagram"
                  referrerPolicy="no-referrer"
                  className="w-full h-auto rounded-xl object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION & WORKSPACE ONRAMPS */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#0A192F] rounded-2xl p-8 sm:p-12 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                Ready for Laboratory Investigation
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Begin Multimodal Evaluation
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Load benchmark patient cohorts or upload raw electrophysiology time series to inspect transparent SHAP attributions and evidence graphs.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setCurrentPage('clinical')}
              >
                Analyze Clinical Case
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-white border-slate-700 hover:bg-white/10"
                onClick={() => setCurrentPage('reports')}
              >
                Inspect Benchmarks
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};


