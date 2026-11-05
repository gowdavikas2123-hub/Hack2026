import React from 'react';
import { SpendingSummary } from '../types';
import { DollarSign, Cpu, Wrench, Shield, PieChart, Layers } from 'lucide-react';

interface SpendingChartProps {
  spending?: SpendingSummary | null;
}

export const SpendingChart: React.FC<SpendingChartProps> = ({ spending }) => {
  if (!spending) return null;

  const totalSpent = spending.total_known_spending;
  const budgetLimit = spending.budget_limit || 5.0;
  const budgetPercent = Math.min(100, Math.round((totalSpent / budgetLimit) * 100));

  const categories = Object.entries(spending.breakdown_by_category || {});

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg p-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Cumulative Spending & Token Budget Tracker
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict tracking of LLM token consumption and tool operation costs across the entire batch.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Budget Limit:</span>
          <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
            ${budgetLimit.toFixed(2)} USD
          </span>
        </div>
      </div>

      {/* Top metric tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium block">Total Known Spending</span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            ${totalSpent.toFixed(4)}
          </div>
          <span className="text-[10px] text-slate-500">Official challenge pricing</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium block">Remaining Budget</span>
          <div className="text-xl font-bold font-mono text-sky-400 mt-1">
            ${spending.remaining_budget.toFixed(4)}
          </div>
          <span className="text-[10px] text-slate-500">{100 - budgetPercent}% left</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium block">LLM Prompt Tokens</span>
          <div className="text-xl font-bold font-mono text-indigo-400 mt-1">
            {spending.total_llm_input_tokens.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500">${spending.known_llm_spending.toFixed(4)} LLM cost</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-[11px] text-slate-400 font-medium block">LLM Completion Tokens</span>
          <div className="text-xl font-bold font-mono text-violet-400 mt-1">
            {spending.total_llm_output_tokens.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500">{spending.unpriced_operations} unpriced ops</span>
        </div>
      </div>

      {/* Budget consumption gauge bar */}
      <div className="mb-5">
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="text-slate-400 font-medium">Budget Consumption</span>
          <span className="font-mono text-slate-200 font-semibold">{budgetPercent}% utilized (${totalSpent.toFixed(4)} / ${budgetLimit.toFixed(2)})</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              budgetPercent > 80
                ? 'bg-rose-500'
                : budgetPercent > 50
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.max(2, budgetPercent)}%` }}
          />
        </div>
      </div>

      {/* Category breakdown visual bars */}
      <div>
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <PieChart className="w-3.5 h-3.5 text-sky-400" />
          Spending Breakdown by Activity Category
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
          {categories.length === 0 ? (
            <div className="col-span-full text-slate-500 italic p-2">
              No categorized expenditure recorded yet.
            </div>
          ) : (
            categories.map(([category, amount]) => (
              <div key={category} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400 truncate capitalize">{category.replace('_', ' ')}:</span>
                <span className="font-bold text-slate-200">${amount.toFixed(4)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
