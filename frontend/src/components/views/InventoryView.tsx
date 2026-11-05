import React, { useState } from 'react';
import { PartCatalogueItem } from '../../types';
import {
  Package,
  Search,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Zap,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Info
} from 'lucide-react';

interface InventoryViewProps {
  catalogue: PartCatalogueItem[];
}

export const InventoryView: React.FC<InventoryViewProps> = ({ catalogue }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Compute status according to Section 7:
  // AVAILABLE, UNAVAILABLE, UNCERTAIN, VERIFICATION REQUIRED
  const getStockStatus = (p: PartCatalogueItem): {
    label: 'AVAILABLE' | 'UNAVAILABLE' | 'UNCERTAIN' | 'VERIFICATION REQUIRED';
    color: string;
    description: string;
  } => {
    if (p.current_stock === 0 && p.verified_quantity === 0) {
      return {
        label: 'UNAVAILABLE',
        color: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        description: 'Physical warehouse confirmed 0 units available.',
      };
    }
    if (p.snapshot_freshness === 'AGED' && p.verified_quantity === undefined) {
      return {
        label: 'VERIFICATION REQUIRED',
        color: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        description: 'Aged snapshot requires authoritative warehouse tool verification before dispatch.',
      };
    }
    if (p.snapshot_freshness === 'AGED' && p.has_discrepancy && p.discrepancy_type === 'OVERSTATED') {
      return {
        label: 'UNAVAILABLE',
        color: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        description: 'Discrepancy: Snapshot showed 1, but physical warehouse is 0.',
      };
    }
    if (p.current_stock > 0) {
      return {
        label: 'AVAILABLE',
        color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        description: 'Verified unit in stock and ready for immediate dispatch.',
      };
    }
    return {
      label: 'UNCERTAIN',
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      description: 'Stock status uncertain or awaiting inventory check.',
    };
  };

  const filtered = catalogue.filter((p) => {
    const statusObj = getStockStatus(p);
    const matchesSearch =
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.connector.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.technical_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${p.voltage}v`.includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      statusFilter === statusObj.label ||
      statusFilter === p.snapshot_freshness;

    return matchesSearch && matchesStatus;
  });

  const availableCount = catalogue.filter((p) => p.current_stock > 0).length;
  const agedCount = catalogue.filter((p) => p.snapshot_freshness === 'AGED').length;
  const recentCount = catalogue.filter((p) => p.snapshot_freshness === 'RECENT').length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white">
              Inventory Management & Parts Catalogue Module
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-sky-400 font-mono font-bold border border-slate-700">
              12 Parts
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            12 fictional parts, natural-language technical descriptions, snapshot freshness tags, and authoritative stock verifications.
          </p>
        </div>

        {/* Quick summary metrics */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300">
            Available: <strong>{availableCount}/12</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
            Recent: <strong>{recentCount}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-800/40 text-amber-300">
            Aged: <strong>{agedCount}</strong>
          </div>
        </div>
      </div>

      {/* Discrepancy Report Banner (Critical Challenge Requirement) */}
      <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-600/40 text-xs text-amber-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-300">
              Rule 4 & 5: Aged Stock Discrepancy Safeguard Active
            </h3>
            <p className="text-[11px] text-amber-200/80 leading-relaxed mt-0.5">
              Exactly two of the six aged snapshots disagree with authoritative warehouse inventory.
              The agent <strong>never dispatches on aged snapshots alone</strong>, preventing phantom dispatch on <strong>PART-105</strong> (overstated: 1&rarr;0) while discovering hidden stock on <strong>PART-108</strong> (understated: 0&rarr;1).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center font-mono text-[11px]">
          <span className="px-2.5 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-800/60 font-bold">
            PART-105: 1 &rarr; 0 (Phantom)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-bold">
            PART-108: 0 &rarr; 1 (Discovered)
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by part ID, name, connector, voltage..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-xs rounded-xl pl-8 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex rounded-xl border border-slate-700 overflow-hidden text-xs self-start md:self-auto">
          {['ALL', 'AVAILABLE', 'UNAVAILABLE', 'VERIFICATION REQUIRED', 'RECENT', 'AGED'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 font-medium transition whitespace-nowrap ${
                statusFilter === filter
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Catalogue Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((part) => {
          const status = getStockStatus(part);
          const isAged = part.snapshot_freshness === 'AGED';

          return (
            <div
              key={part.id}
              className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
                part.has_discrepancy
                  ? 'bg-slate-900/95 border-amber-500/50 shadow-md shadow-amber-500/10'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-slate-800/80">
                  <div>
                    <span className="font-mono text-xs font-bold text-sky-400">{part.id}</span>
                    <h3 className="text-sm font-bold text-white tracking-tight leading-snug mt-0.5">
                      {part.name}
                    </h3>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border ${
                      isAged
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {part.snapshot_freshness} Snapshot
                  </span>
                </div>

                {/* Technical Prose Description */}
                <p className="text-xs text-slate-300 leading-relaxed mb-3 line-clamp-3">
                  {part.technical_description}
                </p>

                {/* Compatibility Prose Notes */}
                {part.compatibility_notes && (
                  <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 mb-3">
                    <strong className="text-slate-300 block mb-0.5">Compatibility Notes:</strong>
                    {part.compatibility_notes}
                  </div>
                )}

                {/* Technical Specification Chips */}
                <div className="grid grid-cols-3 gap-1.5 mb-3 text-center text-xs font-mono">
                  <div className="p-1.5 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300">
                    <span className="text-[9px] text-slate-400 block font-sans">Voltage</span>
                    <span className="font-bold">{part.voltage}V</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300">
                    <span className="text-[9px] text-slate-400 block font-sans">Wattage</span>
                    <span className="font-bold">{part.wattage}W</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-sky-950/40 border border-sky-800/40 text-sky-300 truncate" title={part.connector}>
                    <span className="text-[9px] text-slate-400 block font-sans">Connector</span>
                    <span className="font-medium text-[11px]">{part.connector}</span>
                  </div>
                </div>
              </div>

              {/* Stock Status Section (Labels: AVAILABLE, UNAVAILABLE, UNCERTAIN, VERIFICATION REQUIRED) */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                {/* Official Stock Status Label */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">Stock Status:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-slate-400 font-sans">Snapshot Stock:</span>
                  <span className="font-bold text-slate-300">{part.snapshot_quantity} unit(s)</span>
                </div>

                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-slate-400 font-sans">Active Ledger Units:</span>
                  <span className={`font-bold ${part.current_stock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {part.current_stock} unit(s) available
                  </span>
                </div>

                {part.verified_quantity !== null && part.verified_quantity !== undefined && (
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-slate-400 font-sans">Warehouse Verification:</span>
                    <span className="font-bold text-sky-400">{part.verified_quantity} unit(s)</span>
                  </div>
                )}

                {/* Discrepancy Alert Tag */}
                {part.has_discrepancy && (
                  <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-600/50 text-[11px] text-amber-300 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="block">Discrepancy: {part.discrepancy_type}</strong>
                      {part.discrepancy_type === 'OVERSTATED' ? (
                        <span>Aged snapshot showed 1 unit, but warehouse has 0. Protected from false dispatch!</span>
                      ) : (
                        <span>Aged snapshot showed 0, but warehouse tool found 1 unit. Stock discovered!</span>
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
