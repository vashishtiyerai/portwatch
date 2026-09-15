import { PortInfo } from './types';

export interface PortFilterOptions {
  query?: string;
  protocol?: 'tcp' | 'udp' | 'all';
  state?: string;
  portRange?: { min: number; max: number };
  localhostOnly?: boolean;
}

export type PortSortField = 'port' | 'processName' | 'pid' | 'state' | 'protocol';

export function filterPorts(ports: PortInfo[], options: PortFilterOptions): PortInfo[] {
  return ports.filter(port => {
    // Protocol filter
    if (options.protocol && options.protocol !== 'all') {
      if (port.protocol !== options.protocol) return false;
    }

    // State filter
    if (options.state && options.state.toLowerCase() !== 'all') {
      if (port.state.toLowerCase() !== options.state.toLowerCase()) return false;
    }

    // Port range
    if (options.portRange) {
      if (port.port < options.portRange.min || port.port > options.portRange.max) return false;
    }

    // Localhost only
    if (options.localhostOnly) {
      const addr = port.localAddress.toLowerCase();
      const isLocal = addr === '127.0.0.1' || addr === 'localhost' || addr === '::1' || addr === '[::1]' || addr === '0.0.0.0';
      if (!isLocal) return false;
    }

    // Search query
    if (options.query && options.query.trim()) {
      const q = options.query.trim().toLowerCase();
      const matchPort = String(port.port).includes(q);
      const matchProc = port.processName ? port.processName.toLowerCase().includes(q) : false;
      const matchPid = port.pid !== null && String(port.pid).includes(q);
      const matchAddr = port.localAddress.toLowerCase().includes(q);
      const matchProject = port.project 
        ? (port.project.name.toLowerCase().includes(q) || (port.project.framework ? port.project.framework.toLowerCase().includes(q) : false))
        : false;

      if (!matchPort && !matchProc && !matchPid && !matchAddr && !matchProject) {
        return false;
      }
    }

    return true;
  });
}

export function sortPorts(ports: PortInfo[], field: PortSortField = 'port', ascending: boolean = true): PortInfo[] {
  return [...ports].sort((a, b) => {
    let valA = a[field];
    let valB = b[field];

    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;

    let comp = 0;
    if (typeof valA === 'number' && typeof valB === 'number') {
      comp = valA - valB;
    } else {
      comp = String(valA).localeCompare(String(valB));
    }

    return ascending ? comp : -comp;
  });
}
