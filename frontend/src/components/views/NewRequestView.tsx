import React, { useState } from 'react';
import { CustomerRequest } from '../../types';
import { api } from '../../services/api';
import {
  Sparkles,
  Send,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Cpu,
  Layers,
  Zap,
  Check,
  X,
  HelpCircle,
  PackageCheck,
  ShieldCheck
} from 'lucide-react';
import { NavTabId } from '../Navbar';

interface NewRequestViewProps {
  onSuccess: (newRequest: CustomerRequest) => void;
  onViewAudit: (request: CustomerRequest) => void;
  onNavigate: (tab: NavTabId) => void;
}

export const NewRequestView: React.FC<NewRequestViewProps> = ({
  onSuccess,
  onViewAudit,
  onNavigate,
}) => {
  const [message, setMessage] = useState('');
  const [customerName, setCustomerName] = useState('Workshop Technician');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<CustomerRequest | null>(null);

  const samplePrompts = [
    {
      label: '12V USB-C 20W (Exact Match -> Dispatch)',
      text: 'I need a 20W power supply with 12V output and USB-C connector for our bench test unit.',
    },
    {
      label: '24V 5.5mm Barrel 20W (Aged Stock Discovered -> Dispatch)',
      text: 'Looking for a 24V power supply using a 5.5mm barrel plug connector and minimum 20W power.',
    },
    {
      label: 'USB-C 10W (Ambiguous Voltage -> Clarification)',
      text: 'Need a power supply with USB-C connector rated for at least 10W, but I forgot whether the board takes 5V or 12V.',
    },
    {
      label: '12V 20W (Missing Connector -> Clarification / Escalation)',
      text: 'Need a 12V power supply with 20W minimum power, but not sure which connector socket is installed.',
    },
    {
      label: '36V DIN-4 40W (Unsupported Specs -> Human Review)',
      text: 'Need a 36-volt power supply with a military DIN connector rated for at least 40W for heavy machinery.',
    },
  ];

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim()) {
      setErrorMsg('Please enter a natural-language customer request description.');
      return;
    }
    if (message.trim().length < 8) {
      setErrorMsg('Request message is too short. Please provide electrical or connector details.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const res = await api.submitCustomerRequest({
        message: message.trim(),
        customer_name: customerName.trim() || 'Workshop Technician',
      });
      setLatestResult(res);
      onSuccess(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit and process customer request.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* View Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-400" />
              Customer Request Submission & Real-Time Parts Search
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter natural-language customer requirements. The AI Agent will inspect the request, extract structured specifications, verify warehouse inventory, and decide whether to dispatch a part or refer to a human.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-sky-400 bg-sky-950/60 px-3 py-1 rounded-lg border border-sky-800/40">
            Interactive AI Mode
          </span>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Customer / Requester
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Alice - Diagnostics Lab"
                className="w-full bg-slate-950/90 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Natural-Language Customer Request <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Enter customer requirement (e.g. 'I need a 20W power supply with 12V output and USB-C connector...')"
                className="w-full bg-slate-950/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-sans leading-relaxed resize-none"
              />
            </div>
          </div>

          {/* Quick Preset Scenarios */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Or Select A Quick Challenge Test Scenario:
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              {samplePrompts.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setMessage(s.text);
                    setCustomerName(`Customer #${idx + 1}`);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-sky-500/40 text-[11px] transition text-left"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error display */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-600/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400 italic">
              Strict rules enforced: Exact voltage & connector match, wattage inequality, authoritative stock check.
            </span>

            <button
              type="submit"
              disabled={isAnalyzing}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-600/30 flex items-center gap-2 transition disabled:opacity-50 self-end sm:self-auto"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI Agent Executing Rules...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit & Process Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Section 5: INSPECTION & DECISION RESULT CARD */}
      {latestResult && (
        <div className="bg-slate-900/90 border border-sky-500/40 rounded-2xl p-6 shadow-xl animate-in fade-in duration-300 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Inspection Output & Final Decision
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
                    {latestResult.id}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">{latestResult.customer_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tight border ${
                  latestResult.final_outcome === 'DISPATCH'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                Final Outcome: {latestResult.final_outcome || latestResult.status}
              </span>
            </div>
          </div>

          {/* Original Message and Clarification Addendum */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Inbound Customer Message
            </span>
            <p className="text-slate-200 leading-relaxed italic">
              "{latestResult.original_message}"
            </p>
            {latestResult.updated_message && latestResult.updated_message !== latestResult.original_message && (
              <div className="mt-2 p-2 rounded bg-purple-950/40 border border-purple-800/40 text-purple-300">
                <strong className="text-purple-400 block mb-0.5">Scripted Clarification Addendum:</strong>
                {latestResult.updated_message.split('\n').slice(1).join(' ')}
              </div>
            )}
          </div>

          {/* Section 5: Structured Specification Inspection Grid */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              Structured Technical Specifications Extracted
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              {/* Part Type */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Part Type</span>
                <span className="text-sm font-bold text-white">Power Supply</span>
                <span className="text-[10px] text-emerald-400 block mt-1">Verified category</span>
              </div>

              {/* Voltage */}
              <div className={`p-3 rounded-xl border ${
                latestResult.extracted_voltage
                  ? 'bg-slate-950/60 border-slate-800'
                  : 'bg-rose-950/40 border-rose-600/40 text-rose-300'
              }`}>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Required Voltage</span>
                <span className={`text-sm font-bold ${latestResult.extracted_voltage ? 'text-amber-300' : 'text-rose-400'}`}>
                  {latestResult.extracted_voltage ? `${latestResult.extracted_voltage}V` : 'MISSING / AMBIGUOUS'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {latestResult.extracted_voltage ? 'Exact match required' : 'Cannot dispatch'}
                </span>
              </div>

              {/* Minimum Wattage */}
              <div className={`p-3 rounded-xl border ${
                latestResult.extracted_min_wattage
                  ? 'bg-slate-950/60 border-slate-800'
                  : 'bg-rose-950/40 border-rose-600/40 text-rose-300'
              }`}>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Minimum Wattage</span>
                <span className={`text-sm font-bold ${latestResult.extracted_min_wattage ? 'text-emerald-300' : 'text-rose-400'}`}>
                  {latestResult.extracted_min_wattage ? `≥ ${latestResult.extracted_min_wattage}W` : 'MISSING'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">Higher wattage acceptable</span>
              </div>

              {/* Connector Type */}
              <div className={`p-3 rounded-xl border ${
                latestResult.extracted_connector
                  ? 'bg-slate-950/60 border-slate-800'
                  : 'bg-rose-950/40 border-rose-600/40 text-rose-300'
              }`}>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Connector Type</span>
                <span className={`text-sm font-bold ${latestResult.extracted_connector ? 'text-sky-300' : 'text-rose-400'}`}>
                  {latestResult.extracted_connector || 'MISSING / UNKNOWN'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">Must match catalogue</span>
              </div>
            </div>
          </div>

          {/* Missing/Ambiguous warning if any */}
          {latestResult.missing_fields && latestResult.missing_fields.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-600/50 text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>Missing Specifications:</strong> {latestResult.missing_fields.join(', ')}. Automatic dispatch prohibited under challenge rules.
              </span>
            </div>
          )}

          {/* Decision Rationale & Allocation */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">Decision Rationale:</span>
                {latestResult.selected_part_id && (
                  <span className="font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                    Selected Part: {latestResult.selected_part_id}
                  </span>
                )}
              </div>
              <p className="text-slate-300 leading-relaxed">
                {latestResult.outcome_reason}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => onViewAudit(latestResult)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 hover:border-sky-500/40 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <span>View Full Audit Dossier</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
