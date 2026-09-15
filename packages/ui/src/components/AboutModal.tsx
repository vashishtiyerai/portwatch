import React from 'react';
import { X, Radio, Github, ExternalLink, ShieldCheck, Cpu, Terminal } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDoctor: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, onOpenDoctor }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#0f172a] border border-white/10 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">PortWatch</h3>
                <span className="text-[10px] font-mono bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">
                  v0.1.0
                </span>
              </div>
              <p className="text-xs text-slate-400">Know what's using your ports.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed">
          PortWatch is a fast, cross-platform developer utility and local port intelligence layer that lets developers discover, inspect, monitor, and manage local network sockets and the processes using them.
        </p>

        {/* Key Tenets */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#131926] border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-400 font-medium">
              <Terminal className="w-3.5 h-3.5" />
              <span>Instant Discovery</span>
            </div>
            <p className="text-[11px] text-slate-400">Instant socket and PID identification without guesswork.</p>
          </div>

          <div className="p-3 rounded-lg bg-[#131926] border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Safe & Local</span>
            </div>
            <p className="text-[11px] text-slate-400">100% local, telemetry-free, with critical system process guards.</p>
          </div>
        </div>

        {/* Architecture & License */}
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between py-1.5 border-b border-white/5 text-slate-400">
            <span>Architecture</span>
            <span className="text-slate-200">Core Engine + Platform Provider + UI</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-white/5 text-slate-400">
            <span>License</span>
            <span className="text-slate-200">MIT Open Source License</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-white/5 text-slate-400">
            <span>Target Platforms</span>
            <span className="text-slate-200">Windows, macOS, Linux</span>
          </div>
        </div>

        {/* Actions & Links */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            onClick={() => {
              onClose();
              onOpenDoctor();
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
          >
            <Cpu className="w-3.5 h-3.5" />
            Run Diagnostics (Doctor)
          </button>

          <a
            href="https://github.com/portwatch/portwatch"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            GitHub Repository
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>
        </div>
      </div>
    </div>
  );
};
