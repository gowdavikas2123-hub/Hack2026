import React, { useState } from 'react';
import { CustomerRequest, PartCatalogueItem } from '../types';
import { Activity, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, UserCheck, Clock, Zap } from 'lucide-react';

interface DecisionMonitorProps {
  requests: CustomerRequest[];
  catalogue: PartCatalogueItem[];
}

export const DecisionMonitor: React.FC<DecisionMonitorProps> = ({ requests, catalogue }) => {
  const [selectedRequestId, setSelectedRequestId] = useState<string>(requests[0]?.id || 'REQ-001');

  const activeRequest = requests.find((r) => r.id === selectedRequestId) || requests[0];

  const getWorkflowStages = (r?: CustomerRequest) => {
    if (!r) return [];

    const isProcessed = r.status === 'DISPATCHED' || r.status === 'HUMAN_REVIEW';
    const hasClarification = !!r.updated_message;
    const isDispatched = r.status === 'DISPATCHED';

    return [
      {
        step: 1,
        title: 'Request Received',
        desc: `Inbound message from ${r.customer_name}`,
        status: 'COMPLETED',
        detail: `Message: "${r.original_message}"`,
      },
      {
        step: 2,
        title: 'Specifications Extracted',
        desc: 'Voltage, connector & minimum wattage parsed',
        status: r.status !== 'PENDING' ? 'COMPLETED' : 'PENDING',
        detail: r.extracted_voltage
          ? `Voltage: ${r.extracted_voltage}V | Connector: ${r.extracted_connector || 'None'} | Min Wattage: ${r.extracted_min_wattage || 'None'}W`
          : 'Pending LLM analysis',
      },
      {
        step: 3,
        title: 'Catalogue Inspected',
        desc: '12 workshop candidate parts evaluated',
        status: r.status !== 'PENDING' ? 'COMPLETED' : 'PENDING',
        detail: 'Queried catalogue snapshots and compatibility prose specifications.',
      },
      {
        step: 4,
        title: 'Clarification Handled',
        desc: hasClarification ? 'Scripted customer feedback obtained' : 'No clarification needed / unscripted',
        status: hasClarification ? 'COMPLETED' : r.status === 'CLARIFICATION_REQUIRED' ? 'ACTIVE' : 'SKIPPED',
        detail: hasClarification
          ? `Clarification: ${r.updated_message?.split('\n').slice(1).join(' ')}`
          : 'Specifications sufficient or unscripted.',
      },
      {
        step: 5,
        title: 'Deterministic Compatibility Checked',
        desc: 'Evaluated voltage, connector, and wattage inequality',
        status: isProcessed ? 'COMPLETED' : r.status === 'STOCK_CHECK' ? 'ACTIVE' : 'PENDING',
        detail: 'Enforced Python rules: voltage exact match, connector match, part_wattage >= requested_min_wattage.',
      },
      {
        step: 6,
        title: 'Authoritative Warehouse Stock Verified',
        desc: 'Aged snapshots queried against physical warehouse bins',
        status: isProcessed ? 'COMPLETED' : 'PENDING',
        detail: 'Guaranteed no dispatch on outdated aged snapshots without authoritative confirmation.',
      },
      {
        step: 7,
        title: 'Decision Engine Evaluation',
        desc: `Outcome: ${r.final_outcome || 'Pending'}`,
        status: isProcessed ? 'COMPLETED' : 'PENDING',
        detail: r.outcome_reason || 'Evaluating candidates against least excess wattage & stock reliability.',
      },
      {
        step: 8,
        title: isDispatched ? 'Simulated Dispatch Executed' : 'Human Review Escalated',
        desc: isDispatched ? `Part ${r.selected_part_id} Dispatched` : 'Escalated to workshop technician',
        status: isProcessed ? 'COMPLETED' : 'PENDING',
        detail: isDispatched
          ? `Idempotency verified. Consumed 1 unit from active inventory ledger.`
          : `Escalated with full audit reasoning: ${r.outcome_reason || 'N/A'}`,
      },
    ];
  };

  const stages = getWorkflowStages(activeRequest);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            AI Decision Monitor: 8-Stage Agentic Workflow
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Transparent execution trace showing specification extraction, clarification, verification, and reasoning.
          </p>
        </div>

        {/* Request Selector Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {requests.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRequestId(r.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                selectedRequestId === r.id
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {r.id}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {/* Selected Request Header Info */}
        {activeRequest && (
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <span className="font-mono text-xs text-sky-400 font-bold block">{activeRequest.id} &bull; {activeRequest.customer_name}</span>
              <p className="text-xs text-slate-300 mt-0.5 italic">"{activeRequest.original_message}"</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-slate-400">Terminal Outcome:</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                activeRequest.final_outcome === 'DISPATCH'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : activeRequest.final_outcome === 'HUMAN_REVIEW'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {activeRequest.final_outcome || 'In Progress'}
              </span>
            </div>
          </div>
        )}

        {/* 8-Stage Timeline */}
        <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {stages.map((stage) => {
            const isCompleted = stage.status === 'COMPLETED';
            const isActive = stage.status === 'ACTIVE';
            const isSkipped = stage.status === 'SKIPPED';

            let dotColor = 'bg-slate-800 border-slate-700 text-slate-500';
            if (isCompleted) dotColor = 'bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/30';
            else if (isActive) dotColor = 'bg-sky-500 border-sky-400 text-white animate-pulse shadow-md shadow-sky-500/30';
            else if (isSkipped) dotColor = 'bg-slate-800 border-slate-700 text-slate-500';

            return (
              <div key={stage.step} className="relative group">
                <div
                  className={`absolute -left-6 top-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${dotColor}`}
                >
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : stage.step}
                </div>

                <div className="bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-xl p-3.5 transition">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
                      Stage {stage.step}: {stage.title}
                    </h4>
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                        isCompleted
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                          : isActive
                          ? 'bg-sky-950/60 text-sky-400 border border-sky-800/40'
                          : 'bg-slate-800/60 text-slate-500'
                      }`}
                    >
                      {stage.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">{stage.desc}</p>
                  <p className="text-xs font-mono text-slate-300 mt-2 p-2 rounded bg-slate-950/70 border border-slate-800/60">
                    {stage.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
