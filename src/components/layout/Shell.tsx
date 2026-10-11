import React, { useState } from 'react';
import {
  Activity,
  Menu,
  X,
  FileText,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageId } from '../../types';
import { Button } from '../common/Button';

interface ShellProps {
  children: React.ReactNode;
}

const NAV_ITEMS: { id: PageId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'clinical', label: 'Clinical Analysis' },
  { id: 'ecg', label: 'ECG Laboratory' },
  { id: 'multimodal', label: 'Multimodal Research' },
  { id: 'knowledge', label: 'Knowledge Graph' },
  { id: 'reports', label: 'Reports & Evaluation' },
];

export const Shell: React.FC<ShellProps> = ({ children }) => {
  const {
    currentPage,
    setCurrentPage,
    notification,
    clinicalData,
    ecgSignal,
    clinicalResult,
  } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navigateTo = (page: PageId) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Internal breadcrumb label
  const currentNavLabel = NAV_ITEMS.find((item) => item.id === currentPage)?.label || 'Overview';

  // Quick search results
  const searchResults = [
    { label: 'Clinical Intelligence — Biomarker Input Form', page: 'clinical' as PageId },
    { label: 'ECG Signal Laboratory — 12-Lead Waveform Inspection', page: 'ecg' as PageId },
    { label: 'Multimodal Research — Cross-Attention Neural Fusion', page: 'multimodal' as PageId },
    { label: 'Knowledge Graph — Pathophysiology & Evidence Tracing', page: 'knowledge' as PageId },
    { label: 'Reports & Evaluation — Diagnostic Benchmarks & Ledger', page: 'reports' as PageId },
    { label: 'Overview — Architecture Walkthrough & Paradigm', page: 'overview' as PageId },
  ].filter((item) =>
    searchQuery.trim() === '' || item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      {/* 1. TOP UTILITY BAR (Slim deep-navy strip) */}
      <div className="bg-[#071324] text-slate-300 text-xs border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-between">
          <div className="flex items-center gap-3 tracking-wide">
            <span className="font-medium text-slate-200">Protocol v2.4-EHR</span>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span className="text-slate-400 hidden sm:inline">
              Validated On MIT-BIH & MIMIC-IV
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-300">
            <button
              onClick={() => setSearchModalOpen(true)}
              className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors py-0.5"
              title="Search research components"
            >
              <Search className="w-3 h-3 text-slate-400" />
              <span className="hidden md:inline">Quick Find</span>
              <kbd className="hidden lg:inline-block bg-slate-800 text-[10px] px-1 py-0.2 rounded font-mono text-slate-400 border border-slate-700">
                ⌘K
              </kbd>
            </button>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <button
              onClick={() => navigateTo('reports')}
              className="hover:text-cyan-400 transition-colors hidden sm:inline"
            >
              Evaluation Ledger
            </button>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <a
              href="#documentation"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('knowledge');
              }}
              className="hover:text-cyan-400 transition-colors flex items-center gap-1"
            >
              <span>Evidence Graph</span>
              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </a>
          </div>
        </div>
      </div>

      {/* 2. MAIN BRAND HEADER (Crisp white header) */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex items-center justify-between gap-4">
          {/* Brand lockup */}
          <div
            onClick={() => navigateTo('overview')}
            className="cursor-pointer group flex items-center gap-3 select-none"
          >
            <div className="w-9 h-9 rounded-lg bg-[#0A192F] text-cyan-400 flex items-center justify-center shadow-sm group-hover:bg-[#112240] transition-colors">
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#0A192F]">
                  CardioSignal
                </span>
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-cyan-600">
                  2.0
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium tracking-normal hidden sm:block">
                Explainable Multimodal Cardiac Research
              </p>
            </div>
          </div>

          {/* Research workspace action & active session metadata */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-3 text-xs text-slate-500 border-r border-slate-200 pr-4">
              <span>Cohort: MIT-BIH & PTB-XL</span>
              <span>·</span>
              <span>Patient: #{ecgSignal.patientId}</span>
              <span>·</span>
              <span className="font-mono text-slate-700 font-medium">
                {ecgSignal.heartRateBpm} bpm
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateTo('reports')}
              className="hidden sm:inline-flex"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Export Session Dossier
            </Button>

            {/* Mobile menu hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* 3. PRIMARY NAVIGATION (Consistent deep-navy navigation bar) */}
      <nav className="bg-[#0A192F] text-white sticky top-0 z-40 shadow-sm border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="hidden md:flex items-center gap-1 h-12">
            {NAV_ITEMS.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  className={`relative px-4 h-full flex items-center text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'text-cyan-400 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile Collapsible Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-3 space-y-1 border-t border-slate-800">
              {NAV_ITEMS.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-cyan-950/60 text-cyan-400 font-semibold border-l-2 border-cyan-400'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* 4. UNDERSTATED BREADCRUMB (on internal pages) */}
      {currentPage !== 'overview' && (
        <div className="bg-slate-50 border-b border-slate-100 py-2.5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <button
                onClick={() => navigateTo('overview')}
                className="hover:text-cyan-700 transition-colors"
              >
                CardioSignal 2.0
              </button>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-slate-800 font-medium">{currentNavLabel}</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-500 font-mono text-[11px]">
                Active Case #{ecgSignal.patientId}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#0A192F] text-white px-4 py-3 rounded-lg shadow-xl border border-slate-700 text-sm flex items-center gap-3 animate-fade-in max-w-md">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="flex-1">{notification}</span>
        </div>
      )}

      {/* Quick Search Modal */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-20 px-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Jump to page or component..."
                className="w-full text-sm outline-none text-slate-900 placeholder:text-slate-400"
              />
              <button
                onClick={() => setSearchModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 max-h-72 overflow-y-auto">
              {searchResults.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-500">No matching views found.</p>
              ) : (
                searchResults.map((res, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      navigateTo(res.page);
                      setSearchModalOpen(false);
                    }}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-xs sm:text-sm text-slate-700 hover:text-[#0A192F] flex items-center justify-between"
                  >
                    <span>{res.label}</span>
                    <span className="text-[11px] text-cyan-700 uppercase font-mono">Navigate</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. MAIN CONTENT VIEWPORT */}
      <main className="flex-1 flex flex-col">{children}</main>

      {/* 6. SHARED FOOTER (Consistent across every page) */}
      <footer className="bg-slate-50 border-t border-slate-200 mt-16 pt-12 pb-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-200">
            {/* Col 1: Platform */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#0A192F] text-cyan-400 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-bold text-[#0A192F]">CardioSignal 2.0</span>
              </div>
              <p className="text-slate-500 leading-relaxed">
                Explainable Multimodal Cardiac Research Platform unifying clinical tabular biomarkers, continuous 12-lead ECG waveforms, and evidence-grounded neural reasoning.
              </p>
            </div>

            {/* Col 2: Research Modules */}
            <div>
              <p className="font-semibold text-slate-900 mb-3 uppercase tracking-wider text-[11px]">
                Research Modules
              </p>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => navigateTo('clinical')} className="hover:text-cyan-700">
                    Clinical Intelligence
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('ecg')} className="hover:text-cyan-700">
                    ECG Signal Laboratory
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('multimodal')} className="hover:text-cyan-700">
                    Multimodal Attention Fusion
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('knowledge')} className="hover:text-cyan-700">
                    Knowledge Graph & Explainability
                  </button>
                </li>
                <li>
                  <button onClick={() => navigateTo('reports')} className="hover:text-cyan-700">
                    Evaluation & Reproducibility Ledger
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Benchmark Datasets */}
            <div>
              <p className="font-semibold text-slate-900 mb-3 uppercase tracking-wider text-[11px]">
                Benchmark Cohorts
              </p>
              <ul className="space-y-2 text-slate-600">
                <li>PhysioNet PTB-XL Diagnostic Database (n=21,837)</li>
                <li>MIT-BIH Arrhythmia Reference Corpus</li>
                <li>MIMIC-IV-ECG Paired Critical Care Cohort</li>
                <li>Cleveland / Framingham Heart Study Harmonized</li>
              </ul>
            </div>

            {/* Col 4: Scientific Standards */}
            <div>
              <p className="font-semibold text-slate-900 mb-3 uppercase tracking-wider text-[11px]">
                Governance & Evidence
              </p>
              <ul className="space-y-2 text-slate-600">
                <li>AHA/ACC 2021/2023 Clinical Guidelines</li>
                <li>ESC Acute Coronary Syndrome Consensus</li>
                <li>SHAP TreeExplainer & Integrated Gradients</li>
                <li>In Silico Prospective Registry Protocol</li>
              </ul>
            </div>
          </div>

          {/* Research Prototype Disclaimer */}
          <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500">
            <p className="max-w-3xl text-left leading-relaxed">
              <strong className="text-slate-700">Research Prototype Disclaimer:</strong> CardioSignal 2.0 is an investigational computational cardiology platform designed exclusively for biomedical research, algorithmic evaluation, and multimodal workflow development. It does not provide primary clinical diagnosis and must not supersede direct clinical judgment or validated medical devices.
            </p>
            <div className="whitespace-nowrap shrink-0 text-slate-400">
              © 2026 CardioSignal Research Consortium
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
