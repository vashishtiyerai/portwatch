import * as os from 'os';
import { BasePlatformProvider, execAsync } from './base';
import { PortInfo, ProcessInfo, DiagnosticReport, SocketState } from '../types';

export class MacOSPortProvider extends BasePlatformProvider {
  readonly platformName = 'macos';

  async listPorts(): Promise<PortInfo[]> {
    const ports: PortInfo[] = [];

    // Query TCP listening sockets using lsof
    try {
      const { stdout } = await execAsync('lsof -iTCP -sTCP:LISTEN -n -P');
      const lines = stdout.split(/\r?\n/).slice(1); // skip header: COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length < 9) continue;

        const processName = parts[0];
        const pid = parseInt(parts[1], 10);
        const nameCol = parts[8]; // e.g. *:3000 or 127.0.0.1:5173 or [::1]:8080

        const { address, port } = this.parseLsofAddress(nameCol);
        if (port > 0) {
          const existing = ports.find(p => p.port === port && p.protocol === 'tcp');
          if (!existing) {
            ports.push({
              port,
              protocol: 'tcp',
              pid: isNaN(pid) ? null : pid,
              processName,
              localAddress: address,
              state: 'LISTENING',
            });
          }
        }
      }
    } catch {
      // lsof returns exit code 1 if no matching files found, which is normal
    }

    // Query UDP sockets using lsof
    try {
      const { stdout } = await execAsync('lsof -iUDP -n -P');
      const lines = stdout.split(/\r?\n/).slice(1);

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length < 9) continue;

        const processName = parts[0];
        const pid = parseInt(parts[1], 10);
        const nameCol = parts[8];

        const { address, port } = this.parseLsofAddress(nameCol);
        if (port > 0) {
          const existing = ports.find(p => p.port === port && p.protocol === 'udp');
          if (!existing) {
            ports.push({
              port,
              protocol: 'udp',
              pid: isNaN(pid) ? null : pid,
              processName,
              localAddress: address,
              state: 'LISTENING',
            });
          }
        }
      }
    } catch {
      // Ignore
    }

    ports.sort((a, b) => a.port - b.port);
    return ports;
  }

  private parseLsofAddress(addrStr: string): { address: string; port: number } {
    const lastColon = addrStr.lastIndexOf(':');
    if (lastColon === -1) return { address: addrStr, port: 0 };
    const address = addrStr.substring(0, lastColon);
    const portStr = addrStr.substring(lastColon + 1);
    const port = parseInt(portStr, 10);
    return { address: address === '*' ? '0.0.0.0' : address, port: isNaN(port) ? 0 : port };
  }

  async inspect(pid: number): Promise<ProcessInfo | null> {
    if (pid <= 0) return null;

    try {
      const { stdout } = await execAsync(`ps -p ${pid} -o pid=,ppid=,%cpu=,%mem=,rss=,comm=,command=`);
      const trimmed = stdout.trim();
      if (!trimmed) return null;

      const parts = trimmed.split(/\s+/);
      const parentPid = parseInt(parts[1], 10);
      const cpu = parseFloat(parts[2]);
      const rss = parseInt(parts[4], 10);
      const name = parts[5];
      const commandLine = parts.slice(6).join(' ');

      // Query working directory via lsof
      let cwd: string | null = null;
      try {
        const { stdout: cwdOut } = await execAsync(`lsof -p ${pid} -a -d cwd -Fn`);
        const cwdLine = cwdOut.split(/\r?\n/).find(l => l.startsWith('n'));
        if (cwdLine) {
          cwd = cwdLine.substring(1);
        }
      } catch {
        // Ignore
      }

      return {
        pid,
        name,
        commandLine,
        workingDirectory: cwd,
        parentPid: isNaN(parentPid) ? null : parentPid,
        cpuPercent: isNaN(cpu) ? null : cpu,
        memoryBytes: isNaN(rss) ? null : rss * 1024,
      };
    } catch {
      return null;
    }
  }

  async listProcesses(): Promise<ProcessInfo[]> {
    const list: ProcessInfo[] = [];
    try {
      const { stdout } = await execAsync('ps -eo pid=,ppid=,comm=');
      const lines = stdout.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 3) {
          const pid = parseInt(parts[0], 10);
          const parentPid = parseInt(parts[1], 10);
          const name = parts.slice(2).join(' ');
          if (!isNaN(pid)) {
            list.push({
              pid,
              name,
              parentPid: isNaN(parentPid) ? null : parentPid
            });
          }
        }
      }
    } catch {
      // Ignore
    }
    return list;
  }

  async killProcess(pid: number, force: boolean = false): Promise<boolean> {
    if (pid <= 0) return false;
    try {
      const signal = force ? '-9' : '-15';
      await execAsync(`kill ${signal} ${pid}`);
      return true;
    } catch {
      return false;
    }
  }

  async getDiagnostics(): Promise<DiagnosticReport> {
    const checks: DiagnosticReport['checks'] = [];
    const isElevated = process.getuid ? process.getuid() === 0 : false;

    checks.push({
      name: 'Permissions',
      status: isElevated ? 'PASS' : 'WARN',
      message: isElevated ? 'Running as root (full visibility)' : 'Standard user. Run with sudo if certain processes hide PIDs.'
    });

    try {
      await execAsync('lsof -v');
      checks.push({
        name: 'lsof Utility',
        status: 'PASS',
        message: 'lsof utility available for socket enumeration'
      });
    } catch {
      checks.push({
        name: 'lsof Utility',
        status: 'FAIL',
        message: 'lsof not found in system PATH'
      });
    }

    try {
      await execAsync('ps -p 1 -o pid=');
      checks.push({
        name: 'ps Utility',
        status: 'PASS',
        message: 'ps utility available for process inspection'
      });
    } catch {
      checks.push({
        name: 'ps Utility',
        status: 'FAIL',
        message: 'ps execution failed'
      });
    }

    return {
      version: '0.1.0',
      os: `macOS ${os.release()}`,
      platform: 'darwin',
      arch: os.arch(),
      providerName: 'MacOSPortProvider (lsof + ps)',
      isElevated,
      checks,
      timestamp: new Date().toISOString()
    };
  }
}
