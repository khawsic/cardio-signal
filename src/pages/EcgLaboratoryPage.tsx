import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  Sliders,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Info,
  Maximize2,
  ArrowRight,
  Filter,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { SectionHeading } from '../components/common/SectionHeading';
import { Button } from '../components/common/Button';
import { UploadDropzone } from '../components/common/UploadDropzone';
import { ExpandableDetails } from '../components/common/ExpandableDetails';
import { ECG_PRESETS } from '../data/mockData';

import ecgVectorImage from '../assets/images/ecg_lead_vector_field_1791732281961.jpg';

export const EcgLaboratoryPage: React.FC = () => {
  const {
    ecgSignal,
    selectedEcgPresetKey,
    loadEcgPreset,
    ecgLead,
    setEcgLead,
    ecgFilters,
    setEcgFilters,
    handleCustomEcgUpload,
    setCurrentPage,
  } = useApp();

  const [activeStep, setActiveStep] = useState<'upload' | 'inspect' | 'process' | 'analyze'>('inspect');
  const [inspectCrosshair, setInspectCrosshair] = useState<{ x: number; y: number; timeMs: number; mv: number } | null>(null);
  const [showSaliency, setShowSaliency] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1x or 2x
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Render high-precision ECG waveform on HTML5 canvas with calibration grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // 1. Draw standard clinical ECG background grid (1mm and 5mm blocks)
    // In ECG standard: 25mm/s horizontal, 10mm/mV vertical
    const smallGrid = 10;
    const largeGrid = 50;

    // Small grid (subtle pink/cyan lines)
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += smallGrid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += smallGrid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Large grid (accentuated)
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.16)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += largeGrid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += largeGrid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Baseline isoelectric line (0 mV)
    const isoelectricY = height / 2;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.12)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, isoelectricY);
    ctx.lineTo(width, isoelectricY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Draw neural attention saliency highlight segments if enabled
    if (showSaliency && ecgSignal.saliencySegments) {
      const totalPoints = ecgSignal.points.length;
      ecgSignal.saliencySegments.forEach((seg) => {
        // Map time ms (0 - 10000ms) to canvas X
        const startX = (seg.startMs / 10000) * width * zoomLevel;
        const endX = (seg.endMs / 10000) * width * zoomLevel;

        ctx.fillStyle = `rgba(6, 182, 212, ${0.12 * seg.score})`;
        ctx.fillRect(startX, 0, Math.max(30, endX - startX), height);

        // Subtle top saliency indicator banner
        ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
        ctx.fillRect(startX, 0, Math.max(30, endX - startX), 3);
      });
    }

    // 3. Draw continuous voltage trace
    const pts = ecgSignal.points;
    if (!pts || pts.length === 0) return;

    const visiblePoints = Math.round(pts.length / zoomLevel);
    const scaleY = (height / 2) * 0.45; // 1 mV maps to ~45% of half-height

    ctx.strokeStyle = '#0A192F';
    ctx.lineWidth = 1.75;
    ctx.lineJoin = 'round';
    ctx.beginPath();

    for (let i = 0; i < visiblePoints; i++) {
      const x = (i / visiblePoints) * width;
      const y = isoelectricY - pts[i] * scaleY;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // 4. Mark Pan-Tompkins detected R-peaks
    if (ecgSignal.rPeakIndices) {
      ctx.fillStyle = '#06B6D4';
      ecgSignal.rPeakIndices.forEach((rIdx) => {
        if (rIdx < visiblePoints) {
          const x = (rIdx / visiblePoints) * width;
          const y = isoelectricY - pts[rIdx] * scaleY;
          ctx.beginPath();
          ctx.arc(x, y - 6, 3, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    }

    // 5. Draw 1 mV calibration pulse at start
    const calX = 20;
    const calY = isoelectricY;
    ctx.strokeStyle = '#0891B2';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(calX, calY);
    ctx.lineTo(calX + 15, calY);
    ctx.lineTo(calX + 15, calY - 1.0 * scaleY); // 1 mV upward
    ctx.lineTo(calX + 35, calY - 1.0 * scaleY);
    ctx.lineTo(calX + 35, calY);
    ctx.lineTo(calX + 50, calY);
    ctx.stroke();

    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillStyle = '#0891B2';
    ctx.fillText('1 mV CAL', calX + 8, calY + 16);
  }, [ecgSignal, zoomLevel, showSaliency]);

  // Handle canvas mouse move for interactive crosshair probe
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = rect.width;
    const height = rect.height;
    const totalDurationMs = 10000 / zoomLevel;
    const timeMs = Math.round((x / width) * totalDurationMs);

    // Approximate amplitude from Y
    const isoelectricY = height / 2;
    const scaleY = (height / 2) * 0.45;
    const mv = Number(((isoelectricY - y) / scaleY).toFixed(2));

    setInspectCrosshair({ x, y, timeMs, mv });
  };

  const handleCanvasMouseLeave = () => {
    setInspectCrosshair(null);
  };

  return (
    <div className="bg-white min-h-screen">
      {/* 1. PAGE HEADER */}
      <PageHeader
        title="ECG Signal Laboratory"
        supportingText="Inspect cardiac waveforms, understand signal processing, and explore supported model outputs."
        kicker="12-Lead Electrophysiology Workbench"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline">Clinical Presets:</span>
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
              {Object.entries(ECG_PRESETS).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => loadEcgPreset(key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    selectedEcgPresetKey === key
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {key === 'normal_sinus'
                    ? 'Normal Sinus'
                    : key === 'anterior_stemi'
                    ? 'Anterior STEMI'
                    : 'AFib with RVR'}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* 2. PROGRESSION WORKFLOW STRIP (Upload -> Inspect -> Process -> Analyze) */}
      <div className="border-b border-slate-100 bg-slate-50/50 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-6 text-xs text-slate-500 overflow-x-auto">
            <button
              onClick={() => setActiveStep('upload')}
              className={`flex items-center gap-1.5 ${
                activeStep === 'upload' ? 'font-bold text-[#0A192F]' : 'hover:text-slate-900'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-mono">
                1
              </span>
              <span>Upload / Ingest</span>
            </button>
            <span className="text-slate-300">→</span>
            <button
              onClick={() => setActiveStep('inspect')}
              className={`flex items-center gap-1.5 ${
                activeStep === 'inspect' ? 'font-bold text-[#0A192F]' : 'hover:text-slate-900'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-[#0A192F] text-cyan-400 flex items-center justify-center text-[10px] font-mono">
                2
              </span>
              <span>Inspect Waveform</span>
            </button>
            <span className="text-slate-300">→</span>
            <button
              onClick={() => setActiveStep('process')}
              className={`flex items-center gap-1.5 ${
                activeStep === 'process' ? 'font-bold text-[#0A192F]' : 'hover:text-slate-900'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-mono">
                3
              </span>
              <span>Filter & Denoise</span>
            </button>
            <span className="text-slate-300">→</span>
            <button
              onClick={() => setActiveStep('analyze')}
              className={`flex items-center gap-1.5 ${
                activeStep === 'analyze' ? 'font-bold text-[#0A192F]' : 'hover:text-slate-900'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-mono">
                4
              </span>
              <span>Neural Saliency Output</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* 3. UPLOAD DROPZONE ACCORDION / TOGGLE */}
        <div className="mb-8">
          <UploadDropzone
            onFileProcessed={(data) => {
              handleCustomEcgUpload(data);
              setActiveStep('inspect');
            }}
          />
        </div>

        {/* 4. LARGE INTERACTIVE ECG WAVEFORM DISPLAY */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs mb-8">
          {/* Waveform Toolbar */}
          <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            {/* Lead selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Lead Vector:</span>
              <div className="flex items-center gap-1 p-0.5 bg-white border border-slate-200 rounded-md">
                {(['Lead I', 'Lead II', 'V1', 'V5'] as const).map((lead) => (
                  <button
                    key={lead}
                    onClick={() => setEcgLead(lead)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      ecgLead === lead
                        ? 'bg-[#0A192F] text-cyan-400 font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lead}
                  </button>
                ))}
              </div>
            </div>

            {/* Signal Processing Controls & View Toggles */}
            <div className="flex items-center gap-4 text-xs">
              {/* Saliency overlay toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 hover:text-[#0A192F]">
                <input
                  type="checkbox"
                  checked={showSaliency}
                  onChange={(e) => setShowSaliency(e.target.checked)}
                  className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="font-medium">Attention Saliency</span>
              </label>

              {/* Zoom toggle */}
              <button
                onClick={() => setZoomLevel((z) => (z === 1 ? 2 : 1))}
                className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
              >
                <Maximize2 className="w-3 h-3 text-slate-500" />
                <span>{zoomLevel === 1 ? 'Zoom 2x' : 'Reset 1x'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Canvas Viewport */}
          <div className="relative bg-[#FAFCFE] cursor-crosshair overflow-hidden">
            <canvas
              ref={canvasRef}
              width={1180}
              height={380}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={handleCanvasMouseLeave}
              className="w-full h-auto block select-none"
            />

            {/* Hover Crosshair Probe HUD */}
            {inspectCrosshair && (
              <div
                className="absolute pointer-events-none bg-[#0A192F]/95 text-white px-3 py-1.5 rounded shadow-lg text-[11px] font-mono border border-slate-700 z-20"
                style={{
                  left: Math.min(inspectCrosshair.x + 15, 960),
                  top: Math.max(10, inspectCrosshair.y - 45),
                }}
              >
                <div>T: {inspectCrosshair.timeMs} ms</div>
                <div className="text-cyan-400">V: {inspectCrosshair.mv > 0 ? `+${inspectCrosshair.mv}` : inspectCrosshair.mv} mV</div>
              </div>
            )}

            {/* Standard Calibration Indicator badge */}
            <div className="absolute bottom-3 right-4 bg-white/90 backdrop-blur-xs border border-slate-200 px-3 py-1 rounded text-[11px] text-slate-600 font-mono shadow-xs">
              25 mm/s · 10 mm/mV · 250 Hz WFDB
            </div>
          </div>
        </div>

        {/* 5. COMPACT SIGNAL METADATA & PROCESSING CONTROLS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8 items-start">
          {/* Signal Metadata (Left 7 Cols) */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-[#0A192F]">
                  Signal Metadata & Fiducial Intervals
                </h3>
                <p className="text-xs text-slate-500">
                  {ecgSignal.sourceName} · Record #{ecgSignal.id}
                </p>
              </div>
              <span className="font-mono text-xs text-slate-500">
                Patient #{ecgSignal.patientId}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2">
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-500">Heart Rate</div>
                <div className="text-2xl font-bold font-mono text-[#0A192F]">
                  {ecgSignal.heartRateBpm}
                  <span className="text-xs text-slate-400 font-normal ml-1">bpm</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Normative: 60–100</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-500">PR Interval</div>
                <div className="text-2xl font-bold font-mono text-[#0A192F]">
                  {ecgSignal.prIntervalMs}
                  <span className="text-xs text-slate-400 font-normal ml-1">ms</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Normative: 120–200</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-500">QRS Duration</div>
                <div className="text-2xl font-bold font-mono text-[#0A192F]">
                  {ecgSignal.qrsDurationMs}
                  <span className="text-xs text-slate-400 font-normal ml-1">ms</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Normative: &lt;110</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-500">Bazett QTc</div>
                <div className="text-2xl font-bold font-mono text-[#0A192F]">
                  {ecgSignal.qtcIntervalMs}
                  <span className="text-xs text-slate-400 font-normal ml-1">ms</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Normative: &lt;450</div>
              </div>
            </div>
          </div>

          {/* Processing Controls (Right 5 Cols) */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-[#0A192F] mb-1">
              Active Signal Conditioning
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Real-time DSP filtering applied to current 10-second voltage series.
            </p>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    Butterworth Bandpass Filter (0.5 – 45 Hz)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Removes high-frequency EMG muscle tremor artifacts
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={ecgFilters.bandpass}
                  onChange={(e) =>
                    setEcgFilters((prev) => ({ ...prev, bandpass: e.target.checked }))
                  }
                  className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    Adaptive Notch Filter (50 / 60 Hz)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Suppresses electrical mains powerline interference
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={ecgFilters.notch}
                  onChange={(e) =>
                    setEcgFilters((prev) => ({ ...prev, notch: e.target.checked }))
                  }
                  className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    Wavelet Baseline Wander Removal
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Corrects patient respiration drift around isoelectric baseline
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={ecgFilters.baselineWander}
                  onChange={(e) =>
                    setEcgFilters((prev) => ({ ...prev, baselineWander: e.target.checked }))
                  }
                  className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500"
                />
              </label>
            </div>
          </div>
        </div>

        {/* 6. NEURAL ANALYSIS RESULTS & ATTENTION SALIENCY */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-cyan-700 mb-1">
                Supported Neural Model Output
              </div>
              <h3 className="text-lg font-bold text-[#0A192F]">
                {ecgSignal.rhythmDiagnosis}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-slate-500">Confidence Calibrated</div>
                <div className="text-lg font-bold font-mono text-cyan-800">
                  {(ecgSignal.diagnosisConfidence * 100).toFixed(1)}%
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentPage('multimodal')}
              >
                Synthesize in Multimodal Research
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Temporal Saliency Breakdown
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ecgSignal.saliencySegments.map((seg, idx) => (
                <div key={idx} className="bg-white p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono text-cyan-700">
                      Window: {seg.startMs}ms – {seg.endMs}ms
                    </span>
                    <span className="font-mono font-semibold text-slate-800">
                      Score: {(seg.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{seg.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 7. COLLAPSIBLE ADVANCED PARAMETERS (SNR, Pan-Tompkins logs, ST deviations) */}
        <ExpandableDetails
          title="Advanced Signal Diagnostics & Telemetry Ledger"
          summary={`SNR: ${ecgSignal.snrDb} dB · J-Point ST Shift: ${ecgSignal.stSegmentDeviationMv > 0 ? `+${ecgSignal.stSegmentDeviationMv}` : ecgSignal.stSegmentDeviationMv} mV`}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-2">
            <div>
              <p className="text-xs font-bold text-slate-900 mb-2">Signal Quality Metrics</p>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Signal-to-Noise Ratio:</span>
                  <span className="font-mono font-semibold">{ecgSignal.snrDb} dB</span>
                </div>
                <div className="flex justify-between">
                  <span>Sampling Frequency:</span>
                  <span className="font-mono">250 Hz (10.0 sec)</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantization Depth:</span>
                  <span className="font-mono">16-bit signed integer</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-900 mb-2">Electrophysiology Offsets</p>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>ST Segment Deviation:</span>
                  <span className="font-mono font-semibold text-cyan-700">
                    {ecgSignal.stSegmentDeviationMv > 0 ? `+${ecgSignal.stSegmentDeviationMv}` : ecgSignal.stSegmentDeviationMv} mV
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Detected R-Peaks Count:</span>
                  <span className="font-mono">{ecgSignal.rPeakIndices.length} cardiac beats</span>
                </div>
                <div className="flex justify-between">
                  <span>Isoelectric Drift:</span>
                  <span className="font-mono">&lt; 0.04 mV</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-900 mb-2">Lead Vector Geometry</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Lead II projects along the anatomic axis of the left ventricle (+60° frontal plane), maximizing P-wave and QRS diagnostic sensitivity for inferior and anterior vectors.
              </p>
            </div>
          </div>
        </ExpandableDetails>
      </div>
    </div>
  );
};

