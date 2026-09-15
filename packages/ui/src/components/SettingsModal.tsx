import React from 'react';
import { X, Settings, Shield, Sliders, Moon, RefreshCw, Trash2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  refreshInterval: number;
  setRefreshInterval: (i: number) => void;
  confirmKill: boolean;
  setConfirmKill: (c: boolean) => void;
  allowForceKill: boolean;
  setAllowForceKill: (a: boolean) => void;
  onResetData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  setTheme,
  refreshInterval,
  setRefreshInterval,
  confirmKill,
  setConfirmKill,
  allowForceKill,
  setAllowForceKill,
  onResetData,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#0f172a] border border-white/10 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Settings</h3>
              <p className="text-xs text-slate-400">PortWatch Preferences</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Appearance */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5" /> Appearance
            </h4>
            <div className="flex items-center justify-between p-3 bg-[#131926] rounded-lg border border-white/5">
              <span className="text-slate-200">Color Theme</span>
              <div className="flex gap-1 bg-[#090d16] p-1 rounded-md">
                <button
                  onClick={() => setTheme('dark')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${theme === 'dark' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Dark
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${theme === 'light' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Light
                </button>
              </div>
            </div>
          </div>

          {/* Monitoring */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Monitoring
            </h4>
            <div className="flex items-center justify-between p-3 bg-[#131926] rounded-lg border border-white/5">
              <div>
                <span className="text-slate-200 block">Polling Interval</span>
                <span className="text-[11px] text-slate-400">Frequency of background socket discovery</span>
              </div>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-[#090d16] border border-white/10 text-slate-200 text-xs rounded-md px-2 py-1 outline-none"
              >
                <option value={1000}>1 second</option>
                <option value={2000}>2 seconds</option>
                <option value={5000}>5 seconds</option>
              </select>
            </div>
          </div>

          {/* Safety */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Safety & Process Control
            </h4>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 bg-[#131926] rounded-lg border border-white/5 cursor-pointer">
                <div>
                  <span className="text-slate-200 block">Confirm Before Killing</span>
                  <span className="text-[11px] text-slate-400">Display confirmation modal with command preview</span>
                </div>
                <input
                  type="checkbox"
                  checked={confirmKill}
                  onChange={(e) => setConfirmKill(e.target.checked)}
                  className="rounded bg-[#090d16] border-white/10 text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-[#131926] rounded-lg border border-white/5 cursor-pointer">
                <div>
                  <span className="text-slate-200 block">Allow Force Kill</span>
                  <span className="text-[11px] text-slate-400">Enable direct SIGKILL / /F termination button</span>
                </div>
                <input
                  type="checkbox"
                  checked={allowForceKill}
                  onChange={(e) => setAllowForceKill(e.target.checked)}
                  className="rounded bg-[#090d16] border-white/10 text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Local Data */}
          <div className="space-y-2 pt-1">
            <h4 className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> Advanced
            </h4>
            <button
              onClick={onResetData}
              className="w-full p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Local Storage & History
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
