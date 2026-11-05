import React from 'react';
import { CustomerRequest, EvidenceItem } from '../types';
import { X, ShieldCheck, FileText, CheckCircle2, AlertTriangle, ArrowRight, Zap, Hash } from 'lucide-react';

interface EvidenceModalProps {
  request: CustomerRequest | null;
  evidenceItems: EvidenceItem[];
  onClose: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({ request, evidenceItems, onClose }) => {
  if (!request) return null;

  const requestEvidence = evidenceItems.filter((e) => e.request_id === request.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Audit Trail & Evidence Dossier
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
                  {request.id}
                </span>
              </h3>
              <p className="text-xs text-slate-400">{request.customer_name}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* 1. Customer Statements */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Customer Statement & Clarification
            </span>
            <p className="text-slate-200 leading-relaxed font-normal text-sm">
              "{request.original_message}"
            </p>
            {request.updated_message && request.updated_message !== request.original_message && (
              <div className="mt-3 p-2.5 rounded bg-purple-950/40 border border-purple-800/40 text-purple-300">
                <span className="font-semibold text-purple-400 block mb-0.5">Customer Clarification Addendum:</span>
                {request.updated_message.split('\n').slice(1).join(' ')}
              </div>
            )}
          </div>

          {/* 2. Extracted Requirements vs Outcome */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Extracted Technical Specifications
              </span>
              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Voltage:</span>
                  <span className="text-amber-300 font-bold">{request.extracted_voltage ? `${request.extracted_voltage}V` : 'Unknown'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Connector:</span>
                  <span className="text-sky-300 font-bold">{request.extracted_connector || 'Unknown'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Minimum Wattage:</span>
                  <span className="text-emerald-300 font-bold">{request.extracted_min_wattage ? `≥ ${request.extracted_min_wattage}W` : 'Unknown'}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Final Decision Outcome
                </span>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-tight ${
                    request.final_outcome === 'DISPATCH'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {request.final_outcome || request.status}
                  </span>
                  {request.selected_part_id && (
                    <span className="font-mono text-xs text-emerald-400 font-bold">
                      Selected: {request.selected_part_id}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {request.outcome_reason || 'In evaluation.'}
                </p>
              </div>
            </div>
          </div>

          {/* 3. Verifiable Evidence Items */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Verifiable Evidence Records ({requestEvidence.length})
            </span>
            <div className="space-y-2">
              {requestEvidence.length === 0 ? (
                <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800 text-slate-500 text-center">
                  No individual evidence records logged yet.
                </div>
              ) : (
                requestEvidence.map((ev) => (
                  <div key={ev.id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 font-mono">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-sky-400 uppercase text-[10px] bg-slate-800 px-2 py-0.5 rounded">
                        {ev.source_type}
                      </span>
                      {ev.source_reference && (
                        <span className="text-[10px] text-slate-400">Ref: {ev.source_reference}</span>
                      )}
                    </div>
                    <p className="text-slate-200 mt-1 font-sans text-xs">
                      {ev.evidence_text}
                    </p>
                    {ev.interpretation && (
                      <p className="text-[11px] text-slate-400 mt-1 italic font-sans">
                        &rarr; {ev.interpretation}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex justify-end bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
