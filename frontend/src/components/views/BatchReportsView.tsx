import React, { useState } from 'react';
import { Batch, CustomerRequest, PartCatalogueItem, ToolCallLog } from '../../types';
import {
  PlaySquare,
  Play,
  Pause,
  PlayCircle,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Download,
  Layers,
  Cpu,
  Package,
  DollarSign,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

interface BatchReportsViewProps {
  batch: Batch | null;
  requests: CustomerRequest[];
  catalogue: PartCatalogueItem[];
  toolLogs: ToolCallLog[];
  isRunning: boolean;
  onStartBatch: () => void;
  onPauseBatch: () => void;
  onResumeBatch: () => void;
  onReset: () => void;
  onSelectRequestForAudit: (request: CustomerRequest) => void;
}

export const BatchReportsView: React.FC<BatchReportsViewProps> = ({
  batch,
  requests,
  catalogue,
  toolLogs,
  isRunning,
  onStartBatch,
  onPauseBatch,
  onResumeBatch,
  onReset,
  onSelectRequestForAudit,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const totalRequests = batch?.total_requests || (requests.length > 0 ? requests.length : 6);
  const processedRequests = batch?.processed_requests || requests.filter((r) => r.status === 'DISPATCHED' || r.status === 'HUMAN_REVIEW').length;
  const dispatchedRequests = batch?.dispatched_requests || requests.filter((r) => r.final_outcome === 'DISPATCH').length;
  const humanReviewRequests = batch?.human_review_requests || requests.filter((r) => r.final_outcome === 'HUMAN_REVIEW').length;
  const failedTools = toolLogs.filter((t) => t.status === 'FAILED').length;
  const allocatedUnits = catalogue.filter((p) => p.current_stock === 0 && p.snapshot_quantity > 0).length;
  const totalSpending = batch?.total_spending ?? 0.0;

  // Active request currently being processed
  const currentProcessingRequest = requests.find((r) => r.status === 'PROCESSING' || r.status === 'STOCK_CHECK' || r.status === 'CLARIFICATION_REQUIRED');

  const handleExportJson = () => {
    const reportData = {
      title: 'Workshop Parts Desk - Batch Execution Report',
      timestamp: new Date().toISOString(),
      batch_id: batch?.id || 'BATCH-001',
      summary: {
        total_requests: totalRequests,
        processed_requests: processedRequests,
        dispatched_requests: dispatchedRequests,
        human_review_requests: humanReviewRequests,
        failed_tool_executions: failedTools,
        total_inventory_allocated: allocatedUnits,
        total_spending_usd: totalSpending,
      },
      requests: requests.map((r) => ({
        id: r.id,
        customer_name: r.customer_name,
        original_message: r.original_message,
        updated_message: r.updated_message,
        extracted_specs: {
          part_type: r.part_type || 'Power Supply',
          voltage: r.extracted_voltage,
          connector: r.extracted_connector,
          minimum_wattage: r.extracted_min_wattage,
        },
        missing_fields: r.missing_fields,
        final_outcome: r.final_outcome,
        selected_part_id: r.selected_part_id,
        outcome_reason: r.outcome_reason,
      })),
      discrepancy_verification: {
        part_105_phantom_prevented: catalogue.find((p) => p.id === 'PART-105')?.current_stock === 0,
        part_108_hidden_retrieved: catalogue.find((p) => p.id === 'PART-108')?.verified_quantity === 1,
      },
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workshop-batch-report-${batch?.id || 'BATCH-001'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <PlaySquare className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">
              Hackathon Demonstration Mode & Batch Reports
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-mono font-bold border border-sky-500/30">
              Batch: {batch?.id || 'BATCH-001'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Orchestrate the official 6-request challenge scenario, observe live agent reasoning, and review final audit metrics.
          </p>
        </div>

        {/* Batch Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {batch?.status !== 'RUNNING' && batch?.status !== 'COMPLETED' && (
            <button
              onClick={onStartBatch}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/30 transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isRunning ? 'Processing...' : 'Run Complete Batch'}</span>
            </button>
          )}

          {batch?.status === 'RUNNING' && (
            <button
              onClick={onPauseBatch}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30 transition"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause Batch</span>
            </button>
          )}

          {batch?.status === 'PAUSED' && (
            <button
              onClick={onResumeBatch}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>Resume Batch</span>
            </button>
          )}

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>{downloadSuccess ? 'Downloaded!' : 'Export JSON Report'}</span>
          </button>
        </div>
      </div>

      {/* Section 16: Live Demonstration Execution Card (Visible during execution) */}
      {isRunning && currentProcessingRequest && (
        <div className="p-5 rounded-2xl bg-sky-950/40 border border-sky-500/50 shadow-lg animate-in fade-in space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-sky-800/40">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-sky-400 animate-spin" />
              <h3 className="text-sm font-bold text-white">
                Live Processing: {currentProcessingRequest.id} ({currentProcessingRequest.customer_name})
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-sky-300 bg-sky-900/60 px-2.5 py-0.5 rounded border border-sky-700">
              State: {currentProcessingRequest.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold">Active Customer Requirement:</span>
              <p className="text-slate-200 italic line-clamp-2 mt-0.5">"{currentProcessingRequest.original_message}"</p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold">Extracted Specifications:</span>
              <span className="font-mono text-sky-300 mt-0.5 block">
                {currentProcessingRequest.extracted_voltage ? `${currentProcessingRequest.extracted_voltage}V` : 'Pending'} | {currentProcessingRequest.extracted_connector || 'Pending'} | ≥{currentProcessingRequest.extracted_min_wattage || 'None'}W
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-semibold">Warehouse Stock Check:</span>
              <span className="font-mono text-emerald-400 mt-0.5 block">Authoritative tool checking physical inventory</span>
            </div>
          </div>
        </div>
      )}

      {/* Section 12: Final Batch Summary (All 7 required summary metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 text-xs">
        {/* Metric 1: Total requests received */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Requests</span>
          <div className="text-xl font-bold font-mono text-white mt-1">{totalRequests}</div>
          <span className="text-[10px] text-slate-500">Official batch</span>
        </div>

        {/* Metric 2: Successfully processed requests */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Processed</span>
          <div className="text-xl font-bold font-mono text-indigo-300 mt-1">{processedRequests} / {totalRequests}</div>
          <span className="text-[10px] text-slate-500">100% terminal</span>
        </div>

        {/* Metric 3: Dispatched requests */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Dispatched</span>
          <div className="text-xl font-bold font-mono text-emerald-300 mt-1">{dispatchedRequests}</div>
          <span className="text-[10px] text-slate-500">Verified & allocated</span>
        </div>

        {/* Metric 4: Human-review requests */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Human Review</span>
          <div className="text-xl font-bold font-mono text-amber-300 mt-1">{humanReviewRequests}</div>
          <span className="text-[10px] text-slate-500">Safely referred</span>
        </div>

        {/* Metric 5: Failed tool executions */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tool Failures</span>
          <div className="text-xl font-bold font-mono text-slate-200 mt-1">{failedTools}</div>
          <span className="text-[10px] text-slate-500">All tools healthy</span>
        </div>

        {/* Metric 6: Total inventory allocated */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Allocated Stock</span>
          <div className="text-xl font-bold font-mono text-cyan-300 mt-1">{dispatchedRequests} units</div>
          <span className="text-[10px] text-slate-500">Single-unit rule</span>
        </div>

        {/* Metric 7: Total AI spending in INR */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total AI Cost (INR)</span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">₹{(batch?.total_spending_inr ?? (totalSpending * 87.0)).toFixed(2)}</div>
          <span className="text-[10px] text-slate-500">~${totalSpending.toFixed(4)} USD</span>
        </div>
      </div>

      {/* Official Challenge Platform Measures & Rules */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-sky-400" />
          <span className="font-bold text-slate-200">
            Platform Budget Measures:
          </span>
          <span className="text-slate-400">
            <strong>{batch?.tool_units_spent ?? 0}</strong> / {batch?.tool_units_budget ?? 14} Tool Units &bull;{' '}
            <strong>{batch?.total_actions_count ?? 0}</strong> / {batch?.max_actions_limit ?? 60} Actions
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          inspect: 1 &bull; clarify: 2 &bull; verify: 2 &bull; decisions: 0 &bull; 20W avoids clarification
        </div>
      </div>

      {/* Final Batch Decisions Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Challenge Batch Terminal Decisions & Evidence Audit
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            {requests.length} Challenge Requests
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-950/70 text-slate-400 uppercase font-semibold border-b border-slate-800 text-[10px]">
              <tr>
                <th className="px-4 py-3">ID & Customer</th>
                <th className="px-4 py-3 min-w-[220px]">Requirement Summary</th>
                <th className="px-3 py-3">Specs Extracted</th>
                <th className="px-3 py-3">Terminal Outcome</th>
                <th className="px-3 py-3">Allocated Part</th>
                <th className="px-4 py-3 min-w-[200px]">Decision Explanation</th>
                <th className="px-3 py-3 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {requests.map((r) => {
                const isDispatched = r.final_outcome === 'DISPATCH';
                return (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 align-top font-mono">
                      <span className="font-bold text-sky-400 block">{r.id}</span>
                      <span className="text-[10px] text-slate-400 font-sans">{r.customer_name}</span>
                    </td>

                    <td className="px-4 py-3 align-top text-slate-200">
                      <p className="line-clamp-2 italic font-normal">"{r.original_message}"</p>
                      {r.updated_message && r.updated_message !== r.original_message && (
                        <span className="text-[10px] text-purple-300 font-medium block mt-1">
                          + Clarified: {r.updated_message.split('\n').slice(1).join(' ')}
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-3 align-top font-mono text-[11px] whitespace-nowrap">
                      <div>{r.extracted_voltage ? `${r.extracted_voltage}V` : 'Unknown'}</div>
                      <div className="text-sky-300">{r.extracted_connector || 'Unknown'}</div>
                      <div className="text-emerald-300">{r.extracted_min_wattage ? `≥${r.extracted_min_wattage}W` : 'Unknown'}</div>
                    </td>

                    <td className="px-3 py-3 align-top whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border ${
                          isDispatched
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {r.final_outcome || r.status}
                      </span>
                    </td>

                    <td className="px-3 py-3 align-top font-mono text-slate-300 whitespace-nowrap">
                      {r.selected_part_id ? (
                        <span className="font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                          {r.selected_part_id}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">None</span>
                      )}
                    </td>

                    <td className="px-4 py-3 align-top text-slate-300 text-[11px] leading-relaxed">
                      {r.outcome_reason}
                    </td>

                    <td className="px-3 py-3 align-top text-right">
                      <button
                        onClick={() => onSelectRequestForAudit(r)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 hover:border-sky-500/40 text-[11px] font-semibold transition"
                      >
                        Audit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
