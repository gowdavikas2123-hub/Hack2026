import React, { useState } from 'react';
import {
  Batch,
  CustomerRequest,
  PartCatalogueItem
} from '../../types';
import {
  Inbox,
  CheckCircle2,
  UserCheck,
  Package,
  Layers,
  ArrowRight,
  Play,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle,
  HelpCircle,
  Search,
  Activity,
  History,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { NavTabId } from '../Navbar';

interface DashboardViewProps {
  batch: Batch | null;
  requests: CustomerRequest[];
  rememberedRequests?: CustomerRequest[];
  catalogue: PartCatalogueItem[];
  isRunning: boolean;
  onNavigate: (tab: NavTabId) => void;
  onStartBatch: () => void;
  onReset: () => void;
  onSelectRequestForAudit: (request: CustomerRequest) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  batch,
  requests,
  rememberedRequests = [],
  catalogue,
  isRunning,
  onNavigate,
  onStartBatch,
  onReset,
  onSelectRequestForAudit,
}) => {
  const [activityTab, setActivityTab] = useState<'batch' | 'history'>('batch');

  // Available stock calculation
  const totalStockUnits = catalogue.reduce(
    (acc, p) => acc + (p.current_stock > 0 ? p.current_stock : 0),
    0
  );

  // Compute AI Agent Status according to prompt section 2.D:
  // Options: Idle, Processing, Waiting for Clarification, Verifying Inventory, Completed, Encountered an Error
  const computeAgentStatus = (): {
    status: 'Idle' | 'Processing' | 'Waiting for Clarification' | 'Verifying Inventory' | 'Completed' | 'Encountered an Error';
    description: string;
    color: string;
    icon: any;
  } => {
    if (batch?.status === 'FAILED') {
      return {
        status: 'Encountered an Error',
        description: 'Batch encountered an execution failure or tool error.',
        color: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        icon: AlertTriangle,
      };
    }
    if (isRunning || batch?.status === 'RUNNING') {
      const clarifReq = requests.find((r) => r.status === 'CLARIFICATION_REQUIRED');
      if (clarifReq) {
        return {
          status: 'Waiting for Clarification',
          description: `Querying clarification tool for request ${clarifReq.id}`,
          color: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          icon: HelpCircle,
        };
      }
      const stockReq = requests.find((r) => r.status === 'STOCK_CHECK');
      if (stockReq) {
        return {
          status: 'Verifying Inventory',
          description: `Querying warehouse inventory verification for request ${stockReq.id}`,
          color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          icon: Search,
        };
      }
      return {
        status: 'Processing',
        description: 'Evaluating compatibility rules and executing deterministic dispatch.',
        color: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        icon: Activity,
      };
    }
    if (batch?.status === 'COMPLETED' || (batch?.processed_requests ?? 0) >= (batch?.total_requests ?? 6)) {
      return {
        status: 'Completed',
        description: 'All 6 customer requests successfully processed with terminal outcomes.',
        color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        icon: CheckCircle,
      };
    }
    return {
      status: 'Idle',
      description: 'System ready. Awaiting custom requests or batch run trigger.',
      color: 'bg-slate-700/60 text-slate-300 border-slate-600',
      icon: Clock,
    };
  };

  const agentState = computeAgentStatus();
  const AgentIcon = agentState.icon;

  // Processing Overview Percentages
  const total = batch?.total_requests || (requests.length > 0 ? requests.length : 6);
  const dispatched = batch?.dispatched_requests ?? requests.filter((r) => r.status === 'DISPATCHED').length;
  const humanReview = batch?.human_review_requests ?? requests.filter((r) => r.status === 'HUMAN_REVIEW').length;
  const processed = batch?.processed_requests ?? (dispatched + humanReview);
  const pending = Math.max(0, total - processed);

  const dispatchedPct = Math.round((dispatched / total) * 100);
  const humanReviewPct = Math.round((humanReview / total) * 100);
  const pendingPct = Math.max(0, 100 - dispatchedPct - humanReviewPct);

  // Recent 4 customer requests
  const recentRequests = [...requests].slice(0, 4);

  return (
    <div className="space-y-6">
      {/* 2.D: AI Agent Status Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${agentState.color} flex-shrink-0`}>
            <AgentIcon className={`w-5 h-5 ${isRunning ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">AI Agent Status:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-tight border ${agentState.color}`}>
                {agentState.status}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">{agentState.description}</p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-2">
          {batch?.status !== 'COMPLETED' && (
            <button
              onClick={onStartBatch}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/30 transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? 'Processing Batch...' : 'Run Challenge Batch'}</span>
            </button>
          )}
          <button
            onClick={() => onNavigate('newRequest')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>New Request</span>
          </button>
        </div>
      </div>

      {/* 2.A: Overview Cards (Exactly the 6 requested) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Requests */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Requests</span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">{total}</div>
            <span className="text-[10px] text-slate-500">In challenge scenario</span>
          </div>
        </div>

        {/* Card 2: Processed Requests */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Processed</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-indigo-300">
              {processed} <span className="text-xs text-slate-500 font-normal">/ {total}</span>
            </div>
            <span className="text-[10px] text-slate-500">{Math.round((processed / total) * 100)}% evaluated</span>
          </div>
        </div>

        {/* Card 3: Successfully Dispatched (Green) */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 shadow-sm shadow-emerald-500/5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Dispatched</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-300">{dispatched}</div>
            <span className="text-[10px] text-slate-500">Compatible & in stock</span>
          </div>
        </div>

        {/* Card 4: Requires Human Review (Orange) */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 shadow-sm shadow-amber-500/5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Human Review</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-amber-300">{humanReview}</div>
            <span className="text-[10px] text-slate-500">Safely escalated</span>
          </div>
        </div>

        {/* Card 5: Available Inventory */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Available Stock</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-cyan-300">
              {totalStockUnits} <span className="text-xs text-slate-500 font-normal">/ {catalogue.length || 12}</span>
            </div>
            <span className="text-[10px] text-slate-500">Active ledger units</span>
          </div>
        </div>

        {/* Card 6: Total AI Processing Cost in Indian Rupees */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">AI Cost (INR)</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <span className="text-xs font-bold font-mono">₹</span>
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-300">
              ₹{(batch?.total_spending_inr ?? ((batch?.total_spending ?? 0) * 87.0)).toFixed(2)}
            </div>
            <span className="text-[10px] text-slate-500">
              ~${(batch?.total_spending ?? 0).toFixed(4)} USD
            </span>
          </div>
        </div>
      </div>

      {/* Official Challenge Platform Measures & Tool Units Tracker */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span className="font-bold text-white text-xs">
              Official Challenge Platform Measures & Constraints
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-mono font-bold border border-sky-500/30">
              14 Tool Units Budget
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-slate-400">
              Tool Units Spent:{' '}
              <strong className="text-sky-300 font-bold">{batch?.tool_units_spent ?? 0}</strong> / {batch?.tool_units_budget ?? 14}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              Actions:{' '}
              <strong className="text-amber-300 font-bold">{batch?.total_actions_count ?? 0}</strong> / {batch?.max_actions_limit ?? 60} max
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Inspect Tool:</span>
            <span className="font-mono font-bold text-sky-400">1 unit</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Clarify Tool:</span>
            <span className="font-mono font-bold text-purple-400">2 units</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Verify Warehouse:</span>
            <span className="font-mono font-bold text-cyan-400">2 units</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Decisions:</span>
            <span className="font-mono font-bold text-emerald-400">0 units (Free)</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-400 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>
              <strong>Wattage Optimization:</strong> Verified 20 W part avoids customer wattage clarification when voltage & connector match (saves 2 tool units).
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
            Decisions are irreversible &bull; Zero outcome credit for unclosed requests
          </span>
        </div>
      </div>

      {/* Grid: 2.C Processing Overview & 2.B Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2.C: Processing Overview (Graphical Representation) */}
        <div className="lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                Processing Overview
              </h3>
              <span className="text-[11px] font-mono text-slate-400">{processed}/{total} Handled</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Real-time distribution of terminal outcomes across the challenge batch.
            </p>

            {/* Segmented Bar */}
            <div className="w-full bg-slate-800 rounded-xl h-4 overflow-hidden flex p-0.5 gap-0.5 mb-4">
              {dispatchedPct > 0 && (
                <div
                  className="bg-emerald-500 h-full rounded-l-lg transition-all duration-500"
                  style={{ width: `${dispatchedPct}%` }}
                  title={`Dispatched: ${dispatched}`}
                />
              )}
              {humanReviewPct > 0 && (
                <div
                  className="bg-amber-500 h-full transition-all duration-500"
                  style={{ width: `${humanReviewPct}%` }}
                  title={`Human Review: ${humanReview}`}
                />
              )}
              {pendingPct > 0 && (
                <div
                  className="bg-slate-700 h-full rounded-r-lg transition-all duration-500"
                  style={{ width: `${pendingPct}%` }}
                  title={`Pending: ${pending}`}
                />
              )}
            </div>

            {/* Legend Stats */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-300">Successfully Dispatched</span>
                </div>
                <span className="font-mono font-bold text-emerald-400">{dispatched} ({dispatchedPct}%)</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-slate-300">Requires Human Review</span>
                </div>
                <span className="font-mono font-bold text-amber-400">{humanReview} ({humanReviewPct}%)</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                  <span className="text-slate-400">Pending Execution</span>
                </div>
                <span className="font-mono font-bold text-slate-400">{pending} ({pendingPct}%)</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Enforces two terminal outcomes only</span>
            <button
              onClick={() => onNavigate('batchReports')}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
            >
              <span>Batch Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 2.B: Recent Activity & Remembered Request Memory */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-white">
                  Customer Requests & Outcomes
                </h3>
              </div>

              {/* Tab Selector: Active Batch vs All Remembered History */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setActivityTab('batch')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    activityTab === 'batch'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Active Batch ({requests.length})
                </button>
                <button
                  onClick={() => setActivityTab('history')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                    activityTab === 'history'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <History className="w-3 h-3" />
                  <span>Remembered Memory ({rememberedRequests.length})</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              {activityTab === 'batch'
                ? 'Current batch customer requests, electrical extraction results, and deterministic decisions.'
                : 'Permanent memory recording all customer requests submitted across sessions, runs, and scenario resets.'}
            </p>

            {(() => {
              const activeList = activityTab === 'batch' ? recentRequests : rememberedRequests.slice(0, 5);
              if (activeList.length === 0) {
                return (
                  <div className="p-8 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/60 text-xs">
                    {activityTab === 'batch'
                      ? 'No customer requests loaded. Click "Run Challenge Batch" or "Reset Demo" to populate.'
                      : 'No remembered requests found in persistent ledger.'}
                  </div>
                );
              }

              return (
                <div className="space-y-2.5">
                  {activeList.map((r) => {
                    const isDispatched = r.final_outcome === 'DISPATCH';
                    const isReview = r.final_outcome === 'HUMAN_REVIEW';
                    const costInr = r.cost_inr ? r.cost_inr.toFixed(2) : ((r.cost_usd || 0.0003) * 87.0).toFixed(2);
                    return (
                      <div
                        key={r.id}
                        className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-sky-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                              {r.id}
                            </span>
                            <span className="font-semibold text-slate-200">{r.customer_name}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border ${
                                isDispatched
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : isReview
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-slate-700/60 text-slate-300 border-slate-600'
                              }`}
                            >
                              {r.final_outcome || r.status}
                            </span>
                            {r.selected_part_id && (
                              <span className="font-mono text-[11px] text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                                Part: {r.selected_part_id}
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-emerald-400/90 font-semibold bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-900/30">
                              ₹{costInr}
                            </span>
                          </div>
                          <p className="text-slate-300 line-clamp-1 italic font-normal">
                            "{r.original_message}"
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => onSelectRequestForAudit(r)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 hover:border-sky-500/40 text-[11px] font-semibold transition"
                          >
                            View Audit
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Deterministic compatibility rules: Exact voltage & connector match, wattage &ge; requested</span>
            <button
              onClick={() => onNavigate('newRequest')}
              className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
            >
              <span>Submit Custom Request</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
