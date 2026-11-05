import React from 'react';
import { Batch, PartCatalogueItem } from '../types';
import { Inbox, CheckCircle2, UserCheck, Clock, Layers, Wrench, DollarSign, PackageCheck } from 'lucide-react';

interface SummaryCardsProps {
  batch?: Batch | null;
  catalogue: PartCatalogueItem[];
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ batch, catalogue }) => {
  const totalStock = catalogue.reduce((acc, p) => acc + (p.current_stock > 0 ? p.current_stock : 0), 0);

  const cards = [
    {
      label: 'Total Requests',
      value: batch?.total_requests ?? 6,
      sub: 'In challenge batch',
      icon: Inbox,
      color: 'from-blue-500/20 to-sky-500/10 text-sky-400 border-sky-500/30',
    },
    {
      label: 'Processed',
      value: `${batch?.processed_requests ?? 0} / ${batch?.total_requests ?? 6}`,
      sub: `${Math.round(((batch?.processed_requests ?? 0) / (batch?.total_requests || 1)) * 100)}% complete`,
      icon: Layers,
      color: 'from-indigo-500/20 to-purple-500/10 text-indigo-400 border-indigo-500/30',
    },
    {
      label: 'Dispatched',
      value: batch?.dispatched_requests ?? 0,
      sub: 'Verified compatible',
      icon: CheckCircle2,
      color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30',
    },
    {
      label: 'Human Review',
      value: batch?.human_review_requests ?? 0,
      sub: 'Safely escalated',
      icon: UserCheck,
      color: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30',
    },
    {
      label: 'Pending',
      value: batch?.pending_requests ?? 6,
      sub: 'Awaiting execution',
      icon: Clock,
      color: 'from-slate-500/20 to-zinc-500/10 text-slate-300 border-slate-600',
    },
    {
      label: 'Catalogue Stock',
      value: `${totalStock} / ${catalogue.length || 12}`,
      sub: 'Units available',
      icon: PackageCheck,
      color: 'from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30',
    },
    {
      label: 'Tool Units',
      value: `${batch?.tool_units_spent ?? 0} / ${batch?.tool_units_budget ?? 14}`,
      sub: `${batch?.total_actions_count ?? 0} / ${batch?.max_actions_limit ?? 60} actions`,
      icon: Wrench,
      color: 'from-violet-500/20 to-pink-500/10 text-violet-400 border-violet-500/30',
    },
    {
      label: 'AI Cost (INR)',
      value: `₹${(batch?.total_spending_inr ?? ((batch?.total_spending ?? 0) * 87.0)).toFixed(2)}`,
      sub: `~$${(batch?.total_spending ?? 0).toFixed(4)} USD`,
      icon: DollarSign,
      color: 'from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className={`p-3.5 rounded-xl bg-gradient-to-br ${c.color} border bg-slate-900/70 backdrop-blur-sm shadow-sm transition hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{c.label}</span>
              <Icon className="w-4 h-4 opacity-80" />
            </div>
            <div className="text-xl font-bold text-white tracking-tight">{c.value}</div>
            <div className="text-[11px] text-slate-400 mt-1 truncate">{c.sub}</div>
          </div>
        );
      })}
    </div>
  );
};
