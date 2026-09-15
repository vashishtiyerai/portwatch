import React from 'react';
import { CornerDownRight } from 'lucide-react';
import { ProcessTreeNode } from '../types';

interface ProcessTreeProps {
  tree: ProcessTreeNode | null;
  targetPid: number;
}

export const ProcessTree: React.FC<ProcessTreeProps> = ({ tree, targetPid }) => {
  if (!tree) return null;

  return (
    <div className="space-y-1.5 font-mono text-xs">
      <TreeNodeItem node={tree} targetPid={targetPid} level={0} />
    </div>
  );
};

const TreeNodeItem: React.FC<{ node: ProcessTreeNode; targetPid: number; level: number }> = ({
  node,
  targetPid,
  level,
}) => {
  const isTarget = node.pid === targetPid;

  return (
    <div className="space-y-1">
      <div
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors ${
          isTarget
            ? 'bg-indigo-600/20 border-indigo-500/40 text-white font-semibold'
            : 'bg-white/[0.02] border-white/5 text-slate-300'
        }`}
        style={{ marginLeft: `${level * 16}px` }}
      >
        {level > 0 && <CornerDownRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
        <span className="truncate">{node.name}</span>
        <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded ml-auto shrink-0 font-normal">
          PID {node.pid}
        </span>
      </div>

      {node.children && node.children.length > 0 && (
        <div className="space-y-1">
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.pid}
              node={child}
              targetPid={targetPid}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
