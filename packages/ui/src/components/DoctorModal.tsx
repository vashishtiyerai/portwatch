import React, { useState, useEffect } from 'react';
import { X, Stethoscope, CheckCircle2, AlertTriangle, XCircle, Copy, Check, RefreshCw } from 'lucide-react';
import { DiagnosticReport } from '../types';
import { fetchDiagnostics } from '../lib/api';

interface DoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopyText: (text: string, label: string) => void;
}

export const DoctorModal: React.FC<DoctorModalProps> = ({ isOpen, onClose, onCopyText }) => {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadReport = () => {
    setIsLoading(true);
    fetchDiagnostics()
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      loadReport();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyReport = () => {
    if (!report) return;
    const lines = [
      'PortWatch Diagnostics Report',
      '────────────────────────────',
      `Version:     ${report.version}`,
      `OS:          ${report.os}`,
      `Platform:    ${report.platform} (${report.arch})`,
      `Provider:    ${report.providerName}`,
      `Permissions: ${report.isElevated ? 'Elevated' : 'Standard'}`,
      `Timestamp:   ${report.timestamp}`,
      '',
      'Checks:',
      ...report.checks.map(c => `[${c.status}] ${c.name}: ${c.message} ${c.details ? '(' + c.details + ')' : ''}`),
      '────────────────────────────',
    ];
    onCopyText(lines.join('\n'), 'Doctor Report');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#0f172a] border border-white/10 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">PortWatch Doctor</h3>
              <p className="text-xs text-slate-400">Environment & diagnostic verification</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mb-2" />
            Running system diagnostics...
          </div>
        ) : report ? (
          <div className="space-y-4">
            <div className="bg-[#090d16] border border-white/5 rounded-lg p-3 text-xs font-mono grid grid-cols-2 gap-2 text-slate-300">
              <div><span className="text-slate-500">OS:</span> {report.os}</div>
              <div><span className="text-slate-500">Arch:</span> {report.arch}</div>
              <div className="col-span-2"><span className="text-slate-500">Provider:</span> {report.providerName}</div>
              <div className="col-span-2">
                <span className="text-slate-500">Permissions:</span>{' '}
                <span className={report.isElevated ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                  {report.isElevated ? 'Elevated (Full Access)' : 'Standard User'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Checks</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {report.checks.map((check, idx) => {
                  const icon = check.status === 'PASS' 
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    : (check.status === 'WARN' ? <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-400 shrink-0" />);
                  return (
                    <div key={idx} className="p-2.5 rounded bg-[#131926] border border-white/5 flex items-start gap-2.5 text-xs">
                      {icon}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-200">{check.name}</span>
                          <span className={`text-[10px] font-mono px-1 rounded ${check.status === 'PASS' ? 'text-emerald-400 bg-emerald-400/10' : 'text-amber-400 bg-amber-400/10'}`}>
                            {check.status}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] mt-0.5">{check.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-rose-400 py-6 text-center">Failed to load diagnostics.</p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            onClick={loadReport}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Re-run Checks
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReport}
              disabled={!report}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy for GitHub'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
