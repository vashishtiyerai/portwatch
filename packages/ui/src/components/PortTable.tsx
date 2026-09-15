import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Power, SearchX } from 'lucide-react';
import { PortInfo } from '../types';

interface PortTableProps {
  ports: PortInfo[];
  selectedPort: PortInfo | null;
  onSelectPort: (port: PortInfo) => void;
  onFreePort: (port: PortInfo, e: React.MouseEvent) => void;
  sortField: 'port' | 'processName' | 'pid' | 'state';
  sortAsc: boolean;
  onToggleSort: (field: 'port' | 'processName' | 'pid' | 'state') => void;
}

export const PortTable: React.FC<PortTableProps> = ({
  ports,
  selectedPort,
  onSelectPort,
  onFreePort,
  sortField,
  sortAsc,
  onToggleSort,
}) => {
  if (ports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 mb-3">
          <SearchX className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">No active ports matching filter</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          No listening or established sockets were discovered. Try adjusting your search query or protocol filters.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-white/10 text-[11px] font-medium text-slate-400 select-none">
            <th 
              className="py-2.5 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
              onClick={() => onToggleSort('port')}
            >
              <div className="flex items-center gap-1">
                PORT
                {sortField === 'port' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />) : <ArrowUpDown className="w-3 h-3 text-slate-500" />}
              </div>
            </th>
            <th className="py-2.5 px-4 font-semibold">PROTO</th>
            <th 
              className="py-2.5 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
              onClick={() => onToggleSort('processName')}
            >
              <div className="flex items-center gap-1">
                PROCESS
                {sortField === 'processName' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />) : <ArrowUpDown className="w-3 h-3 text-slate-500" />}
              </div>
            </th>
            <th 
              className="py-2.5 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
              onClick={() => onToggleSort('pid')}
            >
              <div className="flex items-center gap-1">
                PID
                {sortField === 'pid' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />) : <ArrowUpDown className="w-3 h-3 text-slate-500" />}
              </div>
            </th>
            <th className="py-2.5 px-4 font-semibold">ADDRESS</th>
            <th 
              className="py-2.5 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
              onClick={() => onToggleSort('state')}
            >
              <div className="flex items-center gap-1">
                STATUS
                {sortField === 'state' ? (sortAsc ? <ArrowUp className="w-3 h-3 text-indigo-400" /> : <ArrowDown className="w-3 h-3 text-indigo-400" />) : <ArrowUpDown className="w-3 h-3 text-slate-500" />}
              </div>
            </th>
            <th className="py-2.5 px-4 font-semibold">PROJECT / FRAMEWORK</th>
            <th className="py-2.5 px-4 font-semibold text-right">ACTIONS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 font-normal">
          {ports.map((p) => {
            const isSelected = selectedPort?.port === p.port && selectedPort?.protocol === p.protocol;
            const isListening = p.state === 'LISTENING';

            return (
              <tr
                key={`${p.protocol}-${p.port}-${p.pid || 0}`}
                onClick={() => onSelectPort(p)}
                className={`cursor-pointer transition-colors group ${
                  isSelected
                    ? 'bg-indigo-600/15 border-l-2 border-indigo-500'
                    : 'hover:bg-white/[0.03]'
                }`}
              >
                {/* Port */}
                <td className="py-2.5 px-4 font-mono font-bold text-cyan-400">
                  {p.port}
                </td>

                {/* Protocol */}
                <td className="py-2.5 px-4 font-mono uppercase text-slate-400">
                  {p.protocol}
                </td>

                {/* Process Name */}
                <td className="py-2.5 px-4 font-medium text-slate-200">
                  <span className="group-hover:text-white transition-colors">
                    {p.processName || (
                      <span className="text-slate-500 italic">Unknown</span>
                    )}
                  </span>
                </td>

                {/* PID */}
                <td className="py-2.5 px-4 font-mono text-amber-300">
                  {p.pid !== null ? p.pid : <span className="text-slate-600">-</span>}
                </td>

                {/* Address */}
                <td className="py-2.5 px-4 font-mono text-slate-400">
                  {p.localAddress}
                </td>

                {/* Status */}
                <td className="py-2.5 px-4">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
                    <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50' : 'bg-blue-400'}`} />
                    <span className={isListening ? 'text-emerald-300' : 'text-blue-300'}>
                      {p.state}
                    </span>
                  </span>
                </td>

                {/* Project */}
                <td className="py-2.5 px-4">
                  {p.project ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-medium max-w-[200px] truncate">
                      {p.project.name}
                      {p.project.framework && (
                        <span className="text-indigo-400/80 font-normal">({p.project.framework})</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-600">-</span>
                  )}
                </td>

                {/* Actions */}
                <td className="py-2.5 px-4 text-right">
                  <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onSelectPort(p)}
                      title="Inspect process details"
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => onFreePort(p, e)}
                      title="Free this port"
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
