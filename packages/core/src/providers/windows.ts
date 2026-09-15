import * as os from 'os';
import { BasePlatformProvider, execAsync } from './base';
import { PortInfo, ProcessInfo, Protocol, SocketState, DiagnosticReport } from '../types';
import { identifyProject } from '../project';

export class WindowsPortProvider extends BasePlatformProvider {
  readonly platformName = 'windows';

  async listPorts(): Promise<PortInfo[]> {
    const ports: PortInfo[] = [];
    const processMap = await this.getProcessMap();

    // Query TCP and UDP sockets using netstat -ano
    try {
      const { stdout } = await execAsync('netstat -ano');
      const lines = stdout.split(/\r?\n/);

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const parts = trimmed.split(/\s+/);
        const protoRaw = parts[0]?.toLowerCase();

        if (protoRaw === 'tcp') {
          // Format: TCP  LocalAddress  ForeignAddress  State  PID
          if (parts.length < 5) continue;
          const localAddr = parts[1];
          const stateRaw = parts[3]?.toUpperCase() as SocketState;
          const pidStr = parts[4];
          const pid = parseInt(pidStr, 10);

          const { address, port } = this.parseAddressPort(localAddr);
          if (port > 0) {
            const procName = (!isNaN(pid) && processMap.get(pid)) || (pid === 0 ? 'System Idle Process' : (pid === 4 ? 'System' : null));
            const portInfo: PortInfo = {
              port,
              protocol: 'tcp',
              pid: isNaN(pid) ? null : pid,
              processName: procName,
              localAddress: address,
              state: stateRaw || 'UNKNOWN',
            };

            // Deduplicate if same port/proto/addr/state already added
            const existing = ports.find(p => p.port === port && p.protocol === 'tcp' && p.localAddress === address && p.state === stateRaw);
            if (!existing) {
              ports.push(portInfo);
            }
          }
        } else if (protoRaw === 'udp') {
          // Format: UDP  LocalAddress  ForeignAddress  PID
          if (parts.length < 4) continue;
          const localAddr = parts[1];
          const pidStr = parts[parts.length - 1];
          const pid = parseInt(pidStr, 10);

          const { address, port } = this.parseAddressPort(localAddr);
          if (port > 0) {
            const procName = (!isNaN(pid) && processMap.get(pid)) || null;
            const portInfo: PortInfo = {
              port,
              protocol: 'udp',
              pid: isNaN(pid) ? null : pid,
              processName: procName,
              localAddress: address,
              state: 'LISTENING',
            };

            const existing = ports.find(p => p.port === port && p.protocol === 'udp' && p.localAddress === address);
            if (!existing) {
              ports.push(portInfo);
            }
          }
        }
      }
    } catch (err) {
      // Return empty if netstat fails
    }

    // Sort by port ascending
    ports.sort((a, b) => a.port - b.port);

    return ports;
  }

  private parseAddressPort(addrStr: string): { address: string; port: number } {
    const lastColon = addrStr.lastIndexOf(':');
    if (lastColon === -1) {
      return { address: addrStr, port: 0 };
    }
    const address = addrStr.substring(0, lastColon);
    const portStr = addrStr.substring(lastColon + 1);
    const port = parseInt(portStr, 10);
    return { address: address || '0.0.0.0', port: isNaN(port) ? 0 : port };
  }

  private async getProcessMap(): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    try {
      const { stdout } = await execAsync('tasklist /fo csv /nh');
      const lines = stdout.split(/\r?\n/);
      for (const line of lines) {
        if (!line.trim()) continue;
        const match = line.match(/^"([^"]+)","(\d+)"/);
        if (match) {
          const name = match[1];
          const pid = parseInt(match[2], 10);
          if (!isNaN(pid)) {
            map.set(pid, name);
          }
        }
      }
    } catch {
      // Ignore
    }
    return map;
  }

  async inspect(pid: number): Promise<ProcessInfo | null> {
    if (pid <= 0) return null;

    try {
      // Use PowerShell to get detailed process telemetry
      const script = `Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" | Select-Object ProcessId,ParentProcessId,Name,ExecutablePath,CommandLine,CreationDate,WorkingSetSize | ConvertTo-Json -Compress`;
      const { stdout } = await execAsync(`powershell -NoProfile -NonInteractive -Command "${script}"`);
      
      if (!stdout.trim()) return null;
      const data = JSON.parse(stdout.trim());

      let startedAt: string | null = null;
      if (data.CreationDate) {
        try {
          // Format CIM date or parse standard
          const d = new Date(data.CreationDate);
          startedAt = !isNaN(d.getTime()) ? d.toISOString() : null;
        } catch {
          // Ignore
        }
      }

      const info: ProcessInfo = {
        pid: data.ProcessId,
        name: data.Name,
        executablePath: data.ExecutablePath || null,
        commandLine: data.CommandLine || null,
        workingDirectory: null,
        parentPid: data.ParentProcessId || null,
        startedAt,
        memoryBytes: data.WorkingSetSize ? Number(data.WorkingSetSize) : null,
      };

      // Try to determine working directory if possible from commandLine or executablePath
      if (info.executablePath) {
        try {
          const pathModule = require('path');
          info.workingDirectory = pathModule.dirname(info.executablePath);
        } catch {
          // Ignore
        }
      }

      return info;
    } catch {
      // Fallback to tasklist if PowerShell CIM fails
      const map = await this.getProcessMap();
      const name = map.get(pid);
      if (name) {
        return {
          pid,
          name,
          commandLine: null,
          executablePath: null,
          workingDirectory: null,
          parentPid: null
        };
      }
      return null;
    }
  }

  async listProcesses(): Promise<ProcessInfo[]> {
    const list: ProcessInfo[] = [];
    try {
      const script = `Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Compress`;
      const { stdout } = await execAsync(`powershell -NoProfile -NonInteractive -Command "${script}"`);
      if (stdout.trim()) {
        const items = JSON.parse(stdout.trim());
        const arr = Array.isArray(items) ? items : [items];
        for (const item of arr) {
          if (item && item.ProcessId) {
            list.push({
              pid: item.ProcessId,
              name: item.Name || 'unknown',
              parentPid: item.ParentProcessId || null,
              commandLine: item.CommandLine || null
            });
          }
        }
      }
    } catch {
      // Fallback
      const map = await this.getProcessMap();
      for (const [pid, name] of map.entries()) {
        list.push({ pid, name });
      }
    }
    return list;
  }

  async killProcess(pid: number, force: boolean = false): Promise<boolean> {
    if (pid <= 0) return false;
    try {
      const cmd = force ? `taskkill /F /T /PID ${pid}` : `taskkill /PID ${pid}`;
      await execAsync(cmd);
      return true;
    } catch {
      return false;
    }
  }

  async getDiagnostics(): Promise<DiagnosticReport> {
    const checks: DiagnosticReport['checks'] = [];
    let isElevated = false;

    // Check elevation
    try {
      await execAsync('net session');
      isElevated = true;
      checks.push({
        name: 'Permissions',
        status: 'PASS',
        message: 'Running with elevated Administrator permissions'
      });
    } catch {
      isElevated = false;
      checks.push({
        name: 'Permissions',
        status: 'WARN',
        message: 'Standard user privileges. Some system-owned sockets may not reveal PIDs.'
      });
    }

    // Check netstat port enumeration
    try {
      const { stdout } = await execAsync('netstat -ano');
      const lines = stdout.split(/\r?\n/).filter(l => l.includes('TCP') || l.includes('UDP'));
      checks.push({
        name: 'Port Enumeration',
        status: 'PASS',
        message: `Discovered ${lines.length} socket entries via netstat`,
        details: 'native netstat -ano'
      });
    } catch (err: any) {
      checks.push({
        name: 'Port Enumeration',
        status: 'FAIL',
        message: `Failed to enumerate sockets: ${err.message}`
      });
    }

    // Check process enumeration
    try {
      const map = await this.getProcessMap();
      checks.push({
        name: 'Process Discovery',
        status: 'PASS',
        message: `Identified ${map.size} running processes via tasklist`,
        details: 'tasklist'
      });
    } catch (err: any) {
      checks.push({
        name: 'Process Discovery',
        status: 'FAIL',
        message: `Failed to query process table: ${err.message}`
      });
    }

    return {
      version: '0.1.0',
      os: `${os.type()} ${os.release()}`,
      platform: 'win32',
      arch: os.arch(),
      providerName: 'WindowsPortProvider (netstat + tasklist + CIM)',
      isElevated,
      checks,
      timestamp: new Date().toISOString()
    };
  }
}
