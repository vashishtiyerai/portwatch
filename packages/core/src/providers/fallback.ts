import * as os from 'os';
import { BasePlatformProvider, execAsync } from './base';
import { PortInfo, ProcessInfo, DiagnosticReport } from '../types';

export class FallbackPortProvider extends BasePlatformProvider {
  readonly platformName = 'fallback';

  async listPorts(): Promise<PortInfo[]> {
    const ports: PortInfo[] = [];
    try {
      // Portable netstat -an
      const { stdout } = await execAsync('netstat -an');
      const lines = stdout.split(/\r?\n/);

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(/\s+/);
        if (parts.length < 4) continue;

        const protoRaw = parts[0].toLowerCase();
        if (protoRaw.includes('tcp') || protoRaw.includes('udp')) {
          let localCol = '';
          for (let i = 1; i < parts.length; i++) {
            const col = parts[i];
            const colonIdx = col.lastIndexOf(':') !== -1 ? col.lastIndexOf(':') : col.lastIndexOf('.');
            if (colonIdx !== -1) {
              const possiblePort = parseInt(col.substring(colonIdx + 1), 10);
              if (!isNaN(possiblePort) && possiblePort > 0) {
                localCol = col;
                break;
              }
            }
          }
          if (!localCol) continue;

          const lastColon = localCol.lastIndexOf(':') !== -1 ? localCol.lastIndexOf(':') : localCol.lastIndexOf('.');
          if (lastColon !== -1) {
            const port = parseInt(localCol.substring(lastColon + 1), 10);
            if (!isNaN(port) && port > 0) {
              const proto = protoRaw.includes('tcp') ? 'tcp' : 'udp';
              const addr = localCol.substring(0, lastColon) || '0.0.0.0';
              if (!ports.some(p => p.port === port && p.protocol === proto && p.localAddress === addr)) {
                ports.push({
                  port,
                  protocol: proto,
                  pid: null,
                  processName: null,
                  localAddress: addr,
                  state: 'LISTENING',
                });
              }
            }
          }
        }
      }
    } catch {
      // Ignore
    }
    return ports;
  }

  async inspect(pid: number): Promise<ProcessInfo | null> {
    return {
      pid,
      name: 'process',
      commandLine: null,
      workingDirectory: null
    };
  }

  async killProcess(pid: number, force?: boolean): Promise<boolean> {
    try {
      process.kill(pid, force ? 'SIGKILL' : 'SIGTERM');
      return true;
    } catch {
      return false;
    }
  }

  async getDiagnostics(): Promise<DiagnosticReport> {
    return {
      version: '0.1.0',
      os: `${os.type()} ${os.release()}`,
      platform: process.platform,
      arch: os.arch(),
      providerName: 'FallbackPortProvider (portable netstat)',
      isElevated: false,
      checks: [
        {
          name: 'Fallback Mode',
          status: 'WARN',
          message: 'Operating in portable fallback mode'
        }
      ],
      timestamp: new Date().toISOString()
    };
  }
}
