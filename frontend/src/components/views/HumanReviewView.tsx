import React, { useState } from 'react';
import { HumanReviewRecord, PartCatalogueItem } from '../../types';
import {
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ShieldCheck,
  Send,
  FileText,
  Clock,
  ArrowRight,
  Info
} from 'lucide-react';

interface HumanReviewViewProps {
  records: HumanReviewRecord[];
  catalogue: PartCatalogueItem[];
  onResolve: (requestId: string, action: string, partId?: string, notes?: string) => Promise<void>;
  onSelectRequestForAudit?: (requestId: string) => void;
}

export const HumanReviewView: React.FC<HumanReviewViewProps> = ({
  records,
  catalogue,
  onResolve,
  onSelectRequestForAudit,
}) => {
  const [selectedPartMap, setSelectedPartMap] = useState<Record<string, string>>({});
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [operatorMap, setOperatorMap] = useState<Record<string, string>>({});
  const [submittingMap, setSubmittingMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});

  const pendingRecords = records.filter((r) => r.status === 'PENDING_HUMAN_ACTION');
  const resolvedRecords = records.filter((r) => r.status !== 'PENDING_HUMAN_ACTION');

  const handleAction = async (requestId: string, action: string) => {
    setSubmittingMap((prev) => ({ ...prev, [requestId]: true }));
    setErrorMap((prev) => ({ ...prev, [requestId]: '' }));

    const operator = operatorMap[requestId] || 'Workshop Supervisor';
    const notes = notesMap[requestId] || (action === 'DISPATCH' ? 'Supervisor authorized manual dispatch.' : 'Request cancelled by supervisor.');
    const partId = selectedPartMap[requestId];

    try {
      await onResolve(requestId, action, partId, notes);
    } catch (err: any) {
      setErrorMap((prev) => ({ ...prev, [requestId]: err.message || 'Resolution failed.' }));
    } finally {
      setSubmittingMap((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              Human Review & Operator Intervention Module
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950/60 text-amber-300 font-mono font-bold border border-amber-800/40">
              {pendingRecords.length} Pending
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Safely refer requests to human engineers when specifications cannot be established, compatibility fails, or stock is unavailable.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Total Escalations:</span>
          <span className="font-mono font-bold text-slate-200 bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
            {records.length}
          </span>
        </div>
      </div>

      {/* Pending Reviews Section */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <span>Active Cases Awaiting Operator Action</span>
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        </h3>

        {pendingRecords.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl text-xs text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-400/60 mx-auto mb-2" />
            <strong className="text-white block text-sm mb-1">No Pending Escalations</strong>
            <span>All customer requests processed safely. No ambiguous, incompatible, or stock-depleted cases require attention.</span>
          </div>
        ) : (
          pendingRecords.map((item) => (
            <div
              key={item.id}
              className="p-6 rounded-2xl bg-slate-900/95 border border-amber-500/40 shadow-lg space-y-4"
            >
              {/* Header row */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-sky-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {item.request_id}
                  </span>
                  <span className="text-xs font-bold text-rose-300 bg-rose-950/40 border border-rose-800/40 px-2.5 py-0.5 rounded-full uppercase">
                    Escalated: {item.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <span className="text-[11px] text-slate-400 font-mono">
                  Logged: {new Date(item.created_at).toLocaleTimeString()}
                </span>
              </div>

              {/* Grid: Reason & Recommended Action */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Reason for Review */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Reason for Human Review
                  </span>
                  <p className="text-rose-300 font-semibold leading-relaxed">
                    {item.reason}
                  </p>
                </div>

                {/* Recommended Next Action */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Recommended Operator Action
                  </span>
                  <p className="text-sky-300 font-medium leading-relaxed">
                    {item.recommended_action}
                  </p>
                </div>
              </div>

              {/* Specific Failure Breakdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {item.missing_info && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Missing Specs
                    </span>
                    <span className="text-amber-300 font-mono font-semibold">{item.missing_info}</span>
                  </div>
                )}

                {item.failed_checks && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Compatibility Failure
                    </span>
                    <span className="text-rose-300 font-mono">{item.failed_checks}</span>
                  </div>
                )}

                {item.stock_issues && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Stock Verification Issue
                    </span>
                    <span className="text-cyan-300 font-mono">{item.stock_issues}</span>
                  </div>
                )}
              </div>

              {/* Error Alert if action failed safety check */}
              {errorMap[item.request_id] && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600/50 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>
                    <strong>Safety Revalidation Blocked Action:</strong> {errorMap[item.request_id]}
                  </span>
                </div>
              )}

              {/* Operator Action Console */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Operator Resolution Console
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Operator Name
                    </label>
                    <input
                      type="text"
                      value={operatorMap[item.request_id] || ''}
                      onChange={(e) => setOperatorMap((prev) => ({ ...prev, [item.request_id]: e.target.value }))}
                      placeholder="e.g. Lead Engineer"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Manual Part Selection (For Dispatch)
                    </label>
                    <select
                      value={selectedPartMap[item.request_id] || ''}
                      onChange={(e) => setSelectedPartMap((prev) => ({ ...prev, [item.request_id]: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                    >
                      <option value="">-- Choose Catalogue Part --</option>
                      {catalogue.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.id}: {p.name} ({p.voltage}V, {p.connector}, {p.wattage}W) [Stock: {p.current_stock}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Resolution Notes
                    </label>
                    <input
                      type="text"
                      value={notesMap[item.request_id] || ''}
                      onChange={(e) => setNotesMap((prev) => ({ ...prev, [item.request_id]: e.target.value }))}
                      placeholder="e.g. Verified with shop floor"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => handleAction(item.request_id, 'CANCEL')}
                    disabled={submittingMap[item.request_id]}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Request</span>
                  </button>

                  <button
                    onClick={() => handleAction(item.request_id, 'DISPATCH')}
                    disabled={submittingMap[item.request_id] || !selectedPartMap[item.request_id]}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{submittingMap[item.request_id] ? 'Revalidating Safety...' : 'Approve & Dispatch Part'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Previously Resolved Escalations */}
      {resolvedRecords.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Resolved Escalations History ({resolvedRecords.length})
          </h3>

          <div className="space-y-2">
            {resolvedRecords.map((r) => (
              <div
                key={r.id}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sky-400">{r.request_id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      r.status === 'RESOLVED_DISPATCHED'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-700/60 text-slate-300 border-slate-600'
                    }`}>
                      {r.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      By: <strong>{r.resolved_by || 'Supervisor'}</strong>
                    </span>
                  </div>
                  <p className="text-slate-300 italic font-mono text-[11px]">
                    "{r.resolution_notes || 'No resolution notes provided.'}"
                  </p>
                </div>

                <span className="text-[10px] text-slate-500 font-mono">
                  {r.resolved_at ? new Date(r.resolved_at).toLocaleTimeString() : 'Resolved'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
