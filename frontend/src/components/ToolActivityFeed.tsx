import React, { useState } from 'react';
import { ToolCallLog } from '../types';
import { Terminal, CheckCircle2, XCircle, Search, Filter } from 'lucide-react';

interface ToolActivityFeedProps {
  toolLogs: ToolCallLog[];
}

export const ToolActivityFeed: React.FC<ToolActivityFeedProps> = ({ toolLogs }) => {
  const [filterTool, setFilterTool] = useState<string>('ALL');

  const filtered = toolLogs.filter((log) => {
    if (filterTool === 'ALL') return true;
    return log.tool_name.toLowerCase().includes(filterTool.toLowerCase());
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-sky-400" />
            Live Tool Activity Monitor
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit logs for Inspection, Clarification, Warehouse Stock Verification, and Dispatch invocations.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex rounded-lg border border-slate-700 overflow-hidden text-xs">
          {['ALL', 'INSPECTION', 'CLARIFICATION', 'VERIFICATION', 'DISPATCH'].map((tool) => (
            <button
              key={tool}
              onClick={() => setFilterTool(tool)}
              className={`px-2.5 py-1 font-medium transition ${
                filterTool === tool
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tool}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/60 p-2 font-mono text-xs">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No tool executions logged yet. Start the batch to monitor real-time tool calls.
          </div>
        ) : (
          filtered.map((log) => {
            const isSuccess = log.status === 'SUCCESS';
            return (
              <div key={log.id} className="p-3 hover:bg-slate-800/40 rounded-lg transition">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isSuccess ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    )}
                    <span className="font-bold text-sky-400 uppercase tracking-tight">{log.tool_name}</span>
                    {log.request_id && (
                      <span className="text-[11px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                        {log.request_id}
                      </span>
                    )}
                    {log.part_id && (
                      <span className="text-[11px] bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded border border-slate-700">
                        Part: {log.part_id}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-shrink-0">
                    <span>{log.execution_time_ms.toFixed(1)}ms</span>
                    <span>&bull;</span>
                    <span>Cost: ${log.cost.toFixed(4)}</span>
                  </div>
                </div>

                {/* Input/Output details */}
                <div className="mt-1 text-[11px] space-y-0.5">
                  {log.input_payload && (
                    <div className="text-slate-400 truncate">
                      <span className="text-slate-500 font-semibold">IN:</span> {log.input_payload}
                    </div>
                  )}
                  {log.output_payload && (
                    <div className="text-emerald-300/90 truncate">
                      <span className="text-emerald-500 font-semibold">OUT:</span> {log.output_payload}
                    </div>
                  )}
                  {log.error_message && (
                    <div className="text-rose-400 font-semibold">
                      <span>ERR:</span> {log.error_message}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
