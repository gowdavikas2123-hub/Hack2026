import React, { useState } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Inbox,
  Cpu,
  Package,
  UserCheck,
  FileSearch,
  DollarSign,
  PlaySquare,
  Settings,
  RotateCcw,
  Menu,
  X,
  Sparkles
} from 'lucide-react';

export type NavTabId =
  | 'dashboard'
  | 'newRequest'
  | 'allRequests'
  | 'agentActivity'
  | 'inventory'
  | 'humanReview'
  | 'evidence'
  | 'budget'
  | 'batchReports'
  | 'settings';

interface NavbarProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  pendingReviewCount: number;
  totalRequestsCount: number;
  availableStockCount: number;
  isAgentRunning: boolean;
  llmMode: string;
  toolMode: string;
  onReset: () => void;
  isResetting: boolean;
}

interface NavItem {
  id: NavTabId;
  label: string;
  icon: any;
  badge?: string | number;
  badgeColor?: string;
  isLive?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  pendingReviewCount,
  totalRequestsCount,
  availableStockCount,
  isAgentRunning,
  llmMode,
  toolMode,
  onReset,
  isResetting,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'newRequest', label: 'New Request', icon: PlusCircle },
    { id: 'allRequests', label: 'All Requests', icon: Inbox, badge: totalRequestsCount > 0 ? totalRequestsCount : undefined },
    { id: 'agentActivity', label: 'AI Agent Activity', icon: Cpu, isLive: isAgentRunning },
    { id: 'inventory', label: 'Inventory', icon: Package, badge: availableStockCount > 0 ? `${availableStockCount} units` : undefined },
    {
      id: 'humanReview',
      label: 'Human Review',
      icon: UserCheck,
      badge: pendingReviewCount > 0 ? pendingReviewCount : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    { id: 'evidence', label: 'Evidence Explorer', icon: FileSearch },
    { id: 'budget', label: 'Budget & Usage', icon: DollarSign },
    { id: 'batchReports', label: 'Batch Reports', icon: PlaySquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleTabClick = (id: NavTabId) => {
    onSelectTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-md sticky top-0 z-50">
      {/* Top Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-lg shadow-sky-500/20 text-white flex-shrink-0">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">Workshop Parts Desk</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 font-semibold uppercase">
                Agentic AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Intelligent Parts Inspection, Warehouse Verification & Autonomous Dispatch
            </p>
          </div>
        </div>

        {/* Right Status & Global Controls */}
        <div className="flex items-center gap-2.5">
          {/* Agent Status Pill */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px]">
            <span className="text-slate-400">Agent:</span>
            <span className={`font-semibold flex items-center gap-1.5 ${isAgentRunning ? 'text-sky-400' : 'text-emerald-400'}`}>
              <span className={`w-2 h-2 rounded-full ${isAgentRunning ? 'bg-sky-400 animate-ping' : 'bg-emerald-400'}`} />
              {isAgentRunning ? 'Processing' : 'Idle'}
            </span>
          </div>

          {/* Reset Demo Scenario Button */}
          <button
            onClick={() => {
              if (window.confirm('Reset demo environment to the pristine challenge state (6 requests, 12 catalogue parts, 2 aged discrepancies)?')) {
                onReset();
              }
            }}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition disabled:opacity-50"
            title="Reset scenario to pristine challenge state"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isResetting ? 'Resetting...' : 'Reset Demo'}</span>
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Desktop Navigation Tabs */}
      <div className="hidden lg:block border-t border-slate-800/80 bg-slate-950/40 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto py-1 text-xs font-medium scrollbar-thin">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id as NavTabId)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition whitespace-nowrap relative ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${item.isLive ? 'animate-spin text-sky-300' : ''}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold border ${
                      item.badgeColor || (isActive ? 'bg-sky-800/80 text-white border-sky-400/40' : 'bg-slate-800 text-slate-300 border-slate-700')
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id as NavTabId)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
