import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BasePlatformProvider, execAsync } from './base';
import { PortInfo, ProcessInfo, DiagnosticReport, SocketState } from '../types';

export class LinuxPortProvider extends BasePlatformProvider {
  readonly platformName = 'linux';

  async listPorts(): Promise<PortInfo[]> {
    const ports: PortInfo[] = [];

    // Try 'ss -tulpn -H' first (fast modern Linux tool)
    try {
      const { stdout } = await execAsync('ss -tulpn -H');
      const lines = stdout.split(/\r?\n/);

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length < 5) continue;

        const protoRaw = parts[0].toLowerCase();
        const protocol = protoRaw.includes('tcp') ? 'tcp' : (protoRaw.includes('udp') ? 'udp' : null);
        if (!protocol) continue;

        const stateRaw = parts[1].toUpperCase() as SocketState;
        const localAddrCol = parts[4]; // e.g. 0.0.0.0:8080 or [::]:3000 or *:5353
        const { address, port } = this.parseAddressPort(localAddrCol);
        if (port <= 0) continue;

        // Process info is in the 6th/7th column: users:(("node",pid=18342,fd=19))
        let pid: number | null = null;
        let processName: string | null = null;

        const usersCol = parts.slice(5).join(' ');
        const pidMatch = usersCol.match(/pid=(\d+)/);
        if (pidMatch) {
          pid = parseInt(pidMatch[1], 10);
        }
        const nameMatch = usersCol.match(/"([^"]+)"/);
        if (nameMatch) {
          processName = nameMatch[1];
        }

        const existing = ports.find(p => p.port === port && p.protocol === protocol);
        if (!existing) {
          ports.push({
            port,
            protocol,
            pid,
            processName,
            localAddress: address,
            state: stateRaw === 'LISTEN' ? 'LISTENING' : (stateRaw || 'LISTENING'),
          });
        }
      }

      ports.sort((a, b) => a.port - b.port);
      return ports;
    } catch {
      // Fallback: parse /proc/net/tcp and /proc/net/udp
      return this.parseProcNet();
    }
  }

  private parseAddressPort(addrStr: string): { address: string; port: number } {
    const lastColon = addrStr.lastIndexOf(':');
    if (lastColon === -1) return { address: addrStr, port: 0 };
    const address = addrStr.substring(0, lastColon).replace(/^\[|\]$/g, '');
    const portStr = addrStr.substring(lastColon + 1);
    const port = parseInt(portStr, 10);
    return { address: address === '*' ? '0.0.0.0' : address, port: isNaN(port) ? 0 : port };
  }

  private async parseProcNet(): Promise<PortInfo[]> {
    const ports: PortInfo[] = [];
    const files = [
      { path: '/proc/net/tcp', proto: 'tcp' as const },
      { path: '/proc/net/udp', proto: 'udp' as const }
    ];

    for (const { path: filePath, proto } of files) {
      if (!fs.existsSync(filePath)) continue;
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').slice(1);

        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length < 4) continue;
          const localHex = parts[1]; // hex IP:PORT (e.g. 0100007F:0BB8)
          const stateHex = parts[3]; // 0A is TCP_LISTEN

          if (proto === 'tcp' && stateHex !== '0A') continue;

          const [ipHex, portHex] = localHex.split(':');
          const port = parseInt(portHex, 16);
          if (isNaN(port) || port <= 0) continue;

          // Convert hex IP to dot-decimal
          let address = '0.0.0.0';
          if (ipHex.length === 8) {
            const b1 = parseInt(ipHex.substring(6, 8), 16);
            const b2 = parseInt(ipHex.substring(4, 6), 16);
            const b3 = parseInt(ipHex.substring(2, 4), 16);
            const b4 = parseInt(ipHex.substring(0, 2), 16);
            address = `${b1}.${b2}.${b3}.${b4}`;
          }

          ports.push({
            port,
            protocol: proto,
            pid: null,
            processName: null,
            localAddress: address,
            state: 'LISTENING'
          });
        }
      } catch {
        // Ignore
      }
    }

    return ports;
  }

  async inspect(pid: number): Promise<ProcessInfo | null> {
    if (pid <= 0) return null;
    const procDir = `/proc/${pid}`;
    if (!fs.existsSync(procDir)) return null;

    try {
      let name = 'unknown';
      let parentPid: number | null = null;
      let commandLine: string | null = null;
      let workingDirectory: string | null = null;
      let executablePath: string | null = null;

      let memoryBytes: number | null = null;

      // Read status
      try {
        const status = fs.readFileSync(path.join(procDir, 'status'), 'utf8');
        const nameMatch = status.match(/Name:\s+(.+)/);
        if (nameMatch) name = nameMatch[1].trim();
        const ppidMatch = status.match(/PPid:\s+(\d+)/);
        if (ppidMatch) parentPid = parseInt(ppidMatch[1], 10);
        const rssMatch = status.match(/VmRSS:\s+(\d+)\s+kB/);
        if (rssMatch) memoryBytes = parseInt(rssMatch[1], 10) * 1024;
      } catch {}

      // Read cmdline
      try {
        const rawCmd = fs.readFileSync(path.join(procDir, 'cmdline'));
        commandLine = rawCmd.toString().replace(/\0/g, ' ').trim();
      } catch {}

      // Read cwd symlink
      try {
        workingDirectory = fs.readlinkSync(path.join(procDir, 'cwd'));
      } catch {}

      // Read exe symlink
      try {
        executablePath = fs.readlinkSync(path.join(procDir, 'exe'));
      } catch {}

      return {
        pid,
        name,
        commandLine,
        workingDirectory,
        executablePath,
        parentPid,
        memoryBytes,
      };
    } catch {
      return null;
    }
  }

  async listProcesses(): Promise<ProcessInfo[]> {
    const list: ProcessInfo[] = [];
    try {
      const entries = fs.readdirSync('/proc');
      for (const entry of entries) {
        if (!/^\d+$/.test(entry)) continue;
        const pid = parseInt(entry, 10);
        try {
          const status = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
          const nameMatch = status.match(/Name:\s+(.+)/);
          const ppidMatch = status.match(/PPid:\s+(\d+)/);
          list.push({
            pid,
            name: nameMatch ? nameMatch[1].trim() : 'unknown',
            parentPid: ppidMatch ? parseInt(ppidMatch[1], 10) : null
          });
        } catch {}
      }
    } catch {}
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
      message: isElevated ? 'Running with root privileges' : 'Running as standard user. Some socket PIDs require root or CAP_NET_ADMIN.'
    });

    try {
      await execAsync('ss --version');
      checks.push({
        name: 'ss Utility',
        status: 'PASS',
        message: 'ss (iproute2) socket statistics utility available'
      });
    } catch {
      checks.push({
        name: 'ss Utility',
        status: 'WARN',
        message: 'ss utility not found. Falling back to /proc/net'
      });
    }

    const procNetExists = fs.existsSync('/proc/net/tcp');
    checks.push({
      name: 'procfs Socket Tables',
      status: procNetExists ? 'PASS' : 'FAIL',
      message: procNetExists ? '/proc/net/tcp accessible' : '/proc/net/tcp inaccessible'
    });

    return {
      version: '0.1.0',
      os: `Linux ${os.release()}`,
      platform: 'linux',
      arch: os.arch(),
      providerName: 'LinuxPortProvider (ss + /proc)',
      isElevated,
      checks,
      timestamp: new Date().toISOString()
    };
  }
}
