import React, { useState } from 'react';
import {
  Share2,
  Search,
  BookOpen,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PageHeader } from '../components/common/PageHeader';
import { SectionHeading } from '../components/common/SectionHeading';
import { Button } from '../components/common/Button';
import { KNOWLEDGE_NODES, KNOWLEDGE_EDGES } from '../data/mockData';
import { KnowledgeNode } from '../types';

export const KnowledgeGraphPage: React.FC = () => {
  const { selectedNodeId, setSelectedNodeId, selectedNode, setCurrentPage } = useApp();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    { id: 'all', label: 'All Entities' },
    { id: 'model_output', label: 'Model Outputs' },
    { id: 'waveform_biomarker', label: 'Waveform Biomarkers' },
    { id: 'clinical_phenotype', label: 'Clinical Phenotypes' },
    { id: 'pathophysiology', label: 'Pathophysiology' },
    { id: 'guideline', label: 'Clinical Guidelines' },
  ];

  // Filter nodes
  const filteredNodes = KNOWLEDGE_NODES.filter((node) => {
    const matchesCat = filterCategory === 'all' || node.category === filterCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.definition.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Edges connected to the selected node
  const connectedEdges = KNOWLEDGE_EDGES.filter(
    (e) => e.source === selectedNodeId || e.target === selectedNodeId
  );

  const getCategoryColor = (cat: KnowledgeNode['category']) => {
    switch (cat) {
      case 'model_output':
        return { fill: '#0A192F', stroke: '#06B6D4', text: '#FFFFFF', pill: 'text-cyan-400' };
      case 'waveform_biomarker':
        return { fill: '#F0F9FF', stroke: '#0284C7', text: '#0369A1', pill: 'text-sky-700' };
      case 'clinical_phenotype':
        return { fill: '#F8FAFC', stroke: '#475569', text: '#1E293B', pill: 'text-slate-700' };
      case 'pathophysiology':
        return { fill: '#FFF1F2', stroke: '#E11D48', text: '#9F1239', pill: 'text-rose-700' };
      case 'guideline':
        return { fill: '#ECFDF5', stroke: '#059669', text: '#065F46', pill: 'text-emerald-700' };
      default:
        return { fill: '#F1F5F9', stroke: '#64748B', text: '#334155', pill: 'text-slate-700' };
    }
  };

  return (
    <div className="bg-white min-h-screen">
      {/* 1. PAGE HEADER */}
      <PageHeader
        title="Explore the Connections Behind AI Findings"
        supportingText="Trace model outputs to features, explanations, and documented evidence."
        kicker="Ontology & Evidence Grounding"
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage('reports')}
            >
              Evaluation Reports
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* 2. FILTER & SEARCH CONTROL STRIP */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-100">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  filterCategory === cat.id
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search concepts or evidence..."
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600"
            />
          </div>
        </div>

        {/* 3. SPACIOUS SPLIT LAYOUT: MAIN GRAPH (LEFT 8) + SELECTED NODE INFO PANEL (RIGHT 4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Area: Interactive SVG Knowledge Graph (8 Cols) */}
          <div className="lg:col-span-8 bg-[#FAFCFE] border border-slate-200 rounded-xl overflow-hidden shadow-xs relative">
            <div className="p-4 bg-white/80 backdrop-blur-xs border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#0A192F]">Interactive Cardiac Knowledge Map</span>
                <span>·</span>
                <span>Click any node to inspect evidence provenance</span>
              </div>
              <div className="font-mono text-cyan-800">
                {filteredNodes.length} Nodes · {KNOWLEDGE_EDGES.length} Relations
              </div>
            </div>

            {/* SVG Interactive Graph Canvas */}
            <div className="p-4 overflow-x-auto flex justify-center">
              <svg
                viewBox="0 0 960 540"
                className="w-full max-w-[960px] h-auto min-h-[460px] select-none"
              >
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="8"
                    markerHeight="6"
                    refX="8"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#94A3B8" />
                  </marker>
                  <marker
                    id="arrowhead-active"
                    markerWidth="8"
                    markerHeight="6"
                    refX="8"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#06B6D4" />
                  </marker>
                </defs>

                {/* Edges */}
                {KNOWLEDGE_EDGES.map((edge, idx) => {
                  const sourceNode = KNOWLEDGE_NODES.find((n) => n.id === edge.source);
                  const targetNode = KNOWLEDGE_NODES.find((n) => n.id === edge.target);
                  if (!sourceNode || !targetNode) return null;

                  const isConnected =
                    edge.source === selectedNodeId || edge.target === selectedNodeId;

                  // Compute midpoint for relationship label
                  const midX = (sourceNode.x + targetNode.x) / 2;
                  const midY = (sourceNode.y + targetNode.y) / 2;

                  return (
                    <g key={idx}>
                      <line
                        x1={sourceNode.x}
                        y1={sourceNode.y}
                        x2={targetNode.x}
                        y2={targetNode.y}
                        stroke={isConnected ? '#06B6D4' : '#CBD5E1'}
                        strokeWidth={isConnected ? 2.5 : 1.2}
                        strokeDasharray={isConnected ? 'none' : '3 3'}
                        markerEnd={isConnected ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                        className="transition-all duration-300"
                      />
                      {isConnected && (
                        <text
                          x={midX}
                          y={midY - 6}
                          fill="#0F172A"
                          fontSize="9"
                          fontFamily="Plus Jakarta Sans, sans-serif"
                          fontWeight="600"
                          textAnchor="middle"
                          className="bg-white"
                        >
                          {edge.relationship}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Nodes */}
                {filteredNodes.map((node) => {
                  const isSelected = selectedNodeId === node.id;
                  const colors = getCategoryColor(node.category);
                  const radius = isSelected ? 32 : 26;

                  return (
                    <g
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className="cursor-pointer group"
                    >
                      {/* Outer pulse circle for selected node */}
                      {isSelected && (
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={radius + 8}
                          fill="none"
                          stroke="#06B6D4"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          opacity="0.75"
                        />
                      )}

                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={radius}
                        fill={isSelected ? '#0A192F' : colors.fill}
                        stroke={isSelected ? '#06B6D4' : colors.stroke}
                        strokeWidth={isSelected ? 3 : 1.5}
                        className="transition-all duration-200 group-hover:scale-105"
                      />

                      {/* Icon or Monogram */}
                      <text
                        cx={node.x}
                        cy={node.y}
                        x={node.x}
                        y={node.y + 4}
                        fill={isSelected ? '#06B6D4' : colors.text}
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="IBM Plex Mono, monospace"
                        textAnchor="middle"
                      >
                        {node.category === 'model_output'
                          ? 'AI'
                          : node.category === 'waveform_biomarker'
                          ? 'ECG'
                          : node.category === 'clinical_phenotype'
                          ? 'EHR'
                          : node.category === 'guideline'
                          ? 'GL'
                          : 'PATH'}
                      </text>

                      {/* Node Label underneath */}
                      <text
                        x={node.x}
                        y={node.y + radius + 15}
                        fill={isSelected ? '#0A192F' : '#334155'}
                        fontSize="11"
                        fontWeight={isSelected ? '700' : '500'}
                        fontFamily="Plus Jakarta Sans, sans-serif"
                        textAnchor="middle"
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="p-3 bg-white border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0A192F] border border-cyan-400 inline-block" />
                  Model Output
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-100 border border-rose-500 inline-block" />
                  Pathophysiology
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-100 border border-sky-500 inline-block" />
                  ECG Biomarker
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-100 border border-emerald-500 inline-block" />
                  ACC/AHA Guideline
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Force layout rendered in 2D Euclidean embedding
              </span>
            </div>
          </div>

          {/* Secondary Area: Selected Node Details & Citations (4 Cols) */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            {selectedNode ? (
              <div className="space-y-6">
                <div>
                  <div className="text-xs font-semibold tracking-wide uppercase text-cyan-700 mb-1">
                    {selectedNode.category.replace('_', ' ')}
                  </div>
                  <h3 className="text-xl font-bold text-[#0A192F]">
                    {selectedNode.label}
                  </h3>
                  <div className="mt-1 text-xs text-slate-500">
                    Evidence Level: <strong className="text-slate-800">{selectedNode.evidenceGrade}</strong>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Consensus Clinical Definition
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {selectedNode.definition}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Source Provenance & Calibration
                  </h4>
                  <p className="text-xs text-slate-600 bg-white p-3 rounded border border-slate-200">
                    {selectedNode.provenance}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Peer-Reviewed Literature Citations
                  </h4>
                  <div className="space-y-2">
                    {selectedNode.citations.map((cite, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 rounded border border-slate-100 text-xs text-slate-600 leading-relaxed flex items-start gap-2"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-cyan-700 shrink-0 mt-0.5" />
                        <span>{cite}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Connected Relationships ({connectedEdges.length})
                  </h4>
                  <div className="space-y-2 text-xs">
                    {connectedEdges.map((edge, idx) => {
                      const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
                      const otherNode = KNOWLEDGE_NODES.find((n) => n.id === otherId);
                      if (!otherNode) return null;

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedNodeId(otherNode.id)}
                          className="p-2.5 rounded-lg border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50/20 cursor-pointer transition-colors"
                        >
                          <div className="font-semibold text-slate-900">{otherNode.label}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {edge.relationship}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Select a node from the map to inspect its evidence provenance.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
