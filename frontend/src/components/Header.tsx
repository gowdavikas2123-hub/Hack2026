import React from 'react';
import { Cpu, RotateCcw, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  llmMode: string;
  toolMode: string;
  onReset: () => void;
  isResetting: boolean;
}

export const Header: React.FC<HeaderProps> = ({ llmMode, toolMode, onReset, isResetting }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-lg shadow-sky-500/20 text-white">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Workshop Parts Desk
              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 font-medium">
                Agentic AI v1.0
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Autonomous Parts Inspection, Authoritative Verification & Safe Dispatch Controller
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Active Mode Indicators */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-xs">
            <span className="text-slate-400">LLM Mode:</span>
            <span className={`font-semibold uppercase px-2 py-0.5 rounded text-[10px] ${
              llmMode === 'live'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}>
              {llmMode}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-xs">
            <span className="text-slate-400">Tools:</span>
            <span className="font-semibold uppercase px-2 py-0.5 rounded text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/40">
              {toolMode}
            </span>
          </div>

          <button
            onClick={onReset}
            disabled={isResetting}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition disabled:opacity-50"
            title="Reset demo scenario to initial pristine challenge state"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            {isResetting ? 'Resetting...' : 'Reset Demo'}
          </button>
        </div>
      </div>
    </header>
  );
};
