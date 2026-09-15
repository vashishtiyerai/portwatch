import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import { PlatformProvider, PortInfo, ProcessInfo, ProcessTreeNode, DiagnosticReport, Protocol } from '../types';

export const execAsync = promisify(exec);
export const execFileAsync = promisify(execFile);

export abstract class BasePlatformProvider implements PlatformProvider {
  abstract readonly platformName: string;

  abstract listPorts(): Promise<PortInfo[]>;
  abstract inspect(pid: number): Promise<ProcessInfo | null>;
  abstract killProcess(pid: number, force?: boolean): Promise<boolean>;
  abstract getDiagnostics(): Promise<DiagnosticReport>;

  async findPort(port: number, protocol?: Protocol): Promise<PortInfo | null> {
    const ports = await this.listPorts();
    const match = ports.find(p => p.port === port && (!protocol || p.protocol === protocol));
    return match || null;
  }

  async listProcesses(): Promise<ProcessInfo[]> {
    return [];
  }

  async getProcessTree(pid: number): Promise<ProcessTreeNode | null> {
    const target = await this.inspect(pid);
    if (!target) return null;

    const root: ProcessTreeNode = {
      pid: target.pid,
      name: target.name,
      commandLine: target.commandLine,
      children: []
    };

    try {
      const all = await this.listProcesses();
      const childrenMap = new Map<number, ProcessInfo[]>();
      for (const p of all) {
        if (p.parentPid) {
          const list = childrenMap.get(p.parentPid) || [];
          list.push(p);
          childrenMap.set(p.parentPid, list);
        }
      }

      const visited = new Set<number>([root.pid]);
      const buildSubtree = (node: ProcessTreeNode) => {
        const children = childrenMap.get(node.pid) || [];
        for (const child of children) {
          if (visited.has(child.pid)) continue;
          visited.add(child.pid);
          const childNode: ProcessTreeNode = {
            pid: child.pid,
            name: child.name,
            commandLine: child.commandLine,
            children: []
          };
          buildSubtree(childNode);
          node.children.push(childNode);
        }
      };

      buildSubtree(root);
    } catch {
      // Fallback: return single node if listing tree fails
    }

    return root;
  }
}
