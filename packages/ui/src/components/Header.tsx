import React from 'react';
import { Search, RefreshCw, Radio, Layers, History, Stethoscope, Settings, HelpCircle, Sun, Moon, Info } from 'lucide-react';

interface HeaderProps {
  activeTab: 'overview' | 'projects' | 'history';
  setActiveTab: (tab: 'overview' | 'projects' | 'history') => void;
  isWatching: boolean;
  setIsWatching: (watching: boolean | ((w: boolean) => boolean)) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenDoctor: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onOpenHelp: () => void;
  onOpenCommandPalette: () => void;
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  activeCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isWatching,
  setIsWatching,
  searchQuery,
  setSearchQuery,
  onRefresh,
  isRefreshing,
  onOpenDoctor,
  onOpenSettings,
  onOpenAbout,
  onOpenHelp,
  onOpenCommandPalette,
  theme,
  setTheme,
  activeCount,
}) => {
  return (
    <header className="border-b border-white/10 bg-[#0c101a]/80 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between gap-4">
      {/* Brand Identity */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('overview')}>
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 shadow-inner">
            <Radio className="w-4 h-4 text-indigo-400" />
            {isWatching && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-tight text-white text-base">PortWatch</span>
              <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.2 rounded">v0.1.0</span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Know what's using your ports</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-[#131926] p-1 rounded-lg border border-white/5">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview
            <span className={`text-[10px] font-mono px-1 rounded ${activeTab === 'overview' ? 'bg-indigo-700 text-white' : 'bg-white/5 text-slate-400'}`}>
              {activeCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'projects'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Projects
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            History
          </button>
        </nav>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-md relative hidden md:block">
        <div
          onClick={onOpenCommandPalette}
          className="flex items-center w-full px-3 py-1.5 text-xs bg-[#131926] border border-white/10 rounded-lg text-slate-400 hover:border-indigo-500/50 cursor-pointer transition-all group"
        >
          <Search className="w-3.5 h-3.5 mr-2 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          <input
            type="text"
            placeholder="Search ports, processes, PIDs, projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="bg-transparent border-none outline-none text-slate-200 placeholder-slate-500 w-full text-xs"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 font-mono text-[10px] bg-white/10 text-slate-400 px-1.5 py-0.5 rounded ml-2 shrink-0">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Actions & Utilities */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsWatching(w => !w)}
          title="Toggle live watch mode (W)"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            isWatching
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-950'
              : 'bg-[#131926] border-white/10 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className={`w-3.5 h-3.5 ${isWatching ? 'animate-pulse' : ''}`} />
          <span className="hidden sm:inline">{isWatching ? 'Watching' : 'Watch'}</span>
        </button>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh port list (R)"
          className="p-2 rounded-lg bg-[#131926] border border-white/10 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
        </button>

        <button
          onClick={onOpenDoctor}
          title="PortWatch Diagnostics"
          className="p-2 rounded-lg bg-[#131926] border border-white/10 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <Stethoscope className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenSettings}
          title="Settings"
          className="p-2 rounded-lg bg-[#131926] border border-white/10 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenAbout}
          title="About PortWatch"
          className="p-2 rounded-lg bg-[#131926] border border-white/10 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <Info className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onOpenHelp}
          title="Keyboard shortcuts (?)"
          className="p-2 rounded-lg bg-[#131926] border border-white/10 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Toggle theme"
          className="p-2 rounded-lg bg-[#131926] border border-white/10 text-slate-400 hover:text-slate-200 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};
