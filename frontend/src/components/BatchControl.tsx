import React from 'react';
import { Batch, CustomerRequest } from '../types';
import { Play, Pause, PlayCircle, RotateCcw, AlertCircle, CheckCircle, Clock, ShieldAlert } from 'lucide-react';

interface BatchControlProps {
  batch?: Batch | null;
  requests: CustomerRequest[];
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  isRunning: boolean;
}

export const BatchControl: React.FC<BatchControlProps> = ({
  batch,
  requests,
  onStart,
  onPause,
  onResume,
  onReset,
  isRunning,
}) => {
  const progressPercent = batch ? Math.round((batch.processed_requests / (batch.total_requests || 1)) * 100) : 0;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'RUNNING':
        return <span className="px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold animate-pulse">RUNNING</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">COMPLETED</span>;
      case 'PAUSED':
        return <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold">PAUSED</span>;
      case 'FAILED':
        return <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold">FAILED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full bg-slate-700/60 text-slate-300 border border-slate-600 text-xs font-semibold">PENDING</span>;
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-slate-300">
            Batch: <span className="text-white font-mono font-bold text-base bg-slate-800 px-2.5 py-1 rounded border border-slate-700">{batch?.id || 'BATCH-001'}</span>
          </div>
          {getStatusBadge(batch?.status)}
          <span className="text-xs text-slate-400">
            {batch?.total_requests ?? 6} Total Requests
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {batch?.status !== 'RUNNING' && batch?.status !== 'COMPLETED' && (
            <button
              onClick={onStart}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/30 transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Batch Processing
            </button>
          )}

          {batch?.status === 'RUNNING' && (
            <button
              onClick={onPause}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30 transition"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              Pause Batch
            </button>
          )}

          {batch?.status === 'PAUSED' && (
            <button
              onClick={onResume}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              Resume Batch
            </button>
          )}

          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to reset the demonstration scenario? This resets inventory snapshots and customer requests.")) {
                onReset();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Scenario
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="text-slate-400 font-medium">Batch Progress</span>
          <span className="text-sky-400 font-semibold">{batch?.processed_requests ?? 0} of {batch?.total_requests ?? 6} Requests Processed ({progressPercent}%)</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 6 Request Micro-Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mt-4 pt-3 border-t border-slate-800/80">
        {requests.map((r, idx) => {
          let badgeColor = 'bg-slate-800 text-slate-400 border-slate-700';
          let icon = <Clock className="w-3 h-3 text-slate-400" />;

          if (r.status === 'DISPATCHED') {
            badgeColor = 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40';
            icon = <CheckCircle className="w-3 h-3 text-emerald-400" />;
          } else if (r.status === 'HUMAN_REVIEW') {
            badgeColor = 'bg-amber-950/60 text-amber-300 border-amber-600/40';
            icon = <ShieldAlert className="w-3 h-3 text-amber-400" />;
          } else if (r.status === 'PROCESSING' || r.status === 'STOCK_CHECK') {
            badgeColor = 'bg-sky-950/60 text-sky-300 border-sky-600/40 animate-pulse';
            icon = <Play className="w-3 h-3 text-sky-400" />;
          } else if (r.status === 'CLARIFICATION_REQUIRED') {
            badgeColor = 'bg-purple-950/60 text-purple-300 border-purple-600/40 animate-pulse';
            icon = <AlertCircle className="w-3 h-3 text-purple-400" />;
          }

          return (
            <div key={r.id} className={`flex items-center justify-between p-2 rounded-lg border text-xs font-mono ${badgeColor}`}>
              <span className="font-semibold">{r.id}</span>
              <div className="flex items-center gap-1">
                {icon}
                <span className="text-[10px] uppercase font-bold tracking-tight">{r.status.replace('_', ' ')}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
