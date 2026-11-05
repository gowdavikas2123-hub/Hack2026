import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import {
  Batch,
  CustomerRequest,
  PartCatalogueItem,
  ToolCallLog,
  EvidenceItem,
  HumanReviewRecord,
  SpendingSummary
} from './types';
import { Navbar, NavTabId } from './components/Navbar';
import { DashboardView } from './components/views/DashboardView';
import { NewRequestView } from './components/views/NewRequestView';
import { AllRequestsView } from './components/views/AllRequestsView';
import { AgentActivityView } from './components/views/AgentActivityView';
import { InventoryView } from './components/views/InventoryView';
import { HumanReviewView } from './components/views/HumanReviewView';
import { EvidenceExplorerView } from './components/views/EvidenceExplorerView';
import { BudgetUsageView } from './components/views/BudgetUsageView';
import { BatchReportsView } from './components/views/BatchReportsView';
import { SettingsView } from './components/views/SettingsView';
import { EvidenceModal } from './components/EvidenceModal';
import { ChatbotAssistant } from './components/ChatbotAssistant';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTabId>('dashboard');
  const [batch, setBatch] = useState<Batch | null>(null);
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [catalogue, setCatalogue] = useState<PartCatalogueItem[]>([]);
  const [toolLogs, setToolLogs] = useState<ToolCallLog[]>([]);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [humanReviews, setHumanReviews] = useState<HumanReviewRecord[]>([]);
  const [spending, setSpending] = useState<SpendingSummary | null>(null);
  const [rememberedHistory, setRememberedHistory] = useState<CustomerRequest[]>([]);
  const [health, setHealth] = useState<{ llm_mode: string; tool_mode: string }>({
    llm_mode: 'mock',
    tool_mode: 'mock',
  });

  const [selectedRequestForAudit, setSelectedRequestForAudit] = useState<CustomerRequest | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const batchId = batch?.id || 'BATCH-001';

      const [batchRes, reqsRes, catRes, logsRes, evRes, hrRes, spendRes, healthRes, historyRes] = await Promise.all([
        api.getBatch(batchId).catch(() => null),
        api.getBatchRequests(batchId).catch(() => []),
        api.getCatalogue().catch(() => []),
        api.getToolLogs(batchId).catch(() => []),
        api.getBatchEvidence(batchId).catch(() => []),
        api.getHumanReview(batchId).catch(() => []),
        api.getBatchSpending(batchId).catch(() => null),
        api.getHealth().catch(() => ({ status: 'UNKNOWN', llm_mode: 'mock', tool_mode: 'mock' })),
        api.getRequestHistory().catch(() => []),
      ]);

      if (batchRes) setBatch(batchRes);
      setRequests(reqsRes);
      setCatalogue(catRes);
      setToolLogs(logsRes);
      setEvidenceItems(evRes);
      setHumanReviews(hrRes);
      if (spendRes) setSpending(spendRes);
      if (healthRes) setHealth(healthRes);
      if (historyRes) setRememberedHistory(historyRes);

      if (batchRes?.status === 'RUNNING') {
        setIsRunning(true);
      } else {
        setIsRunning(false);
      }
    } catch (err: any) {
      console.error('Error refreshing dashboard data:', err);
    }
  }, [batch?.id]);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Polling for live updates when running
  useEffect(() => {
    let interval: any = null;
    if (batch?.status === 'RUNNING') {
      interval = setInterval(() => {
        fetchDashboardData();
      }, 1500);
    } else {
      interval = setInterval(() => {
        fetchDashboardData();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [batch?.status, fetchDashboardData]);

  const handleStartBatch = async () => {
    try {
      setIsRunning(true);
      setErrorBanner(null);
      await api.runBatch(batch?.id || 'BATCH-001');
      await fetchDashboardData();
    } catch (err: any) {
      setErrorBanner(`Failed to start batch: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handlePauseBatch = async () => {
    try {
      await api.pauseBatch(batch?.id || 'BATCH-001');
      await fetchDashboardData();
    } catch (err: any) {
      setErrorBanner(`Failed to pause: ${err.message}`);
    }
  };

  const handleResumeBatch = async () => {
    try {
      setIsRunning(true);
      await api.resumeBatch(batch?.id || 'BATCH-001');
      await fetchDashboardData();
    } catch (err: any) {
      setErrorBanner(`Failed to resume: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleResetScenario = async () => {
    try {
      setIsResetting(true);
      setErrorBanner(null);
      await api.resetScenario();
      await fetchDashboardData();
    } catch (err: any) {
      setErrorBanner(`Failed to reset scenario: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleResolveHumanReview = async (
    requestId: string,
    action: string,
    partId?: string,
    notes?: string
  ) => {
    await api.resolveHumanReview(requestId, { action, part_id: partId, notes });
    await fetchDashboardData();
  };

  const pendingReviewCount = humanReviews.filter((h) => h.status === 'PENDING_HUMAN_ACTION').length;
  const availableStockCount = catalogue.reduce((acc, p) => acc + (p.current_stock > 0 ? p.current_stock : 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white font-sans antialiased">
      {/* Top Navbar with 10 Navigation Items */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingReviewCount={pendingReviewCount}
        totalRequestsCount={requests.length}
        availableStockCount={availableStockCount}
        isAgentRunning={isRunning || batch?.status === 'RUNNING'}
        llmMode={health.llm_mode}
        toolMode={health.tool_mode}
        onReset={handleResetScenario}
        isResetting={isResetting}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Error notification banner if any */}
        {errorBanner && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-600/50 text-rose-300 text-xs flex justify-between items-center animate-shake shadow-md">
            <span>{errorBanner}</span>
            <button
              onClick={() => setErrorBanner(null)}
              className="font-bold px-2 py-0.5 rounded hover:bg-rose-900 transition"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. Dashboard View */}
        {activeTab === 'dashboard' && (
          <DashboardView
            batch={batch}
            requests={requests}
            rememberedRequests={rememberedHistory}
            catalogue={catalogue}
            isRunning={isRunning || batch?.status === 'RUNNING'}
            onNavigate={setActiveTab}
            onStartBatch={handleStartBatch}
            onReset={handleResetScenario}
            onSelectRequestForAudit={(r) => setSelectedRequestForAudit(r)}
          />
        )}

        {/* 2. New Request View */}
        {activeTab === 'newRequest' && (
          <NewRequestView
            onSuccess={(newReq) => {
              fetchDashboardData();
            }}
            onViewAudit={(req) => {
              setSelectedRequestForAudit(req);
            }}
            onNavigate={setActiveTab}
          />
        )}

        {/* 3. All Requests View */}
        {activeTab === 'allRequests' && (
          <AllRequestsView
            requests={requests}
            rememberedRequests={rememberedHistory}
            onSelectRequestForAudit={(r) => setSelectedRequestForAudit(r)}
            onNavigate={setActiveTab}
          />
        )}

        {/* 4. AI Agent Activity View (9-Step Timeline & Live Tool Feeds) */}
        {activeTab === 'agentActivity' && (
          <AgentActivityView
            requests={requests}
            catalogue={catalogue}
            toolLogs={toolLogs}
            isRunning={isRunning || batch?.status === 'RUNNING'}
            onSelectRequestForAudit={(r) => setSelectedRequestForAudit(r)}
          />
        )}

        {/* 5. Inventory View */}
        {activeTab === 'inventory' && (
          <InventoryView catalogue={catalogue} />
        )}

        {/* 6. Human Review View */}
        {activeTab === 'humanReview' && (
          <HumanReviewView
            records={humanReviews}
            catalogue={catalogue}
            onResolve={handleResolveHumanReview}
            onSelectRequestForAudit={(reqId) => {
              const req = requests.find((r) => r.id === reqId);
              if (req) setSelectedRequestForAudit(req);
            }}
          />
        )}

        {/* 7. Evidence Explorer View */}
        {activeTab === 'evidence' && (
          <EvidenceExplorerView
            requests={requests}
            evidenceItems={evidenceItems}
            toolLogs={toolLogs}
          />
        )}

        {/* 8. Budget & Usage View */}
        {activeTab === 'budget' && (
          <BudgetUsageView
            spending={spending}
            batch={batch}
            requests={requests}
          />
        )}

        {/* 9. Batch Reports & Demonstration Mode View */}
        {activeTab === 'batchReports' && (
          <BatchReportsView
            batch={batch}
            requests={requests}
            catalogue={catalogue}
            toolLogs={toolLogs}
            isRunning={isRunning || batch?.status === 'RUNNING'}
            onStartBatch={handleStartBatch}
            onPauseBatch={handlePauseBatch}
            onResumeBatch={handleResumeBatch}
            onReset={handleResetScenario}
            onSelectRequestForAudit={(r) => setSelectedRequestForAudit(r)}
          />
        )}

        {/* 10. Settings View */}
        {activeTab === 'settings' && (
          <SettingsView
            llmMode={health.llm_mode}
            toolMode={health.tool_mode}
            onReset={handleResetScenario}
            isResetting={isResetting}
          />
        )}
      </main>

      {/* Audit Dossier Modal */}
      {selectedRequestForAudit && (
        <EvidenceModal
          request={selectedRequestForAudit}
          evidenceItems={evidenceItems}
          onClose={() => setSelectedRequestForAudit(null)}
        />
      )}

      {/* Floating Interactive Chatbot Copilot */}
      <ChatbotAssistant />

      {/* Professional Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Workshop Parts Desk &bull; National AI Hackathon Demonstration</span>
          <span className="font-mono text-[11px] text-slate-600">
            FastAPI &bull; SQLite Ledger &bull; OpenAI Python SDK &bull; React &bull; Tailwind CSS
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
