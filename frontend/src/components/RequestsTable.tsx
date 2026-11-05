import React from 'react';
import { CustomerRequest } from '../types';
import { CheckCircle2, AlertTriangle, FileText, ArrowRight, Zap, Link as LinkIcon, Cpu } from 'lucide-react';

interface RequestsTableProps {
  requests: CustomerRequest[];
  onSelectRequest: (request: CustomerRequest) => void;
}

export const RequestsTable: React.FC<RequestsTableProps> = ({ requests, onSelectRequest }) => {
  const getBadgeClass = (status: string) => {
    switch (status) {
      case 'DISPATCHED':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'HUMAN_REVIEW':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'CLARIFICATION_REQUIRED':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30 animate-pulse';
      case 'STOCK_CHECK':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'PROCESSING':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30 animate-pulse';
      case 'FAILED':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-700/60 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            Customer Requests & AI Specification Extraction
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time tracking of extracted electrical requirements, clarification status, and dispatch decisions.
          </p>
        </div>
        <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
          6 Requests in Batch
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/70 text-slate-400 uppercase font-semibold border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">ID & Customer</th>
              <th className="px-4 py-3 min-w-[280px]">Customer Message & Clarification</th>
              <th className="px-3 py-3">Voltage</th>
              <th className="px-3 py-3">Connector</th>
              <th className="px-3 py-3">Min Wattage</th>
              <th className="px-3 py-3">Decision / Outcome</th>
              <th className="px-3 py-3 text-right">Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {requests.map((r) => {
              const hasClarification = r.updated_message && r.updated_message !== r.original_message;
              return (
                <tr key={r.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3.5 align-top">
                    <span className="font-mono font-bold text-sky-400 block">{r.id}</span>
                    <span className="text-[11px] text-slate-400">{r.customer_name}</span>
                  </td>
                  <td className="px-4 py-3.5 align-top">
                    <p className="text-slate-300 leading-relaxed font-normal">{r.original_message}</p>
                    {hasClarification && (
                      <div className="mt-2 p-2 rounded bg-purple-950/40 border border-purple-800/40 text-[11px] text-purple-300">
                        <span className="font-semibold text-purple-400 block mb-0.5">Resolved via Scripted Clarification:</span>
                        {r.updated_message?.split('\n').slice(1).join(' ')}
                      </div>
                    )}
                    {r.missing_fields && r.missing_fields.length > 0 && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-400">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Missing specs: {r.missing_fields.join(', ')}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3.5 align-top whitespace-nowrap">
                    {r.extracted_voltage ? (
                      <span className="font-mono font-bold text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
                        {r.extracted_voltage} {r.voltage_unit || 'V'}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Unknown</span>
                    )}
                  </td>
                  <td className="px-3 py-3.5 align-top whitespace-nowrap">
                    {r.extracted_connector ? (
                      <span className="font-mono font-medium text-sky-300 bg-sky-950/40 border border-sky-800/40 px-2 py-0.5 rounded">
                        {r.extracted_connector}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Unknown</span>
                    )}
                  </td>
                  <td className="px-3 py-3.5 align-top whitespace-nowrap">
                    {r.extracted_min_wattage ? (
                      <span className="font-mono font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                        ≥ {r.extracted_min_wattage} {r.wattage_unit || 'W'}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Unknown</span>
                    )}
                  </td>
                  <td className="px-3 py-3.5 align-top">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold tracking-tight uppercase ${getBadgeClass(r.status)}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                      {r.selected_part_id && (
                        <span className="font-mono text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {r.selected_part_id}
                        </span>
                      )}
                      {r.outcome_reason && (
                        <p className="text-[10px] text-slate-400 line-clamp-2 max-w-[200px]" title={r.outcome_reason}>
                          {r.outcome_reason}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3.5 align-top text-right">
                    <button
                      onClick={() => onSelectRequest(r)}
                      className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 hover:border-sky-500/40 transition flex items-center gap-1 ml-auto"
                    >
                      <FileText className="w-3 h-3" />
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
  );
};
