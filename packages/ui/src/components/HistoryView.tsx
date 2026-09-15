import React from 'react';
import { History, ArrowUpRight, ArrowDownLeft, Trash2 } from 'lucide-react';
import { HistoryEvent } from '../types';

interface HistoryViewProps {
  events: HistoryEvent[];
  onClear: () => void;
  onSelectPortNumber: (port: number) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  events,
  onClear,
  onSelectPortNumber,
}) => {
  return (
    <div className="bg-[#0f172a] border border-white/10 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 bg-[#131926] border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-400" />
          <h3 className="font-semibold text-white text-sm">Port Activity History</h3>
        </div>
        {events.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear History
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="py-16 text-center text-slate-400">
          <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium">No recorded port events</p>
          <p className="text-xs text-slate-500 mt-1">
            Socket openings and terminations will appear here as they occur.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/5 text-xs font-mono">
          {events.map((e) => {
            const isOpened = e.event === 'opened';
            return (
              <div
                key={e.id}
                onClick={() => onSelectPortNumber(e.port)}
                className="p-3.5 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${isOpened ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {isOpened ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        Port {e.port}
                      </span>
                      <span className={`text-[11px] font-semibold uppercase ${isOpened ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {e.event}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase bg-white/5 px-1.5 py-0.5 rounded">
                        {e.protocol}
                      </span>
                    </div>
                    {(e.processName || e.project) && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {e.processName ? `Process: ${e.processName}` : ''}
                        {e.pid ? ` (PID ${e.pid})` : ''}
                        {e.project ? ` • Project: ${e.project}` : ''}
                      </p>
                    )}
                  </div>
                </div>

                <span className="text-slate-500 text-[11px]">
                  {new Date(e.timestamp).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
