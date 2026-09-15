import React, { useEffect, useState } from 'react';
import { X, Copy, Check, Folder, Power, AlertTriangle, ShieldCheck, Cpu } from 'lucide-react';
import { PortInfo, ProcessInfo, ProcessTreeNode } from '../types';
import { fetchProcessInspection } from '../lib/api';
import { ProcessTree } from './ProcessTree';

interface PortDetailDrawerProps {
  port: PortInfo | null;
  onClose: () => void;
  onFreePort: (port: PortInfo, force?: boolean) => void;
  onCopyText: (text: string, label: string) => void;
}

export const PortDetailDrawer: React.FC<PortDetailDrawerProps> = ({
  port,
  onClose,
  onFreePort,
  onCopyText,
}) => {
  const [processData, setProcessData] = useState<{ process: ProcessInfo; tree: ProcessTreeNode | null } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (port && port.pid) {
      setIsLoading(true);
      fetchProcessInspection(port.pid)
        .then(data => setProcessData(data))
        .catch(() => setProcessData(null))
        .finally(() => setIsLoading(false));
    } else {
      setProcessData(null);
    }
  }, [port]);

  if (!port) return null;

  const handleCopy = (text: string, label: string, fieldId: string) => {
    onCopyText(text, label);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const proc = processData?.process;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-[#0f172a] border-l border-white/10 shadow-2xl flex flex-col animate-slide-in">
      {/* Drawer Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#090d16]/50">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xl font-bold text-cyan-400">{port.port}</span>
          <span className="text-xs font-mono uppercase bg-white/5 border border-white/10 px-2 py-0.5 rounded text-slate-300">
            {port.protocol}
          </span>
          <span className="text-xs flex items-center gap-1 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            {port.state}
          </span>
          {isLoading && (
            <span className="text-[10px] font-mono text-slate-400 animate-pulse">
              inspecting...
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
        {/* Process Overview Card */}
        <div className="bg-[#131926] border border-white/5 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Owning Process</h4>
            {port.pid && (
              <button
                onClick={() => handleCopy(String(port.pid), 'PID', 'pid')}
                className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-mono"
              >
                {copiedField === 'pid' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                Copy PID
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono">
            <div>
              <span className="text-slate-500 block text-[10px]">PROCESS NAME</span>
              <span className="text-white font-semibold text-sm">{port.processName || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">PID</span>
              <span className="text-amber-300 font-semibold text-sm">{port.pid ?? 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">LOCAL ADDRESS</span>
              <span className="text-slate-300">{port.localAddress}</span>
            </div>
            {proc?.startedAt && (
              <div>
                <span className="text-slate-500 block text-[10px]">STARTED AT</span>
                <span className="text-slate-300 text-[11px]">{new Date(proc.startedAt).toLocaleTimeString()}</span>
              </div>
            )}
            {proc?.cpuPercent !== null && proc?.cpuPercent !== undefined && (
              <div>
                <span className="text-slate-500 block text-[10px]">CPU USAGE</span>
                <span className="text-emerald-400 font-semibold text-xs">{proc.cpuPercent.toFixed(1)}%</span>
              </div>
            )}
            {proc?.memoryBytes !== null && proc?.memoryBytes !== undefined && (
              <div>
                <span className="text-slate-500 block text-[10px]">MEMORY</span>
                <span className="text-cyan-400 font-semibold text-xs">{(proc.memoryBytes / (1024 * 1024)).toFixed(1)} MB</span>
              </div>
            )}
          </div>
        </div>

        {/* Project Card (if detected) */}
        {port.project && (
          <div className="bg-[#131926] border border-white/5 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Detected Project</h4>
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-indigo-300">{port.project.name}</span>
              <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded text-[11px]">
                {port.project.framework || port.project.type}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-start gap-1 font-mono pt-1">
              <Folder className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
              <span className="break-all">{port.project.directory}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5">
              <span>Detected from: <span className="text-slate-300 font-mono">{port.project.detectedFrom}</span></span>
              {port.project.directory && port.project.directory !== 'System Service' && (
                <button
                  onClick={() => handleCopy(port.project?.directory || '', 'Project Directory', 'proj_dir')}
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-mono text-[10px]"
                >
                  {copiedField === 'proj_dir' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  Copy Path
                </button>
              )}
            </div>
          </div>
        )}

        {/* Command Line & Executable Paths */}
        {proc?.commandLine && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold text-[11px] uppercase tracking-wider">Command Line</span>
              <button
                onClick={() => handleCopy(proc.commandLine || '', 'Command', 'cmd')}
                className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
              >
                {copiedField === 'cmd' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                Copy Command
              </button>
            </div>
            <div className="bg-[#090d16] border border-white/5 rounded-lg p-3 font-mono text-[11px] text-slate-300 break-all leading-relaxed max-h-32 overflow-y-auto">
              {proc.commandLine}
            </div>
          </div>
        )}

        {proc?.executablePath && (
          <div className="space-y-1">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-400">Executable Path</span>
            <div className="bg-[#090d16] border border-white/5 rounded-lg p-2.5 font-mono text-[11px] text-slate-400 break-all">
              {proc.executablePath}
            </div>
          </div>
        )}

        {/* Process Tree */}
        {processData?.tree && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-[11px] uppercase tracking-wider">Process Tree</span>
            </div>
            <div className="bg-[#090d16] border border-white/5 rounded-lg p-3">
              <ProcessTree tree={processData.tree} targetPid={port.pid || 0} />
            </div>
          </div>
        )}
      </div>

      {/* Drawer Action Footer */}
      <div className="p-4 border-t border-white/10 bg-[#090d16]/50 flex items-center justify-between gap-2">
        <button
          onClick={() => onFreePort(port, true)}
          className="flex-1 py-2 px-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          title="Immediate force kill (SIGKILL)"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Force Kill
        </button>
        <button
          onClick={() => onFreePort(port, false)}
          className="flex-1 py-2 px-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
          title="Graceful process termination"
        >
          <Power className="w-3.5 h-3.5" />
          Kill
        </button>
        <button
          onClick={() => onFreePort(port, false)}
          className="flex-1 py-2 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow"
          title="Safely verify port release"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Free Port
        </button>
      </div>
    </div>
  );
};
