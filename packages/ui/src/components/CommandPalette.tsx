import React, { useState, useEffect, useRef } from 'react';
import { Search, RefreshCw, Radio, Sun, Stethoscope, Settings, Trash2, ArrowRight, Info } from 'lucide-react';
import { PortInfo } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  ports: PortInfo[];
  onSelectPort: (port: PortInfo) => void;
  onRefresh: () => void;
  onToggleWatch: () => void;
  onToggleTheme: () => void;
  onOpenDoctor: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onClearHistory: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  ports,
  onSelectPort,
  onRefresh,
  onToggleWatch,
  onToggleTheme,
  onOpenDoctor,
  onOpenSettings,
  onOpenAbout,
  onClearHistory,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredPorts = query.trim()
    ? ports.filter(p => 
        String(p.port).includes(query) ||
        p.processName?.toLowerCase().includes(query.toLowerCase()) ||
        String(p.pid).includes(query) ||
        p.project?.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  const actions = [
    { label: 'Refresh Local Ports', icon: <RefreshCw className="w-4 h-4" />, run: onRefresh },
    { label: 'Toggle Live Watch Mode', icon: <Radio className="w-4 h-4" />, run: onToggleWatch },
    { label: 'Toggle Dark / Light Theme', icon: <Sun className="w-4 h-4" />, run: onToggleTheme },
    { label: 'Run PortWatch Doctor Diagnostics', icon: <Stethoscope className="w-4 h-4" />, run: onOpenDoctor },
    { label: 'Open Settings', icon: <Settings className="w-4 h-4" />, run: onOpenSettings },
    { label: 'About PortWatch', icon: <Info className="w-4 h-4" />, run: onOpenAbout },
    { label: 'Clear Port Activity History', icon: <Trash2 className="w-4 h-4" />, run: onClearHistory },
  ].filter(a => !query || a.label.toLowerCase().includes(query.toLowerCase()));

  const handleActionClick = (run: () => void) => {
    run();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-[#0f172a] border border-white/10 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3.5 border-b border-white/10 flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a port, process name, or command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-white text-sm w-full placeholder-slate-500"
          />
          <kbd className="text-[10px] font-mono bg-white/10 text-slate-400 px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-2 text-xs divide-y divide-white/5">
          {filteredPorts.length > 0 && (
            <div className="pb-2 space-y-1">
              <span className="text-[10px] uppercase font-semibold text-slate-500 px-2.5">Matching Ports</span>
              {filteredPorts.map((p) => (
                <div
                  key={`${p.protocol}-${p.port}`}
                  onClick={() => { onSelectPort(p); onClose(); }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-indigo-600/20 text-slate-200 hover:text-white cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-cyan-400 text-sm">:{p.port}</span>
                    <span className="font-medium">{p.processName || 'Unknown'}</span>
                    {p.pid && <span className="font-mono text-amber-400 text-[10px]">PID {p.pid}</span>}
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500 px-2.5">Actions</span>
            {actions.map((act, i) => (
              <div
                key={i}
                onClick={() => handleActionClick(act.run)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white cursor-pointer transition-colors"
              >
                <div className="text-slate-400">{act.icon}</div>
                <span>{act.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
