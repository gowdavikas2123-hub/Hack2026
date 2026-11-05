import React, { useState } from 'react';
import { CustomerRequest } from '../../types';
import {
  Inbox,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  UserCheck,
  Zap,
  HelpCircle,
  Clock,
  Layers,
  History
} from 'lucide-react';
import { NavTabId } from '../Navbar';

interface AllRequestsViewProps {
  requests: CustomerRequest[];
  rememberedRequests?: CustomerRequest[];
  onSelectRequestForAudit: (request: CustomerRequest) => void;
  onNavigate: (tab: NavTabId) => void;
}

export const AllRequestsView: React.FC<AllRequestsViewProps> = ({
  requests,
  rememberedRequests = [],
  onSelectRequestForAudit,
  onNavigate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [scope, setScope] = useState<'batch' | 'history'>('batch');

  const sourceList = scope === 'history' ? rememberedRequests : requests;

  const filteredRequests = sourceList.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.original_message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.extracted_connector && r.extracted_connector.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.selected_part_id && r.selected_part_id.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'DISPATCHED' && r.final_outcome === 'DISPATCH') ||
      (statusFilter === 'HUMAN_REVIEW' && r.final_outcome === 'HUMAN_REVIEW') ||
      (statusFilter === 'CLARIFICATION' && (r.status === 'CLARIFICATION_REQUIRED' || !!r.updated_message)) ||
      (statusFilter === 'PENDING' && r.status === 'PENDING');

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (r: CustomerRequest) => {
    if (r.final_outcome === 'DISPATCH') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-tight bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          Dispatched
        </span>
      );
    }
    if (r.final_outcome === 'HUMAN_REVIEW') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-tight bg-amber-500/20 text-amber-300 border border-amber-500/40">
          Human Review
        </span>
      );
    }
    if (r.status === 'CLARIFICATION_REQUIRED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-tight bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
          Clarification
        </span>
      );
    }
    if (r.status === 'PROCESSING' || r.status === 'STOCK_CHECK') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-tight bg-sky-500/20 text-sky-300 border border-sky-500/40 animate-pulse">
          {r.status}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-tight bg-slate-700/60 text-slate-300 border border-slate-600">
        Pending
      </span>
    );
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg space-y-0">
      {/* Table Header & Controls */}
      <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">
              Customer Request Management Module
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-sky-400 font-mono font-bold border border-slate-700">
              {sourceList.length} In View
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Search, filter, and inspect natural-language customer orders, extracted electrical parameters, and terminal outcomes.
          </p>
        </div>

        {/* Search, Scope & Filter Bar */}
        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          {/* Scope Selector: Active Batch vs All-Time Remembered Memory */}
          <div className="flex rounded-xl border border-slate-700 overflow-hidden text-xs">
            <button
              onClick={() => setScope('batch')}
              className={`px-3 py-1.5 font-semibold transition ${
                scope === 'batch'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Active Batch ({requests.length})
            </button>
            <button
              onClick={() => setScope('history')}
              className={`px-3 py-1.5 font-semibold transition flex items-center gap-1 ${
                scope === 'history'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Remembered History ({rememberedRequests.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search ID, customer, connector..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700 text-xs rounded-xl pl-8 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-sans"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex rounded-xl border border-slate-700 overflow-hidden text-xs">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'DISPATCHED', label: 'Dispatched' },
              { id: 'HUMAN_REVIEW', label: 'Human Review' },
              { id: 'CLARIFICATION', label: 'Clarification' },
              { id: 'PENDING', label: 'Pending' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 font-medium transition whitespace-nowrap ${
                  statusFilter === f.id
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => onNavigate('newRequest')}
            className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition"
          >
            + Add Request
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800 tracking-wider text-[11px]">
            <tr>
              <th className="px-4 py-3.5">Request ID & Customer</th>
              <th className="px-4 py-3.5 min-w-[240px]">Customer Message & Clarification</th>
              <th className="px-3 py-3.5">Voltage</th>
              <th className="px-3 py-3.5">Connector Type</th>
              <th className="px-3 py-3.5">Min Wattage</th>
              <th className="px-3 py-3.5">Status & Decision</th>
              <th className="px-3 py-3.5">AI Cost (INR)</th>
              <th className="px-3 py-3.5 text-right">Audit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  No requests match the selected search or filter criteria.
                </td>
              </tr>
            ) : (
              filteredRequests.map((r) => {
                const hasClarification = r.updated_message && r.updated_message !== r.original_message;
                return (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    {/* ID & Customer */}
                    <td className="px-4 py-3.5 align-top">
                      <span className="font-mono font-bold text-sky-400 block">{r.id}</span>
                      <span className="text-[11px] text-slate-400 font-medium">{r.customer_name}</span>
                    </td>

                    {/* Customer Message & Clarification */}
                    <td className="px-4 py-3.5 align-top">
                      <p className="text-slate-200 leading-relaxed font-normal">{r.original_message}</p>
                      {hasClarification && (
                        <div className="mt-2 p-2 rounded-lg bg-purple-950/40 border border-purple-800/40 text-[11px] text-purple-300">
                          <strong className="text-purple-400 block mb-0.5">Customer Clarification:</strong>
                          {r.updated_message?.split('\n').slice(1).join(' ')}
                        </div>
                      )}
                      {r.missing_fields && r.missing_fields.length > 0 && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          <span>Missing specs: {r.missing_fields.join(', ')}</span>
                        </div>
                      )}
                    </td>

                    {/* Voltage */}
                    <td className="px-3 py-3.5 align-top whitespace-nowrap font-mono">
                      {r.extracted_voltage ? (
                        <span className="font-bold text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
                          {r.extracted_voltage}V
                        </span>
                      ) : (
                        <span className="text-rose-400 italic font-sans">Unknown</span>
                      )}
                    </td>

                    {/* Connector */}
                    <td className="px-3 py-3.5 align-top whitespace-nowrap font-mono">
                      {r.extracted_connector ? (
                        <span className="font-medium text-sky-300 bg-sky-950/40 border border-sky-800/40 px-2 py-0.5 rounded">
                          {r.extracted_connector}
                        </span>
                      ) : (
                        <span className="text-rose-400 italic font-sans">Unknown</span>
                      )}
                    </td>

                    {/* Wattage */}
                    <td className="px-3 py-3.5 align-top whitespace-nowrap font-mono">
                      {r.extracted_min_wattage ? (
                        <span className="font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                          &ge; {r.extracted_min_wattage}W
                        </span>
                      ) : (
                        <span className="text-rose-400 italic font-sans">Unknown</span>
                      )}
                    </td>

                    {/* Status & Decision */}
                    <td className="px-3 py-3.5 align-top">
                      <div className="space-y-1">
                        <div>{getStatusBadge(r)}</div>
                        {r.selected_part_id && (
                          <span className="font-mono text-[11px] text-emerald-400 font-semibold block">
                            Part: {r.selected_part_id}
                          </span>
                        )}
                        {r.outcome_reason && (
                          <span className="text-[10px] text-slate-400 line-clamp-1 block" title={r.outcome_reason}>
                            {r.outcome_reason}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* AI Cost (INR) */}
                    <td className="px-3 py-3.5 align-top whitespace-nowrap">
                      <span className="font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded text-[11px]">
                        ₹{r.cost_inr ? r.cost_inr.toFixed(2) : ((r.cost_usd || 0.0003) * 87.0).toFixed(2)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3.5 align-top text-right">
                      <button
                        onClick={() => onSelectRequestForAudit(r)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 hover:border-sky-500/40 transition inline-flex items-center gap-1 text-[11px] font-semibold"
                        title="Open full audit dossier"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Audit</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
