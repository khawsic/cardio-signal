/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Shell } from './components/layout/Shell';
import { OverviewPage } from './pages/OverviewPage';
import { ClinicalAnalysisPage } from './pages/ClinicalAnalysisPage';
import { EcgLaboratoryPage } from './pages/EcgLaboratoryPage';
import { MultimodalResearchPage } from './pages/MultimodalResearchPage';
import { KnowledgeGraphPage } from './pages/KnowledgeGraphPage';
import { ReportsEvaluationPage } from './pages/ReportsEvaluationPage';

const AppContent: React.FC = () => {
  const { currentPage } = useApp();

  return (
    <Shell>
      {currentPage === 'overview' && <OverviewPage />}
      {currentPage === 'clinical' && <ClinicalAnalysisPage />}
      {currentPage === 'ecg' && <EcgLaboratoryPage />}
      {currentPage === 'multimodal' && <MultimodalResearchPage />}
      {currentPage === 'knowledge' && <KnowledgeGraphPage />}
      {currentPage === 'reports' && <ReportsEvaluationPage />}
    </Shell>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
