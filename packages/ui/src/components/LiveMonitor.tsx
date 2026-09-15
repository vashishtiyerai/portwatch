import React from 'react';
import { Radio, ArrowUpRight, ArrowDownLeft, Trash2 } from 'lucide-react';
import { HistoryEvent } from '../types';

interface LiveMonitorProps {
  events: HistoryEvent[];
  onClear: () => void;
  onSelectPortNumber: (port: number) => void;
}

export const LiveMonitor: React.FC<LiveMonitorProps> = ({
  events,
  onClear,
  onSelectPortNumber,
}) => {
  return (
    <div className="bg-[#131926] border border-white/10 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <h3 className="text-xs font-semibold text-slate-200">Live Socket Activity Feed</h3>
        </div>
        {events.length > 0 && (
          <button
            onClick={onClear}
            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <p className="text-xs text-slate-500 py-3 text-center">
          Listening for local socket open/close events...
        </p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-xs">
          {events.map((e) => {
            const isOpened = e.event === 'opened';
            return (
              <div
                key={e.id}
                onClick={() => onSelectPortNumber(e.port)}
                className="flex items-center justify-between p-2 rounded bg-[#090d16] hover:bg-white/5 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isOpened ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  )}
                  <span className={`font-semibold ${isOpened ? 'text-emerald-300' : 'text-rose-300'}`}>
                    Port {e.port}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    {isOpened ? 'opened' : 'closed'}
                  </span>
                  {e.processName && (
                    <span className="text-slate-300">by {e.processName}</span>
                  )}
                  {e.pid && (
                    <span className="text-amber-400/80 text-[10px]">(PID {e.pid})</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500">
                  {new Date(e.timestamp).toLocaleTimeString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
