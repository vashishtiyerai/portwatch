import React from 'react';
import { AlertOctagon, X } from 'lucide-react';
import { PortInfo, ProcessInfo } from '../types';

interface ConfirmDialogProps {
  isOpen: boolean;
  port: PortInfo | null;
  processInfo: ProcessInfo | null;
  force: boolean;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  port,
  processInfo,
  force,
  isSubmitting,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !port) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#0f172a] border border-white/10 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${force ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {force ? 'Force Kill Process?' : 'Free Port & Terminate Process?'}
              </h3>
              <p className="text-xs text-slate-400">
                Port <span className="font-mono text-cyan-400 font-semibold">{port.port}</span> is currently in use.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#090d16] border border-white/5 rounded-lg p-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Target Process:</span>
            <span className="font-mono font-semibold text-white">{port.processName || 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">PID:</span>
            <span className="font-mono text-amber-300 font-semibold">{port.pid || 'Unknown'}</span>
          </div>
          {processInfo?.commandLine && (
            <div>
              <span className="text-slate-400 block mb-0.5">Command:</span>
              <p className="font-mono text-slate-300 bg-white/5 p-1.5 rounded break-all max-h-20 overflow-y-auto">
                {processInfo.commandLine}
              </p>
            </div>
          )}
          {processInfo?.workingDirectory && (
            <div>
              <span className="text-slate-400 block mb-0.5">Working Directory:</span>
              <p className="font-mono text-slate-400 truncate">
                {processInfo.workingDirectory}
              </p>
            </div>
          )}
        </div>

        {force ? (
          <p className="text-xs text-rose-400/90 leading-relaxed">
            ⚠️ Force kill immediately terminates the process without giving it an opportunity to gracefully flush data. Unsaved state may be lost.
          </p>
        ) : (
          <p className="text-xs text-slate-400 leading-relaxed">
            PortWatch will signal this process to terminate cleanly and actively poll the local socket table to verify port release.
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className={`px-4 py-2 text-xs font-medium text-white rounded-lg transition-colors flex items-center gap-2 ${
              force
                ? 'bg-rose-600 hover:bg-rose-500'
                : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            {isSubmitting ? 'Freeing...' : (force ? 'Force Kill' : 'Terminate & Free Port')}
          </button>
        </div>
      </div>
    </div>
  );
};
