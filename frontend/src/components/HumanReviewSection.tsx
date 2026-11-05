import React, { useState } from 'react';
import { HumanReviewRecord, PartCatalogueItem } from '../types';
import { UserCheck, AlertTriangle, CheckCircle, XCircle, ArrowRight, ShieldCheck, Wrench } from 'lucide-react';

interface HumanReviewSectionProps {
  records: HumanReviewRecord[];
  catalogue: PartCatalogueItem[];
  onResolve: (requestId: string, action: string, partId?: string, notes?: string) => Promise<void>;
}

export const HumanReviewSection: React.FC<HumanReviewSectionProps> = ({
  records,
  catalogue,
  onResolve,
}) => {
  const [selectedPartMap, setSelectedPartMap] = useState<Record<string, string>>({});
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [submittingMap, setSubmittingMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});

  const handleResolveAction = async (requestId: string, action: string) => {
    setSubmittingMap((prev) => ({ ...prev, [requestId]: true }));
    setErrorMap((prev) => ({ ...prev, [requestId]: '' }));
    try {
      await onResolve(
        requestId,
        action,
        selectedPartMap[requestId],
        notesMap[requestId] || (action === 'DISPATCH' ? 'Supervisor authorized resolution.' : 'Cancelled by supervisor.')
      );
    } catch (err: any) {
      setErrorMap((prev) => ({ ...prev, [requestId]: err.message || 'Resolution failed.' }));
    } finally {
      setSubmittingMap((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const pendingRecords = records.filter((r) => r.status === 'PENDING_HUMAN_ACTION');
  const resolvedRecords = records.filter((r) => r.status !== 'PENDING_HUMAN_ACTION');

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg p-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-400" />
            Human Review & Operator Intervention Escalations
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Safely refer ambiguous, incompatible, or zero-stock requests to workshop technicians with revalidation protection.
          </p>
        </div>
        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">
          {pendingRecords.length} Pending Attention
        </span>
      </div>

      {pendingRecords.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/60 text-xs">
          <CheckCircle className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
          No pending human escalation requests. All processed requests were automatically dispatched or already resolved.
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRecords.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-slate-950/70 border border-amber-500/40 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <span className="font-mono text-xs font-bold text-sky-400">{item.request_id}</span>
                  <h3 className="text-sm font-semibold text-white tracking-tight mt-0.5">{item.reason}</h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Escalated
                </span>
              </div>

              {/* Specific failure breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3 text-xs">
                {item.missing_info && (
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Missing Information
                    </span>
                    <span className="text-amber-300 font-mono">{item.missing_info}</span>
                  </div>
                )}
                {item.failed_checks && (
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Compatibility Failure
                    </span>
                    <span className="text-rose-300">{item.failed_checks}</span>
                  </div>
                )}
                {item.stock_issues && (
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Warehouse Stock Discrepancy / Shortage
                    </span>
                    <span className="text-amber-300">{item.stock_issues}</span>
                  </div>
                )}
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Recommended Action
                  </span>
                  <span className="text-sky-300">{item.recommended_action}</span>
                </div>
              </div>

              {/* Error feedback if safety revalidation rejects manual dispatch */}
              {errorMap[item.request_id] && (
                <div className="p-2.5 rounded bg-rose-950/60 border border-rose-600/60 text-xs text-rose-300 flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{errorMap[item.request_id]}</span>
                </div>
              )}

              {/* Operator Resolution Controls */}
              <div className="pt-3 border-t border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-1">
                  <select
                    value={selectedPartMap[item.request_id] || ''}
                    onChange={(e) =>
                      setSelectedPartMap((prev) => ({ ...prev, [item.request_id]: e.target.value }))
                    }
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 flex-1 max-w-[280px]"
                  >
                    <option value="">Select Part to Authorize Override...</option>
                    {catalogue.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.id}: {p.name} ({p.voltage}V, {p.connector}, {p.wattage}W, Stock: {p.current_stock})
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Operator resolution notes..."
                    value={notesMap[item.request_id] || ''}
                    onChange={(e) =>
                      setNotesMap((prev) => ({ ...prev, [item.request_id]: e.target.value }))
                    }
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 flex-1"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResolveAction(item.request_id, 'DISPATCH')}
                    disabled={submittingMap[item.request_id] || !selectedPartMap[item.request_id]}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
                    title="Revalidates technical specs & inventory before dispatching"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verify & Dispatch
                  </button>
                  <button
                    onClick={() => handleResolveAction(item.request_id, 'CANCEL')}
                    disabled={submittingMap[item.request_id]}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition disabled:opacity-40"
                  >
                    Cancel Request
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Previously resolved list */}
      {resolvedRecords.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-800">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Resolved Intervention History ({resolvedRecords.length})
          </h4>
          <div className="space-y-2">
            {resolvedRecords.map((r) => (
              <div
                key={r.id}
                className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 flex items-center justify-between text-xs font-mono"
              >
                <div>
                  <span className="text-sky-400 font-bold mr-2">{r.request_id}</span>
                  <span className="text-slate-300">{r.resolution_notes || r.reason}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">{r.resolved_by || 'Supervisor'}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      r.status === 'RESOLVED_DISPATCHED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {r.status.replace('RESOLVED_', '')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
