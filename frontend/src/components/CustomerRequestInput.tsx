import React, { useState } from 'react';
import { CustomerRequest } from '../types';
import { api } from '../services/api';
import { Sparkles, Send, CheckCircle2, AlertTriangle, ArrowRight, Zap, RefreshCw, Cpu, Layers } from 'lucide-react';

interface CustomerRequestInputProps {
  onSuccess: (newRequest: CustomerRequest) => void;
  onViewAudit: (request: CustomerRequest) => void;
}

export const CustomerRequestInput: React.FC<CustomerRequestInputProps> = ({ onSuccess, onViewAudit }) => {
  const [message, setMessage] = useState('');
  const [customerName, setCustomerName] = useState('Workshop Client');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<CustomerRequest | null>(null);

  const samplePrompts = [
    {
      label: '12V USB-C 20W (Exact Match)',
      text: 'I need a replacement power unit that provides 12 volts, plugs in with a USB-C connector, and can handle at least 20 watts of power.',
    },
    {
      label: '24V 5.5mm Barrel 20W (Aged Discovery)',
      text: 'Hi parts desk, looking for a 24V supply using a standard 5.5mm barrel plug. Minimum wattage needed is 20W.',
    },
    {
      label: 'USB-C 10W (Ambiguous Voltage)',
      text: 'We need a power source with a USB-C connector providing at least 10 watts, but I forgot whether our board takes 5V or 12V.',
    },
    {
      label: '12V 20W (Missing Connector)',
      text: 'Need a 12V unit with at least 20W minimum power, but not sure which connector socket is installed on the chassis.',
    },
    {
      label: '36V DIN-4 40W (Custom Incompatible)',
      text: 'Hi! We need a 36-volt power source with a military DIN connector rated for at least 40 watts for our underwater rover.',
    },
  ];

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const res = await api.submitCustomerRequest({
        message: message.trim(),
        customer_name: customerName.trim() || 'Workshop Client',
      });
      setLatestResult(res);
      onSuccess(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process request.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-slate-900/95 border border-sky-500/40 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
      <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
              <Sparkles className="w-4 h-4" />
            </div>
            Customer Request Input & Real-Time Parts Search
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Type any natural-language customer requirement. The AI Agent will parse voltage, connector & wattage, search the catalogue, and decide on dispatch.
          </p>
        </div>
        <span className="text-[11px] font-mono text-sky-400 bg-sky-950/60 px-2.5 py-1 rounded border border-sky-800/40 font-semibold">
          Interactive Request Mode
        </span>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-1">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Customer Name / Dept
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Alice - Diagnostics Lab"
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Natural-Language Customer Request Message
            </label>
            <div className="relative">
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter customer requirement (e.g. 'I need a power supply that delivers 12 volts with USB-C connector and handles at least 20 watts...')"
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-sans leading-relaxed resize-none"
              />
            </div>
          </div>
        </div>

        {/* Quick Sample Chips */}
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Or Test With Sample Challenge Requests:
          </span>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {samplePrompts.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setMessage(s.text);
                  setCustomerName(`Customer #${idx + 1}`);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-sky-500/40 text-[11px] transition"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-between pt-2">
          {errorMsg ? (
            <div className="text-xs text-rose-400 flex items-center gap-1.5 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{errorMsg}</span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-500 italic">
              Applies strict voltage matching, connector verification, and wattage inequality rules.
            </span>
          )}

          <button
            type="submit"
            disabled={isAnalyzing || !message.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-600/30 flex items-center gap-2 transition disabled:opacity-40"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>AI Analyzing & Searching Parts...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Submit Request & Search Parts</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Live Result Card */}
      {latestResult && (
        <div className="mt-5 pt-4 border-t border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-sky-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {latestResult.id}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                    latestResult.final_outcome === 'DISPATCH'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  Outcome: {latestResult.final_outcome}
                </span>
                {latestResult.selected_part_id && (
                  <span className="font-mono text-xs text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Selected: {latestResult.selected_part_id}
                  </span>
                )}
              </div>

              {/* Extracted specs chips */}
              <div className="flex flex-wrap gap-1.5 pt-1 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/40 text-amber-300">
                  Voltage: {latestResult.extracted_voltage ? `${latestResult.extracted_voltage}V` : 'Unknown'}
                </span>
                <span className="px-2 py-0.5 rounded bg-sky-950/40 border border-sky-800/40 text-sky-300">
                  Connector: {latestResult.extracted_connector || 'Unknown'}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-300">
                  Wattage: {latestResult.extracted_min_wattage ? `≥ ${latestResult.extracted_min_wattage}W` : 'Unknown'}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                <strong className="text-white">Decision Rationale:</strong> {latestResult.outcome_reason}
              </p>
            </div>

            <button
              onClick={() => onViewAudit(latestResult)}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 hover:border-sky-500/40 text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5"
            >
              <span>View Audit Dossier</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
