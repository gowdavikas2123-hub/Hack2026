import React from 'react';
import { SpendingSummary, Batch, CustomerRequest } from '../../types';
import {
  DollarSign,
  Cpu,
  Wrench,
  ShieldAlert,
  ShieldCheck,
  PieChart,
  Layers,
  ArrowRight,
  TrendingDown,
  Info
} from 'lucide-react';

interface BudgetUsageViewProps {
  spending: SpendingSummary | null;
  batch: Batch | null;
  requests: CustomerRequest[];
}

export const BudgetUsageView: React.FC<BudgetUsageViewProps> = ({
  spending,
  batch,
  requests,
}) => {
  const totalSpent = spending?.total_known_spending ?? (batch?.total_spending ?? 0.0);
  const budgetLimit = spending?.budget_limit ?? (batch?.budget_limit ?? 5.0);
  const remaining = Math.max(0.0, budgetLimit - totalSpent);
  const budgetPercent = Math.min(100, Math.round((totalSpent / (budgetLimit || 1)) * 100));

  const totalSpentInr = spending?.total_spending_inr ?? (totalSpent * 87.0);
  const budgetLimitInr = spending?.budget_limit_inr ?? (budgetLimit * 87.0);
  const remainingInr = spending?.remaining_budget_inr ?? (remaining * 87.0);

  const toolUnitsSpent = spending?.tool_units_spent ?? (batch?.tool_units_spent ?? 0);
  const toolUnitsBudget = spending?.tool_units_budget ?? (batch?.tool_units_budget ?? 14);
  const actionsCount = spending?.total_actions_count ?? (batch?.total_actions_count ?? 0);
  const actionsLimit = spending?.max_actions_limit ?? (batch?.max_actions_limit ?? 60);

  const totalInputTokens = spending?.total_llm_input_tokens ?? (batch?.llm_input_tokens ?? 0);
  const totalOutputTokens = spending?.total_llm_output_tokens ?? (batch?.llm_output_tokens ?? 0);
  const totalCalls = requests.filter((r) => r.status !== 'PENDING').length;

  const categories = Object.entries(spending?.breakdown_by_category || {
    specification_extraction: spending?.known_llm_spending || 0.0,
    inspection_tool: 0.0,
    stock_verification: 0.0,
    clarification_tool: 0.0,
    dispatch_tool: 0.0,
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              AI Budget Tracking & Token Consumption Module
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time financial telemetry in Indian Rupees (₹) and USD, 14 platform tool units tracking, and autonomous safeguards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Configured Limit:</span>
          <span className="font-mono text-xs font-bold text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
            ₹{budgetLimitInr.toFixed(2)} INR <span className="text-slate-400 font-normal">(${budgetLimit.toFixed(2)} USD)</span>
          </span>
        </div>
      </div>

      {/* Official Challenge Platform Measures & Tool Units Monitor */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/30 text-xs shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-indigo-500/20 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-white text-sm">
                Platform-Measured Tool Units & Execution Bounds
              </h3>
              <p className="text-[11px] text-indigo-200/80">
                All requests in a batch strictly share 14 tool units and at most 60 actions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-mono font-bold text-xs">
              {toolUnitsSpent} / {toolUnitsBudget} Units Used
            </span>
            <span className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs">
              {actionsCount} / {actionsLimit} Actions
            </span>
          </div>
        </div>

        {/* 4 Tool Unit Rules Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Inspect Catalogue</div>
            <div className="text-lg font-mono font-bold text-sky-400 mt-0.5">1 Unit</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Reads catalogue snapshot</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Clarify Customer</div>
            <div className="text-lg font-mono font-bold text-purple-400 mt-0.5">2 Units</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Scripted clarification lookup</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Verify Warehouse</div>
            <div className="text-lg font-mono font-bold text-cyan-400 mt-0.5">2 Units</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Authoritative stock verification</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Decisions (Dispatch / Escalate)</div>
            <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">0 Units (Free)</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Terminal irreversible decision</div>
          </div>
        </div>

        {/* Wattage Clarification Avoidance Rule & Operational Notes */}
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-indigo-900/40 space-y-2 text-[11px] text-slate-300">
          <div className="flex items-start gap-2">
            <span className="font-bold text-amber-400 whitespace-nowrap">&bull; Wattage Clarification Avoidance Rule:</span>
            <span>
              Every request requires 10 W or 20 W minimum. A higher wattage rating is permitted. A verified 20 W part avoids customer wattage clarification when voltage and connector match (<strong>saving 2 tool units</strong>).
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-sky-400 whitespace-nowrap">&bull; Warehouse Discrepancies:</span>
            <span>
              Exactly two of six aged snapshot values disagree with warehouse. Aged values can hide available stock (e.g. PART-108) as well as advertise stock that is gone (e.g. PART-105).
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold text-emerald-400 whitespace-nowrap">&bull; Zero Outcome Credit:</span>
            <span>
              Decisions are irreversible. Tools may still be used after budget reaches zero only if cost is zero. Finish closes undecided requests with zero credit.
            </span>
          </div>
        </div>
      </div>

      {/* Section 11: Budget Guard Banner */}
      <div className={`p-4 rounded-2xl border text-xs shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
        budgetPercent > 80
          ? 'bg-rose-950/40 border-rose-600/40 text-rose-200'
          : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
      }`}>
        <div className="flex items-start gap-2.5">
          <ShieldCheck className={`w-5 h-5 flex-shrink-0 mt-0.5 ${budgetPercent > 80 ? 'text-rose-400' : 'text-emerald-400'}`} />
          <div>
            <h3 className="font-bold text-white">
              Autonomous Budget Guard Active ({budgetPercent}% consumed)
            </h3>
            <p className="text-[11px] leading-relaxed opacity-90 mt-0.5">
              If cumulative spending reaches ₹{budgetLimitInr.toFixed(2)} (${budgetLimit.toFixed(2)} USD), the agent immediately halts paid LLM operations, escalates all remaining requests to <strong>HUMAN_REVIEW</strong> with code <code>BUDGET_LIMIT_REACHED</code>, and protects the batch ledger from cost overruns.
            </p>
          </div>
        </div>

        <span className="font-mono text-xs font-bold px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-700 whitespace-nowrap">
          Remaining: ₹{remainingInr.toFixed(2)} INR (${remaining.toFixed(4)} USD)
        </span>
      </div>

      {/* 8 Metric Tiles according to prompt Section 11 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* Metric 1: Configured Budget */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configured Budget</span>
          <div className="text-xl font-bold font-mono text-white mt-1">₹{budgetLimitInr.toFixed(2)}</div>
          <span className="text-[10px] text-slate-500">${budgetLimit.toFixed(2)} USD Max</span>
        </div>

        {/* Metric 2: Total Spending in INR */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total AI Cost (INR)</span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">₹{totalSpentInr.toFixed(2)}</div>
          <span className="text-[10px] text-slate-500">${totalSpent.toFixed(4)} USD ({budgetPercent}%)</span>
        </div>

        {/* Metric 3: Remaining Budget in INR */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remaining Buffer</span>
          <div className="text-xl font-bold font-mono text-sky-400 mt-1">₹{remainingInr.toFixed(2)}</div>
          <span className="text-[10px] text-slate-500">${remaining.toFixed(4)} USD available</span>
        </div>

        {/* Metric 4: Total LLM API Calls */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">LLM Operations</span>
          <div className="text-xl font-bold font-mono text-purple-400 mt-1">{totalCalls} calls</div>
          <span className="text-[10px] text-slate-500">Spec parsing & re-extractions</span>
        </div>

        {/* Metric 5: Input Tokens */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prompt / Input Tokens</span>
          <div className="text-xl font-bold font-mono text-indigo-400 mt-1">{totalInputTokens.toLocaleString()}</div>
          <span className="text-[10px] text-slate-500">$0.00015 / 1k tokens</span>
        </div>

        {/* Metric 6: Output Tokens */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completion Tokens</span>
          <div className="text-xl font-bold font-mono text-violet-400 mt-1">{totalOutputTokens.toLocaleString()}</div>
          <span className="text-[10px] text-slate-500">$0.00060 / 1k tokens</span>
        </div>

        {/* Metric 7: Known LLM Cost */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">LLM Spending</span>
          <div className="text-xl font-bold font-mono text-indigo-300 mt-1">
            ${(spending?.known_llm_spending ?? batch?.known_llm_spending ?? 0.0).toFixed(4)}
          </div>
          <span className="text-[10px] text-slate-500">Official model pricing</span>
        </div>

        {/* Metric 8: Total Tool Spending */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tool Spending</span>
          <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
            ${(spending?.known_tool_spending ?? batch?.known_tool_spending ?? 0.0).toFixed(4)}
          </div>
          <span className="text-[10px] text-slate-500">Inspection & warehouse tools</span>
        </div>
      </div>

      {/* Budget consumption progress bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-300 font-bold uppercase tracking-wider">
            Budget Consumption Progress
          </span>
          <span className="font-mono font-bold text-slate-200">
            {budgetPercent}% (${totalSpent.toFixed(4)} / ${budgetLimit.toFixed(2)})
          </span>
        </div>
        <div className="w-full bg-slate-950 rounded-full h-4 p-0.5 border border-slate-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              budgetPercent > 80
                ? 'bg-rose-500'
                : budgetPercent > 50
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.max(2, budgetPercent)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>$0.00 (Start)</span>
          <span>$2.50 (50% Warning)</span>
          <span>${budgetLimit.toFixed(2)} (Hard Limit)</span>
        </div>
      </div>

      {/* Cost per Customer Request Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            Cost Per Customer Request Breakdown
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            Batch Total: ₹{totalSpentInr.toFixed(2)} INR (${totalSpent.toFixed(4)} USD)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 text-slate-400 uppercase font-semibold border-b border-slate-800 text-[10px]">
              <tr>
                <th className="px-4 py-3">Request ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Selected Part</th>
                <th className="px-4 py-3 text-right">Cost (INR)</th>
                <th className="px-4 py-3 text-right">Cost (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {requests.map((r) => {
                const isDispatched = r.final_outcome === 'DISPATCH';
                const hasClarif = !!r.updated_message;
                const estCostUsd = hasClarif ? 0.0006 : 0.0003;
                const actualCostInr = r.cost_inr ? r.cost_inr : ((r.cost_usd || estCostUsd) * 87.0);
                const actualCostUsd = r.cost_usd || estCostUsd;
                return (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono font-bold text-sky-400">{r.id}</td>
                    <td className="px-4 py-3 text-slate-300 font-medium">{r.customer_name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          isDispatched
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {r.final_outcome || r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">
                      {r.selected_part_id || 'None (Escalated)'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                      ₹{actualCostInr.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">
                      ${actualCostUsd.toFixed(4)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
