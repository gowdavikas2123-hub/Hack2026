import React, { useState } from 'react';
import { CustomerRequest, EvidenceItem, ToolCallLog } from '../../types';
import {
  FileSearch,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Clock,
  Layers,
  FileText,
  UserCheck,
  Zap,
  Terminal,
  HelpCircle,
  Package
} from 'lucide-react';

interface EvidenceExplorerViewProps {
  requests: CustomerRequest[];
  evidenceItems: EvidenceItem[];
  toolLogs: ToolCallLog[];
}

export const EvidenceExplorerView: React.FC<EvidenceExplorerViewProps> = ({
  requests,
  evidenceItems,
  toolLogs,
}) => {
  const [selectedRequestId, setSelectedRequestId] = useState<string>(requests[0]?.id || 'REQ-001');

  const activeRequest = requests.find((r) => r.id === selectedRequestId) || requests[0];
  const requestEvidence = evidenceItems.filter((e) => e.request_id === activeRequest?.id);
  const requestTools = toolLogs.filter((t) => t.request_id === activeRequest?.id);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">
              Evidence Explorer & Audit Verification Module
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Transparent, verifiable audit trails connecting every decision to actual backend tool executions and customer statements.
          </p>
        </div>

        {/* Request selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
          <span className="text-xs text-slate-400 font-semibold mr-1">Select Request:</span>
          {requests.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRequestId(r.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition whitespace-nowrap ${
                r.id === activeRequest?.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {r.id}
            </button>
          ))}
        </div>
      </div>

      {activeRequest ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (5 cols): Case Overview & Extracted Specs */}
          <div className="lg:col-span-5 space-y-4">
            {/* Request Summary Card */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <span className="font-mono text-xs font-bold text-sky-400">{activeRequest.id}</span>
                  <h3 className="text-sm font-bold text-white">{activeRequest.customer_name}</h3>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-tight border ${
                    activeRequest.final_outcome === 'DISPATCH'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {activeRequest.final_outcome || activeRequest.status}
                </span>
              </div>

              {/* Inbound customer message */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  1. Inbound Customer Request
                </span>
                <p className="text-slate-200 italic font-normal leading-relaxed">
                  "{activeRequest.original_message}"
                </p>
                {activeRequest.updated_message && activeRequest.updated_message !== activeRequest.original_message && (
                  <div className="mt-2.5 p-2 rounded bg-purple-950/40 border border-purple-800/40 text-[11px] text-purple-300">
                    <strong className="text-purple-400 block mb-0.5">Clarification Addendum:</strong>
                    {activeRequest.updated_message.split('\n').slice(1).join(' ')}
                  </div>
                )}
              </div>

              {/* Extracted Specifications */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  2. Extracted Electrical & Physical Specs
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Voltage:</span>
                    <span className="font-bold text-amber-300">
                      {activeRequest.extracted_voltage ? `${activeRequest.extracted_voltage}V` : 'Unknown'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Wattage:</span>
                    <span className="font-bold text-emerald-300">
                      {activeRequest.extracted_min_wattage ? `≥ ${activeRequest.extracted_min_wattage}W` : 'Unknown'}
                    </span>
                  </div>
                  <div className="col-span-2 p-2 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Connector:</span>
                    <span className="font-bold text-sky-300 truncate block">
                      {activeRequest.extracted_connector || 'Unknown / Not established'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Final Decision & Explanation */}
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    3. Final Decision Explanation
                  </span>
                  {activeRequest.selected_part_id && (
                    <span className="font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded text-[11px]">
                      Part: {activeRequest.selected_part_id}
                    </span>
                  )}
                </div>
                <p className="text-slate-200 leading-relaxed font-sans">
                  {activeRequest.outcome_reason || 'Pending evaluation.'}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column (7 cols): Chronological Auditable Evidence Timeline */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Chronological Evidence Chain & Backend Tool Invocations
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {requestEvidence.length} Evidence Records
                </span>
              </div>

              {/* Timeline nodes */}
              <div className="relative pl-6 space-y-4 border-l-2 border-slate-800 ml-2">
                {requestEvidence.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    No evidence records logged yet for this request. Run the batch to populate audit history.
                  </div>
                ) : (
                  requestEvidence.map((ev, index) => {
                    const isDispatch = ev.source_type === 'dispatch';
                    const isClarif = ev.source_type === 'clarification';
                    const isReview = ev.source_type === 'human_review';
                    const isCustomer = ev.source_type === 'customer_message';

                    return (
                      <div key={ev.id || index} className="relative group">
                        {/* Timeline Bullet */}
                        <div
                          className={`absolute -left-[31px] top-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                            isDispatch
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                              : isReview
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : isClarif
                              ? 'bg-purple-500 text-white border-purple-400'
                              : 'bg-sky-500 text-white border-sky-400'
                          }`}
                        >
                          {index + 1}
                        </div>

                        {/* Evidence Card */}
                        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[11px] font-bold text-sky-400 uppercase">
                              Source: {ev.source_type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {ev.created_at ? new Date(ev.created_at).toLocaleTimeString() : 'Logged'}
                            </span>
                          </div>

                          <p className="text-slate-200 leading-relaxed font-sans font-normal">
                            "{ev.evidence_text}"
                          </p>

                          {ev.interpretation && (
                            <div className="pt-1.5 mt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
                              <strong className="text-slate-300">Auditor Interpretation:</strong> {ev.interpretation}
                            </div>
                          )}

                          {ev.source_reference && (
                            <span className="font-mono text-[10px] text-slate-500 block pt-0.5">
                              Ref ID: {ev.source_reference}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Tool Execution Logs specifically for this request */}
              {requestTools.length > 0 && (
                <div className="pt-4 border-t border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-sky-400" />
                    Associated Tool Call Audit Logs
                  </h4>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {requestTools.map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex justify-between items-center gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="font-bold text-sky-400 uppercase">{t.tool_name}</span>
                          {t.part_id && <span className="text-slate-400">Part: {t.part_id}</span>}
                        </div>
                        <span className="text-slate-400 text-[10px]">
                          {t.execution_time_ms.toFixed(1)}ms &bull; ${t.cost.toFixed(4)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800">
          No request selected.
        </div>
      )}
    </div>
  );
};
