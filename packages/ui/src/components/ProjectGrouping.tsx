import React from 'react';
import { Folder, Layers, Power, ExternalLink } from 'lucide-react';
import { PortInfo } from '../types';

interface ProjectGroupingProps {
  ports: PortInfo[];
  onSelectPort: (port: PortInfo) => void;
  onFreePort: (port: PortInfo, e: React.MouseEvent) => void;
}

export const ProjectGrouping: React.FC<ProjectGroupingProps> = ({
  ports,
  onSelectPort,
  onFreePort,
}) => {
  // Group ports by detected project name or "Unassigned / System"
  const groups = new Map<string, { project: PortInfo['project']; ports: PortInfo[] }>();

  for (const port of ports) {
    const groupKey = port.project ? port.project.name : 'System & Standalone Services';
    const existing = groups.get(groupKey) || { project: port.project, ports: [] };
    existing.ports.push(port);
    groups.set(groupKey, existing);
  }

  return (
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([projectName, { project, ports: groupPorts }]) => (
        <div
          key={projectName}
          className="bg-[#0f172a] border border-white/10 rounded-xl overflow-hidden shadow-sm"
        >
          {/* Group Header */}
          <div className="p-4 bg-[#131926] border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                {project ? <Folder className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white text-sm">{projectName}</h3>
                  {project?.framework && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      {project.framework}
                    </span>
                  )}
                </div>
                {project?.directory && (
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-md">
                    {project.directory}
                  </p>
                )}
              </div>
            </div>

            <span className="text-xs text-slate-400 font-mono bg-white/5 px-2 py-0.5 rounded">
              {groupPorts.length} {groupPorts.length === 1 ? 'port' : 'ports'}
            </span>
          </div>

          {/* Group Ports Table */}
          <div className="divide-y divide-white/5">
            {groupPorts.map((p) => (
              <div
                key={`${p.protocol}-${p.port}`}
                onClick={() => onSelectPort(p)}
                className="p-3.5 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors text-xs"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-cyan-400 text-sm w-16">
                    {p.port}
                  </span>
                  <span className="font-mono uppercase text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-white/5">
                    {p.protocol}
                  </span>
                  <span className="font-medium text-slate-200">
                    {p.processName || 'Unknown'}
                  </span>
                  {p.pid && (
                    <span className="font-mono text-amber-300 text-[11px]">
                      PID {p.pid}
                    </span>
                  )}
                  <span className="text-emerald-400 text-[11px] flex items-center gap-1 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {p.state}
                  </span>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onSelectPort(p)}
                    className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Inspect"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => onFreePort(p, e)}
                    className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Free Port"
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
