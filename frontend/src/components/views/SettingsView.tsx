import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  RotateCcw,
  Cpu,
  Terminal,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Info
} from 'lucide-react';

interface SettingsViewProps {
  llmMode: string;
  toolMode: string;
  onReset: () => void;
  isResetting: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  llmMode,
  toolMode,
  onReset,
  isResetting,
}) => {
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleResetClick = () => {
    if (window.confirm('Reset demo environment to the pristine challenge state (6 requests, 12 catalogue parts, 2 aged discrepancies)?')) {
      onReset();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    }
  };

  const businessRules = [
    {
      rule: 'Rule 1: Voltage Compatibility',
      desc: 'Voltage must match part specification exactly. Different voltage ratings are never interchangeable. If ambiguous or missing, trigger scripted clarification.',
    },
    {
      rule: 'Rule 2: Connector Compatibility',
      desc: 'Connector must match customer requirement from technical prose. Do not assume compatibility just because names look similar.',
    },
    {
      rule: 'Rule 3: Wattage Compatibility',
      desc: 'Minimum wattage requirement (10W or 20W). Higher wattage rating is acceptable (part_wattage >= requested_minimum_wattage).',
    },
    {
      rule: 'Rule 4 & 5: Stock Snapshots & Verification',
      desc: 'RECENT snapshots are trusted at batch opening. AGED snapshots require authoritative warehouse verification before dispatch even if snapshot reports 0.',
    },
    {
      rule: 'Rule 6: Single-Unit Stock Quantity',
      desc: 'Each part carries one unit. A successful dispatch immediately consumes that unit from the atomic ledger to prevent duplicate dispatches.',
    },
    {
      rule: 'Rule 7: Scripted Clarification',
      desc: 'Ambiguous or missing specifications trigger scripted clarification tool. Never invent customer responses. Re-extract specs upon customer reply.',
    },
    {
      rule: 'Rule 8: Safe Human Escalation',
      desc: 'Escalate to human review if voltage/connector is uncertain, clarification fails, no part exists, stock verification fails, or budget limit is reached.',
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">
              System Configuration, Rules & Architecture
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational engine parameters, challenge business rules, and environment reset controls.
          </p>
        </div>

        <button
          onClick={handleResetClick}
          disabled={isResetting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>{isResetting ? 'Resetting Scenario...' : resetSuccess ? 'Scenario Reset!' : 'Reset Demo Environment'}</span>
        </button>
      </div>

      {/* Grid: System Architecture & Operational Modes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Architecture Card */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            Technology Stack & Architecture
          </h3>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex justify-between">
              <span className="text-slate-400">Frontend:</span>
              <span className="text-sky-300 font-bold">React 18 + TypeScript + Vite + Tailwind CSS</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex justify-between">
              <span className="text-slate-400">Backend:</span>
              <span className="text-indigo-300 font-bold">Python 3.12 + FastAPI + SQLite + SQLAlchemy</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex justify-between">
              <span className="text-slate-400">LLM SDK:</span>
              <span className="text-emerald-300 font-bold">OpenAI Official Python SDK (GPT-4o-mini)</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex justify-between">
              <span className="text-slate-400">Database:</span>
              <span className="text-purple-300 font-bold">SQLite relational tables with foreign keys</span>
            </div>
          </div>
        </div>

        {/* Operational Modes Card */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-4 h-4 text-sky-400" />
            Active Operational Modes
          </h3>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-200 block">LLM Reasoning Engine</span>
                <span className="text-[11px] text-slate-400">Specification extraction & understanding</span>
              </div>
              <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {llmMode}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-200 block">Tool Integration Adapter</span>
                <span className="text-[11px] text-slate-400">Inspection, clarification & warehouse verification</span>
              </div>
              <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40">
                {toolMode}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-200 block">Default Spending Budget</span>
                <span className="text-[11px] text-slate-400">Autonomous budget guard limit</span>
              </div>
              <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold text-white bg-slate-800 border border-slate-700">
                $5.00 USD
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Challenge Business Rules Quick Reference (Section 3) */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-800">
          <BookOpen className="w-4 h-4 text-sky-400" />
          Challenge Business Rules Reference Guide (Deterministic Policy)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {businessRules.map((rule, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1"
            >
              <h4 className="font-bold text-sky-400">{rule.rule}</h4>
              <p className="text-slate-300 leading-relaxed text-[11px]">{rule.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
