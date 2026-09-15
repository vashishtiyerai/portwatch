import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { PortTable } from './components/PortTable';
import { PortDetailDrawer } from './components/PortDetailDrawer';
import { ProjectGrouping } from './components/ProjectGrouping';
import { HistoryView } from './components/HistoryView';
import { LiveMonitor } from './components/LiveMonitor';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DoctorModal } from './components/DoctorModal';
import { SettingsModal } from './components/SettingsModal';
import { AboutModal } from './components/AboutModal';
import { ShortcutsHelp } from './components/ShortcutsHelp';
import { CommandPalette } from './components/CommandPalette';
import { ToastContainer, ToastMessage } from './components/Toast';
import { PortInfo, HistoryEvent, ProcessInfo } from './types';
import { fetchPorts, freePort, fetchHistory, clearHistory, fetchProcessInspection } from './lib/api';
import { AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  // Main states
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [selectedPort, setSelectedPort] = useState<PortInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'history'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [protocolFilter, setProtocolFilter] = useState<'all' | 'tcp' | 'udp'>('all');
  const [stateFilter, setStateFilter] = useState<'all' | 'listening' | 'established'>('all');
  const [isWatching, setIsWatching] = useState(false);
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<'port' | 'processName' | 'pid' | 'state'>('port');
  const [sortAsc, setSortAsc] = useState(true);

  // Preferences
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [refreshInterval, setRefreshInterval] = useState(2000);
  const [confirmKill, setConfirmKill] = useState(true);
  const [allowForceKill, setAllowForceKill] = useState(true);

  // Modals & UI overlays
  const [isDoctorOpen, setIsDoctorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Confirmation modal state
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    port: PortInfo | null;
    force: boolean;
    processInfo: ProcessInfo | null;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    port: null,
    force: false,
    processInfo: null,
    isSubmitting: false,
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Sync theme class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Load ports
  const loadPorts = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchPorts();
      setPorts(data);
      setServerError(null);

      // Keep selected port updated if still present
      if (selectedPort) {
        const found = data.find(p => p.port === selectedPort.port && p.protocol === selectedPort.protocol);
        setSelectedPort(found || null);
      }
    } catch (err: any) {
      setServerError(err.message || 'Could not connect to PortWatch API service');
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedPort]);

  // Load history
  const loadHistory = useCallback(async () => {
    try {
      const data = await fetchHistory();
      setHistoryEvents(data);
    } catch {
      // Ignore
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadPorts();
    loadHistory();
  }, []);

  // Live Watch mode interval
  useEffect(() => {
    if (!isWatching) return;
    const timer = setInterval(() => {
      loadPorts();
      loadHistory();
    }, refreshInterval);
    return () => clearInterval(timer);
  }, [isWatching, refreshInterval, loadPorts, loadHistory]);

  // Server-Sent Events (SSE) listener for instant live notifications
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/events');
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'history' && Array.isArray(data.events)) {
            setHistoryEvents((prev) => [...data.events, ...prev].slice(0, 100));
            if (data.ports) {
              setPorts(data.ports);
            }
          }
        } catch {}
      };
    } catch {}

    return () => {
      es?.close();
    };
  }, []);

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
        return;
      }

      // If typing in input, don't trigger single-key hotkeys
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === '/') {
        e.preventDefault();
        setIsPaletteOpen(true);
      } else if (e.key === 'Escape') {
        setSelectedPort(null);
        setIsDoctorOpen(false);
        setIsSettingsOpen(false);
        setIsAboutOpen(false);
        setIsHelpOpen(false);
        setIsPaletteOpen(false);
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        loadPorts();
        addToast({ type: 'info', title: 'Refreshed active ports' });
      } else if (e.key.toLowerCase() === 'w') {
        e.preventDefault();
        setIsWatching(w => !w);
      } else if (e.key === '?') {
        e.preventDefault();
        setIsHelpOpen(prev => !prev);
      } else if (e.key.toLowerCase() === 'f' && selectedPort) {
        e.preventDefault();
        triggerFreePort(selectedPort, false);
      } else if (e.key.toLowerCase() === 'k' && selectedPort) {
        e.preventDefault();
        triggerFreePort(selectedPort, true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPort, loadPorts, addToast]);

  // Trigger free port (with or without confirm modal)
  const triggerFreePort = async (port: PortInfo, force: boolean = false) => {
    if (confirmKill) {
      let proc: ProcessInfo | null = null;
      if (port.pid) {
        try {
          const res = await fetchProcessInspection(port.pid);
          proc = res.process;
        } catch {}
      }
      setConfirmState({
        isOpen: true,
        port,
        force,
        processInfo: proc,
        isSubmitting: false,
      });
    } else {
      executeFreePort(port, force);
    }
  };

  const executeFreePort = async (port: PortInfo, force: boolean) => {
    setConfirmState(prev => ({ ...prev, isSubmitting: true }));
    try {
      const res = await freePort(port.port, force);
      if (res.success) {
        addToast({
          type: 'success',
          title: `Port ${port.port} Freed`,
          description: res.message,
        });
        setSelectedPort(null);
        setConfirmState(prev => ({ ...prev, isOpen: false, isSubmitting: false }));
        loadPorts();
        loadHistory();
      } else {
        addToast({
          type: 'error',
          title: `Failed to Free Port ${port.port}`,
          description: res.message,
        });
        setConfirmState(prev => ({ ...prev, isSubmitting: false }));
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error executing port free',
        description: err.message,
      });
      setConfirmState(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleClearHistory = async () => {
    await clearHistory();
    setHistoryEvents([]);
    addToast({ type: 'info', title: 'Port history cleared' });
  };

  const handleResetData = () => {
    handleClearHistory();
    localStorage.clear();
    setIsSettingsOpen(false);
    addToast({ type: 'info', title: 'Local settings and data reset' });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast({ type: 'success', title: `Copied ${label} to clipboard` });
  };

  const toggleSort = (field: 'port' | 'processName' | 'pid' | 'state') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Filter and sort ports
  const filteredPorts = useMemo(() => {
    return ports.filter((p) => {
      // Protocol filter
      if (protocolFilter !== 'all' && p.protocol !== protocolFilter) return false;

      // State filter
      if (stateFilter !== 'all' && p.state.toLowerCase() !== stateFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPort = String(p.port).includes(q);
        const matchesProcess = p.processName?.toLowerCase().includes(q);
        const matchesPid = String(p.pid).includes(q);
        const matchesAddr = p.localAddress.toLowerCase().includes(q);
        const matchesProject = p.project?.name.toLowerCase().includes(q) || p.project?.framework?.toLowerCase().includes(q);
        if (!matchesPort && !matchesProcess && !matchesPid && !matchesAddr && !matchesProject) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? (Number(valA) - Number(valB)) : (Number(valB) - Number(valA));
    });
  }, [ports, protocolFilter, stateFilter, searchQuery, sortField, sortAsc]);

  return (
    <div className="min-h-screen bg-[#090d16] text-[#f1f5f9] flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isWatching={isWatching}
        setIsWatching={setIsWatching}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onRefresh={loadPorts}
        isRefreshing={isRefreshing}
        onOpenDoctor={() => setIsDoctorOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenCommandPalette={() => setIsPaletteOpen(true)}
        theme={theme}
        setTheme={setTheme}
        activeCount={ports.length}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Server connection warning if server is not reachable */}
        {serverError && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{serverError}. Run <code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded">portwatch ui</code> in your terminal to start the native port provider.</span>
            </div>
            <button
              onClick={loadPorts}
              className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 rounded font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Live Watch Banner if active */}
        {isWatching && (
          <LiveMonitor
            events={historyEvents.slice(0, 15)}
            onClear={handleClearHistory}
            onSelectPortNumber={(num) => {
              const match = ports.find(p => p.port === num);
              if (match) setSelectedPort(match);
            }}
          />
        )}

        {/* Filters Bar (when in Overview) */}
        {activeTab === 'overview' && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0f172a] border border-white/5 p-3 rounded-xl">
            <div className="flex items-center gap-3">
              {/* Protocol toggle */}
              <div className="flex items-center gap-1 bg-[#090d16] p-1 rounded-lg border border-white/5 text-xs">
                {(['all', 'tcp', 'udp'] as const).map((proto) => (
                  <button
                    key={proto}
                    onClick={() => setProtocolFilter(proto)}
                    className={`px-2.5 py-1 rounded font-mono uppercase text-[11px] font-medium transition-colors ${
                      protocolFilter === proto
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {proto}
                  </button>
                ))}
              </div>

              {/* State filter */}
              <div className="flex items-center gap-1 bg-[#090d16] p-1 rounded-lg border border-white/5 text-xs">
                {(['all', 'listening', 'established'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStateFilter(st)}
                    className={`px-2.5 py-1 rounded capitalize text-[11px] font-medium transition-colors ${
                      stateFilter === st
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Showing <span className="text-cyan-400 font-bold">{filteredPorts.length}</span> of {ports.length} ports
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="bg-[#0f172a] border border-white/10 rounded-xl overflow-hidden shadow-sm">
            <PortTable
              ports={filteredPorts}
              selectedPort={selectedPort}
              onSelectPort={(p) => setSelectedPort(p)}
              onFreePort={(p, e) => {
                e.stopPropagation();
                triggerFreePort(p, false);
              }}
              sortField={sortField}
              sortAsc={sortAsc}
              onToggleSort={toggleSort}
            />
          </div>
        )}

        {activeTab === 'projects' && (
          <ProjectGrouping
            ports={ports}
            onSelectPort={(p) => setSelectedPort(p)}
            onFreePort={(p, e) => {
              e.stopPropagation();
              triggerFreePort(p, false);
            }}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            events={historyEvents}
            onClear={handleClearHistory}
            onSelectPortNumber={(num) => {
              const match = ports.find(p => p.port === num);
              if (match) setSelectedPort(match);
            }}
          />
        )}
      </main>

      {/* Slide-over Detail Drawer */}
      <PortDetailDrawer
        port={selectedPort}
        onClose={() => setSelectedPort(null)}
        onFreePort={(p, force) => triggerFreePort(p, force)}
        onCopyText={copyToClipboard}
      />

      {/* Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        port={confirmState.port}
        processInfo={confirmState.processInfo}
        force={confirmState.force}
        isSubmitting={confirmState.isSubmitting}
        onConfirm={() => {
          if (confirmState.port) {
            executeFreePort(confirmState.port, confirmState.force);
          }
        }}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Doctor Modal */}
      <DoctorModal
        isOpen={isDoctorOpen}
        onClose={() => setIsDoctorOpen(false)}
        onCopyText={copyToClipboard}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        setTheme={setTheme}
        refreshInterval={refreshInterval}
        setRefreshInterval={setRefreshInterval}
        confirmKill={confirmKill}
        setConfirmKill={setConfirmKill}
        allowForceKill={allowForceKill}
        setAllowForceKill={setAllowForceKill}
        onResetData={handleResetData}
      />

      {/* Keyboard Shortcuts Help */}
      <ShortcutsHelp
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        ports={ports}
        onSelectPort={(p) => setSelectedPort(p)}
        onRefresh={() => { loadPorts(); addToast({ type: 'info', title: 'Refreshed ports' }); }}
        onToggleWatch={() => setIsWatching(w => !w)}
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        onOpenDoctor={() => setIsDoctorOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        onClearHistory={handleClearHistory}
      />

      {/* About Modal */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        onOpenDoctor={() => {
          setIsAboutOpen(false);
          setIsDoctorOpen(true);
        }}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
