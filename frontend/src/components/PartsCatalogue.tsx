import React, { useState } from 'react';
import { PartCatalogueItem } from '../types';
import { Package, ShieldAlert, CheckCircle, AlertTriangle, Search, Zap, Layers } from 'lucide-react';

interface PartsCatalogueProps {
  catalogue: PartCatalogueItem[];
}

export const PartsCatalogue: React.FC<PartsCatalogueProps> = ({ catalogue }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFreshness, setFilterFreshness] = useState<'ALL' | 'RECENT' | 'AGED'>('ALL');

  const filtered = catalogue.filter((p) => {
    const matchesSearch =
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.connector.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.technical_description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFreshness = filterFreshness === 'ALL' || p.snapshot_freshness === filterFreshness;

    return matchesSearch && matchesFreshness;
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-sky-400" />
            12-Part Workshop Inventory & Authoritative Verification Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Technical prose specifications, snapshot freshness tags, and discrepancy detection.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search parts, connectors, specs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 text-xs rounded-lg pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex rounded-lg border border-slate-700 overflow-hidden text-xs">
            {(['ALL', 'RECENT', 'AGED'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterFreshness(mode)}
                className={`px-2.5 py-1.5 font-medium transition ${
                  filterFreshness === mode
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
        {filtered.map((part) => {
          const isAged = part.snapshot_freshness === 'AGED';
          const hasDiscrepancy = part.has_discrepancy;

          return (
            <div
              key={part.id}
              className={`p-4 rounded-xl border transition relative flex flex-col justify-between ${
                hasDiscrepancy
                  ? 'bg-slate-900 border-amber-500/50 shadow-md shadow-amber-500/10'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-sky-400">{part.id}</span>
                    <h3 className="text-sm font-semibold text-white tracking-tight leading-snug">{part.name}</h3>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                      isAged
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {part.snapshot_freshness}
                  </span>
                </div>

                {/* Technical Prose Description */}
                <p className="text-xs text-slate-400 leading-relaxed mb-3 line-clamp-3">
                  {part.technical_description}
                </p>

                {/* Specs chips */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="px-2 py-0.5 rounded bg-amber-950/40 border border-amber-800/40 text-amber-300 font-mono text-[11px] font-semibold">
                    {part.voltage}V
                  </span>
                  <span className="px-2 py-0.5 rounded bg-sky-950/40 border border-sky-800/40 text-sky-300 font-mono text-[11px] font-medium">
                    {part.connector}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 font-mono text-[11px] font-semibold">
                    {part.wattage}W
                  </span>
                </div>
              </div>

              {/* Stock and discrepancy section */}
              <div className="pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Snapshot Stock:</span>
                  <span className="font-mono font-bold text-slate-200">{part.snapshot_quantity} unit(s)</span>
                </div>

                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-slate-400">Ledger Stock:</span>
                  <span
                    className={`font-mono font-bold ${
                      part.current_stock > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {part.current_stock} unit(s)
                  </span>
                </div>

                {part.verified_quantity !== null && part.verified_quantity !== undefined && (
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-slate-400">Verified Warehouse:</span>
                    <span className="font-mono font-bold text-sky-400">{part.verified_quantity} unit(s)</span>
                  </div>
                )}

                {/* Discrepancy Alert */}
                {hasDiscrepancy && (
                  <div className="mt-2.5 p-2 rounded bg-amber-950/60 border border-amber-600/50 text-[11px] text-amber-300 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold uppercase tracking-tight block">
                        Discrepancy: {part.discrepancy_type}
                      </span>
                      {part.discrepancy_type === 'OVERSTATED' ? (
                        <span>Aged snapshot showed 1 unit, but physical warehouse has 0. Disallow dispatch.</span>
                      ) : (
                        <span>Aged snapshot reported 0, but warehouse verified 1 unit. Available!</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
