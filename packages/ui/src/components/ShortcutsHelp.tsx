import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsHelp: React.FC<ShortcutsHelpProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '⌘ K / Ctrl K', desc: 'Open command palette & search' },
    { key: '/', desc: 'Quick search' },
    { key: 'R', desc: 'Refresh local port sockets' },
    { key: 'W', desc: 'Toggle live watch monitoring mode' },
    { key: 'Esc', desc: 'Close drawer or modal' },
    { key: 'F', desc: 'Free currently selected port' },
    { key: 'K', desc: 'Kill currently selected process' },
    { key: '?', desc: 'Show keyboard shortcuts' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#0f172a] border border-white/10 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-white text-sm">Keyboard Shortcuts</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-xs">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1 border-b border-white/5 last:border-none">
              <span className="text-slate-300">{s.desc}</span>
              <kbd className="font-mono text-[11px] bg-white/10 text-indigo-300 px-2 py-0.5 rounded border border-white/10">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
